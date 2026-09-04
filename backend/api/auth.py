import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.database import get_db
from backend.database.models import User, AuditLog
from backend.services.security_service import security_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def hash_password(password: str) -> str:
    """Generates a secure salted PBKDF2-SHA256 password hash."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salted PBKDF2 hash or bcrypt fallback."""
    if not hashed_password:
        return False
    if "$" in hashed_password:
        salt, key = hashed_password.split("$", 1)
        new_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return secrets.compare_digest(new_key.hex(), key)
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", response_model=Token)
def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    client_ip = req.client.host if req.client else "127.0.0.1"
    
    # 1. Zero-Trust Rate Limiting Check
    is_locked, remaining = security_service.is_rate_limited(client_ip, request.username)
    if is_locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to repeated failed login attempts. Retry in {remaining} seconds.",
            headers={"Retry-After": str(remaining)}
        )

    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        # Record failed attempt and trigger potential brute-force containment
        security_service.record_login_attempt(client_ip, request.username, success=False, db=db)
        
        audit_fail = AuditLog(
            username=request.username,
            action="USER_LOGIN_FAILED",
            details=f"Failed authentication attempt for user '{request.username}' from IP {client_ip}."
        )
        db.add(audit_fail)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Successful login: clear failure tracking
    security_service.record_login_attempt(client_ip, request.username, success=True, db=db)

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "id": user.id}
    )

    # Record Audit Log
    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        action="USER_LOGIN",
        details=f"User {user.username} ({user.role}) logged in to operations terminal from {client_ip}."
    )
    db.add(audit)
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role
        }
    }

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role
    }
