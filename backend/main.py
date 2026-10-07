import os
import cv2
import torch
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import settings
from backend.database.database import engine, Base
from backend.database.models import User, Camera
from backend.scripts.seed_db import seed
from backend.services.alert_service import alert_broadcaster
from backend.services.video_processor import camera_manager

# Import API Routers
from backend.api.auth import router as auth_router
from backend.api.cameras import router as cameras_router
from backend.api.events import router as events_router
from backend.api.evidence import router as evidence_router
from backend.api.decision import router as decision_router
from backend.api.edge import router as edge_router
from backend.api.explainability import router as explainability_router
from backend.api.federation import router as federation_router
from backend.api.missions import router as missions_router
from backend.api.multicamera import router as multicamera_router
from backend.api.privacy import router as privacy_router
from backend.api.security import router as security_router
from backend.api.simulation import router as simulation_router
from backend.api.system import router as system_router

# Performance engineering: Set thread limits to prevent CPU oversubscription and context switching
try:
    cpu_count = os.cpu_count() or 4
    torch_threads = min(4, max(1, cpu_count // 2))
    torch.set_num_threads(torch_threads)
    cv2.setNumThreads(1)
except Exception:
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    Base.metadata.create_all(bind=engine)
    seed()

    # Start video processors for seeded cameras
    camera_manager.start_all()

    yield

    # Shutdown:
    camera_manager.stop_all()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(cameras_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(evidence_router, prefix=settings.API_V1_STR)
app.include_router(decision_router, prefix=settings.API_V1_STR)
app.include_router(edge_router, prefix=settings.API_V1_STR)
app.include_router(explainability_router, prefix=settings.API_V1_STR)
app.include_router(federation_router, prefix=settings.API_V1_STR)
app.include_router(missions_router, prefix=settings.API_V1_STR)
app.include_router(multicamera_router, prefix=settings.API_V1_STR)
app.include_router(privacy_router, prefix=settings.API_V1_STR)
app.include_router(security_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)
app.include_router(system_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "platform": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

@app.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await alert_broadcaster.connect(websocket)
    try:
        while True:
            # Keepalive receiver
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await alert_broadcaster.disconnect(websocket)
    except Exception:
        await alert_broadcaster.disconnect(websocket)
