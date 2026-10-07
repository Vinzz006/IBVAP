import queue
import threading
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import numpy as np

from backend.database.database import SessionLocal
from backend.database.models import Event, Vehicle, AuditLog
from backend.services.evidence_service import EvidenceService
from backend.services.alert_service import alert_broadcaster

logger = logging.getLogger("BackgroundEventWriter")

class EventWriteTask:
    __slots__ = ("event_id", "camera_id", "camera_location", "obj_data", "event_type", "risk_meta", "plate_info", "frame")
    def __init__(
        self,
        event_id: str,
        camera_id: str,
        camera_location: str,
        obj_data: Dict[str, Any],
        event_type: str,
        risk_meta: Dict[str, Any],
        plate_info: Optional[Dict[str, Any]],
        frame: Optional[np.ndarray]
    ):
        self.event_id = event_id
        self.camera_id = camera_id
        self.camera_location = camera_location
        self.obj_data = obj_data
        self.event_type = event_type
        self.risk_meta = risk_meta
        self.plate_info = plate_info
        self.frame = frame

class BackgroundEventWriter:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(BackgroundEventWriter, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.queue: queue.Queue[EventWriteTask] = queue.Queue(maxsize=500)
        self.running = True
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True, name="DBEvidenceWriter")
        self.worker_thread.start()
        logger.info("Background DB & Evidence Writer worker thread started.")

    def submit_event(
        self,
        event_id: str,
        camera_id: str,
        camera_location: str,
        obj_data: Dict[str, Any],
        event_type: str,
        risk_meta: Dict[str, Any],
        plate_info: Optional[Dict[str, Any]],
        frame: Optional[np.ndarray]
    ):
        task = EventWriteTask(
            event_id=event_id,
            camera_id=camera_id,
            camera_location=camera_location,
            obj_data=obj_data,
            event_type=event_type,
            risk_meta=risk_meta,
            plate_info=plate_info,
            frame=frame.copy() if frame is not None else None
        )
        try:
            self.queue.put_nowait(task)
        except queue.Full:
            logger.warning(f"Event writer queue full, dropping event {event_id}")

    def _worker_loop(self):
        while self.running:
            try:
                task = self.queue.get(timeout=0.1)
            except queue.Empty:
                continue

            try:
                # 1. Save cryptographic keyframe evidence
                snap = EvidenceService.save_keyframe(
                    frame=task.frame,
                    event_id=task.event_id,
                    camera_id=task.camera_id,
                    camera_location=task.camera_location,
                    event_type=task.event_type,
                    track_label=task.obj_data.get("label", f"{task.obj_data.get('class_name', 'target').upper()} #{task.obj_data.get('track_id', 0)}"),
                    risk_score=task.risk_meta["risk_score"],
                    risk_level=task.risk_meta["risk_level"]
                )

                # 2. Write to SQLite
                db = SessionLocal()
                try:
                    new_event = Event(
                        id=task.event_id,
                        camera_id=task.camera_id,
                        tracking_id=task.obj_data.get("track_id"),
                        object_type=task.obj_data.get("class_name", "person"),
                        event_type=task.event_type,
                        risk_score=task.risk_meta["risk_score"],
                        risk_level=task.risk_meta["risk_level"],
                        status="NEW",
                        confidence=task.obj_data.get("confidence", 0.85),
                        bbox=task.obj_data.get("bbox", []),
                        centroid=task.obj_data.get("centroid", []),
                        dwell_time=round(task.obj_data.get("dwell_time", 0.0), 1),
                        timestamp=datetime.now(timezone.utc),
                        evidence_path=snap["evidence_path"],
                        evidence_hash=snap["evidence_hash"],
                        operator_notes=f"Automated risk detection: {task.risk_meta.get('label', '')}"
                    )
                    db.add(new_event)

                    if task.plate_info:
                        v = Vehicle(
                            event_id=task.event_id,
                            plate_number=task.plate_info.get("plate_number", "UNKNOWN"),
                            plate_confidence=task.plate_info.get("confidence", 0.0),
                            plate_bbox=task.plate_info.get("plate_bbox", []),
                            vehicle_type=task.obj_data.get("class_name", "car")
                        )
                        db.add(v)

                    db.commit()

                    # 3. Schedule async WebSocket alert broadcast
                    alert_payload = {
                        "id": task.event_id,
                        "camera_id": task.camera_id,
                        "location": task.camera_location,
                        "tracking_id": task.obj_data.get("track_id"),
                        "object_type": task.obj_data.get("class_name", "person"),
                        "event_type": task.event_type,
                        "risk_score": task.risk_meta["risk_score"],
                        "risk_level": task.risk_meta["risk_level"],
                        "timestamp": snap["timestamp"],
                        "evidence_path": snap["evidence_path"],
                        "evidence_hash": snap["evidence_hash"],
                        "plate_number": task.plate_info.get("plate_number") if task.plate_info else None
                    }
                    try:
                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            asyncio.run_coroutine_threadsafe(
                                alert_broadcaster.broadcast_alert(alert_payload),
                                loop
                            )
                    except Exception:
                        pass

                except Exception as db_err:
                    logger.error(f"Error persisting background event {task.event_id}: {db_err}")
                    db.rollback()
                finally:
                    db.close()

            except Exception as e:
                logger.error(f"Error in background event writer task: {e}", exc_info=True)

event_writer = BackgroundEventWriter()
