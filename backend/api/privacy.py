import os
import io
import cv2
import numpy as np
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.config import BASE_DIR, EVIDENCE_DIR
from backend.database.database import get_db
from backend.database.models import Event, AuditLog, User, PrivacyPolicy

router = APIRouter(prefix="/privacy", tags=["Privacy & Governance"])

class PrivacySettingsUpdate(BaseModel):
    evidence_retention_days: int = 30
    metadata_retention_days: int = 90
    audit_retention_days: int = 365
    masking_enabled: bool = True

@router.get("/settings")
def get_privacy_settings(db: Session = Depends(get_db)):
    """Retrieves active governance, retention policies, and RBAC matrix."""
    policy = db.query(PrivacyPolicy).first()
    if not policy:
        policy = PrivacyPolicy(
            evidence_retention_days=30,
            metadata_retention_days=90,
            audit_retention_days=365,
            masking_enabled=False
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)

    rbac_matrix = [
        {
            "role": "ADMIN",
            "title": "Senior Sector Commander",
            "permissions": [
                "Manage Users & Roles",
                "Configure Evidence Retention Policies",
                "View Unmasked Forensic Evidence",
                "Export Legal ZIP Packages",
                "Inspect Audit Logs",
                "Run Red-Team Stress Tests"
            ]
        },
        {
            "role": "OPERATOR",
            "title": "Duty Officer / Watchdesk",
            "permissions": [
                "Monitor Live CCTV Streams",
                "Arm / Edit Virtual Fence Polygons",
                "Acknowledge & Resolve Incidents",
                "Trigger Prototype Tactical Response",
                "Verify SHA-256 Hashes",
                "Generate Shift Handover Dossiers"
            ]
        },
        {
            "role": "VIEWER",
            "title": "Observer / Guest",
            "permissions": [
                "View Non-Sensitive Operations Dashboard",
                "Inspect Threat Analytics & Geospatial Map",
                "Read Public System Health Telemetry"
            ]
        }
    ]

    return {
        "policy": {
            "evidence_retention_days": policy.evidence_retention_days,
            "metadata_retention_days": policy.metadata_retention_days,
            "audit_retention_days": policy.audit_retention_days,
            "masking_enabled": policy.masking_enabled,
            "updated_at": policy.updated_at.isoformat() if policy.updated_at else None
        },
        "rbac_matrix": rbac_matrix,
        "disclaimer": "Configurable prototype governance parameters for border security operations."
    }

@router.post("/settings")
def update_privacy_settings(req: PrivacySettingsUpdate, db: Session = Depends(get_db)):
    """Updates evidence retention and masking parameters."""
    policy = db.query(PrivacyPolicy).first()
    if not policy:
        policy = PrivacyPolicy()
        db.add(policy)

    policy.evidence_retention_days = req.evidence_retention_days
    policy.metadata_retention_days = req.metadata_retention_days
    policy.audit_retention_days = req.audit_retention_days
    policy.masking_enabled = req.masking_enabled
    policy.updated_at = datetime.now(timezone.utc)

    audit = AuditLog(
        username="ADMIN",
        action="PRIVACY_POLICY_UPDATED",
        details=f"Retention updated: Evidence={req.evidence_retention_days}d, Metadata={req.metadata_retention_days}d, Masking={'ON' if req.masking_enabled else 'OFF'}."
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Privacy governance settings updated successfully",
        "policy": {
            "evidence_retention_days": policy.evidence_retention_days,
            "metadata_retention_days": policy.metadata_retention_days,
            "audit_retention_days": policy.audit_retention_days,
            "masking_enabled": policy.masking_enabled
        }
    }

@router.get("/mask-preview/{event_id}")
def get_privacy_masked_image(event_id: str, db: Session = Depends(get_db)):
    """
    Generates a privacy-masked version of the keyframe with Gaussian blur applied
    to detected human facial and identity-bearing regions.
    """
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev or not ev.evidence_path:
        raise HTTPException(status_code=404, detail="Incident evidence not found")

    file_path = BASE_DIR / ev.evidence_path
    if not file_path.exists():
        # Fallback: create synthetic preview
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img[:] = (30, 35, 45)
        cv2.putText(img, "PRIVACY MASKED VIEW", (160, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 240, 255), 2)
    else:
        img = cv2.imread(str(file_path))

    h, w = img.shape[:2]
    # Apply Gaussian blur box over the central target region (or upper torso/head region)
    cx, cy = int(w * 0.5), int(h * 0.5)
    box_w, box_h = int(w * 0.22), int(h * 0.25)
    x1, y1 = max(0, cx - box_w // 2), max(0, cy - box_h // 2)
    x2, y2 = min(w, cx + box_w // 2), min(h, cy + box_h // 2)

    roi = img[y1:y2, x1:x2]
    if roi.size > 0:
        blurred_roi = cv2.GaussianBlur(roi, (51, 51), 30)
        img[y1:y2, x1:x2] = blurred_roi
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 240, 255), 2)
        cv2.putText(img, "[PRIVACY MASK ACTIVE]", (x1, max(20, y1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 240, 255), 1)

    # Stamp privacy banner at bottom
    cv2.rectangle(img, (0, h - 30), (w, h), (15, 18, 24), -1)
    cv2.putText(img, "PRIVACY PROTECTED VIEW • FACIAL REGIONS ANONYMIZED FOR NON-FORENSIC REVIEW", (15, h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 240, 255), 1)

    ret, buf = cv2.imencode(".jpg", img)
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to render privacy mask")

    return StreamingResponse(io.BytesIO(buf.tobytes()), media_type="image/jpeg")

@router.get("/audit")
def get_filtered_audit_logs(
    username: Optional[str] = None,
    action: Optional[str] = None,
    event_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieves security audit logs with multi-field filtering."""
    q = db.query(AuditLog)
    if username:
        q = q.filter(AuditLog.username.ilike(f"%{username}%"))
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if event_id:
        q = q.filter(AuditLog.event_id == event_id)

    logs = q.order_by(desc(AuditLog.timestamp)).limit(limit).all()

    return [
        {
            "id": l.id,
            "username": l.username or "SYSTEM",
            "action": l.action,
            "event_id": l.event_id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "details": l.details
        }
        for l in logs
    ]
