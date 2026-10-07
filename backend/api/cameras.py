import os
import time
import shutil
import asyncio
from pathlib import Path
from typing import List, Optional, Dict, Any
import cv2
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.config import settings, TEST_VIDEOS_DIR
from backend.database.database import get_db
from backend.database.models import Camera, AuditLog
from backend.services.video_processor import camera_manager
from backend.api.auth import get_current_user

router = APIRouter(prefix="/cameras", tags=["Cameras"])

_webcam_cache: Dict[str, Any] = {"timestamp": 0.0, "data": None}

class ZoneUpdateRequest(BaseModel):
    polygon: List[List[float]]  # List of [x, y] coordinates

class SourceUpdateRequest(BaseModel):
    stream_url: str

class CameraCreateRequest(BaseModel):
    id: str
    name: str
    location: str
    stream_url: str
    restricted_zone: Optional[List[List[float]]] = None

@router.get("")
def list_cameras(db: Session = Depends(get_db)):
    cameras = db.query(Camera).all()
    result = []
    for cam in cameras:
        proc = camera_manager.get_camera(cam.id)
        telemetry = proc.latest_telemetry if proc else {
            "fps": 0.0, "latency_ms": 0.0, "active_tracks": 0, "lighting_mode": "DAY", "status": "OFFLINE"
        }
        result.append({
            "id": cam.id,
            "name": cam.name,
            "location": cam.location,
            "stream_url": cam.stream_url,
            "status": cam.status,
            "restricted_zone": cam.get_zone_polygon(),
            "telemetry": telemetry
        })
    return result

def _probe_webcams_sync() -> List[Dict[str, Any]]:
    available = []
    for idx in range(3):
        try:
            if os.name == 'nt':
                cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            else:
                cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                ret, _ = cap.read()
                cap.release()
                if ret:
                    available.append({
                        "index": idx,
                        "label": f"USB / Integrated Webcam (Device {idx})",
                        "status": "ONLINE"
                    })
                else:
                    available.append({
                        "index": idx,
                        "label": f"Webcam Device {idx} (Standby)",
                        "status": "STANDBY"
                    })
        except Exception:
            pass
    if not available:
        available.append({
            "index": 0,
            "label": "USB Webcam (Device 0)",
            "status": "READY"
        })
    return available

@router.get("/webcams/detect")
async def detect_webcams():
    """Non-blocking webcam device probe with 30s TTL cache."""
    now = time.monotonic()
    if (now - _webcam_cache["timestamp"]) < 30.0 and _webcam_cache["data"] is not None:
        return {"webcams": _webcam_cache["data"]}

    webcams = await asyncio.to_thread(_probe_webcams_sync)
    _webcam_cache["timestamp"] = now
    _webcam_cache["data"] = webcams
    return {"webcams": webcams}

@router.get("/{camera_id}")
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")
    
    proc = camera_manager.get_camera(camera_id)
    telemetry = proc.latest_telemetry if proc else {}

    return {
        "id": cam.id,
        "name": cam.name,
        "location": cam.location,
        "stream_url": cam.stream_url,
        "status": cam.status,
        "restricted_zone": cam.get_zone_polygon(),
        "telemetry": telemetry
    }

@router.post("")
def create_camera(req: CameraCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(Camera).filter(Camera.id == req.id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Camera {req.id} already exists")

    cam = Camera(
        id=req.id,
        name=req.name,
        location=req.location,
        stream_url=req.stream_url,
        status="ONLINE"
    )
    if req.restricted_zone:
        cam.set_zone_polygon(req.restricted_zone)
    else:
        cam.set_zone_polygon([[0.25, 0.40], [0.75, 0.40], [0.80, 0.85], [0.20, 0.85]])

    db.add(cam)
    db.commit()
    db.refresh(cam)

    # Start live processing
    camera_manager.add_camera(cam.id, cam.name, cam.location, cam.stream_url, cam.get_zone_polygon())

    return {"message": f"Camera {cam.id} registered and online", "camera": req.dict()}

@router.post("/{camera_id}/zone")
def update_restricted_zone(camera_id: str, req: ZoneUpdateRequest, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    cam.set_zone_polygon(req.polygon)
    db.commit()

    proc = camera_manager.get_camera(camera_id)
    if proc:
        proc.update_polygon(req.polygon)

    # Add audit log
    audit = AuditLog(
        username="OPERATOR",
        action="ZONE_CONFIG_UPDATED",
        details=f"Updated restricted zone polygon on {camera_id} with {len(req.polygon)} vertices."
    )
    db.add(audit)
    db.commit()

    return {"message": "Restricted zone updated successfully", "polygon": req.polygon}

@router.post("/{camera_id}/source")
def update_camera_source(camera_id: str, req: SourceUpdateRequest, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not found")

    cam.stream_url = req.stream_url
    db.commit()

    camera_manager.update_camera_source(camera_id, req.stream_url)
    return {"message": f"Camera {camera_id} stream source switched to {req.stream_url}"}

@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    safe_name = Path(file.filename).name
    filename = f"upload_{safe_name}"
    target_path = TEST_VIDEOS_DIR / filename
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "filename": filename,
        "path": str(target_path),
        "message": "Video uploaded successfully and ready for ingestion."
    }

async def async_mjpeg_frame_generator(camera_id: str):
    """Async generator delivering encoded MJPEG stream with zero thread blocking and 25 FPS client throttling."""
    last_frame_bytes = None
    min_frame_interval = 0.04  # max 25 FPS per streaming client

    try:
        while True:
            proc = camera_manager.get_camera(camera_id)
            if proc and proc.running:
                frame = proc.latest_frame_bytes
                if frame is not None and frame is not last_frame_bytes:
                    last_frame_bytes = frame
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            await asyncio.sleep(min_frame_interval)
    except (asyncio.CancelledError, GeneratorExit):
        pass

@router.get("/{camera_id}/stream")
def stream_camera(camera_id: str):
    """Provides high-performance, low-latency live MJPEG stream with AI overlays."""
    proc = camera_manager.get_camera(camera_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Camera {camera_id} not running")

    return StreamingResponse(
        async_mjpeg_frame_generator(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
