import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database.database import get_db
from backend.database.models import Event, Camera, AuditLog, SyncQueueItem
from backend.services.evidence_service import EvidenceService

router = APIRouter(prefix="/edge", tags=["Edge & Offline Intelligence"])

# In-memory Edge runtime simulation state
class EdgeRuntimeState:
    def __init__(self):
        self.is_network_online = True
        self.mode = "CENTRAL"  # CENTRAL, EDGE, OFFLINE, SYNCING
        self.local_storage_status = "HEALTHY"
        self.ai_engine_status = "RUNNING"
        self.node_id = "EDGE-NODE-SECTOR-A"

edge_state = EdgeRuntimeState()

class NetworkSimulationRequest(BaseModel):
    online: bool
    reason: Optional[str] = "Simulated remote frontier fiber cut"

class OfflineEventPayload(BaseModel):
    camera_id: str
    event_type: str
    tracking_id: int
    object_type: str = "person"
    risk_score: int = 85
    risk_level: str = "CRITICAL"
    notes: Optional[str] = "Offline buffer captured during network outage"

@router.get("/status")
def get_edge_status(db: Session = Depends(get_db)):
    """Retrieves operational status of Edge node, connectivity state, and pending sync queue."""
    pending_count = db.query(SyncQueueItem).filter(SyncQueueItem.status == "PENDING").count()
    synced_count = db.query(SyncQueueItem).filter(SyncQueueItem.status == "SYNCED").count()
    failed_count = db.query(SyncQueueItem).filter(SyncQueueItem.status == "FAILED").count()

    pending_items = db.query(SyncQueueItem).filter(SyncQueueItem.status == "PENDING").order_by(desc(SyncQueueItem.created_at)).limit(10).all()

    # Determine current system mode display
    if not edge_state.is_network_online:
        current_mode = "EDGE"
        mode_label = "EDGE OFFLINE"
    elif pending_count > 0:
        current_mode = "SYNCING"
        mode_label = "SYNCING QUEUE"
    else:
        current_mode = "CENTRAL"
        mode_label = "CENTRAL ONLINE"

    return {
        "node_id": edge_state.node_id,
        "mode": current_mode,
        "mode_label": mode_label,
        "is_network_online": edge_state.is_network_online,
        "ai_engine": edge_state.ai_engine_status,
        "local_storage": edge_state.local_storage_status,
        "storage_free_gb": "412.5 / 512.0 GB",
        "sync_queue": {
            "pending": pending_count,
            "synced": synced_count,
            "failed": failed_count,
            "items": [
                {
                    "id": item.id,
                    "event_id": item.event_id,
                    "camera_id": item.camera_id,
                    "status": item.status,
                    "retry_count": item.retry_count,
                    "created_at": item.created_at.isoformat() if item.created_at else None
                }
                for item in pending_items
            ]
        },
        "last_sync_timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.post("/simulate-network")
def simulate_network_toggle(req: NetworkSimulationRequest, db: Session = Depends(get_db)):
    """Simulates network loss or reconnection for edge evaluation and testing."""
    edge_state.is_network_online = req.online
    edge_state.mode = "CENTRAL" if req.online else "EDGE"

    action = "EDGE_NETWORK_RESTORED" if req.online else "EDGE_NETWORK_DISCONNECTED"
    details = f"Network status changed to {'ONLINE' if req.online else 'OFFLINE'}. Mode: {edge_state.mode}. Reason: {req.reason}"

    audit = AuditLog(
        username="EDGE_OPERATOR",
        action=action,
        details=details
    )
    db.add(audit)
    db.commit()

    return {
        "message": f"Network connectivity set to {'ONLINE' if req.online else 'OFFLINE'}",
        "is_network_online": edge_state.is_network_online,
        "mode": edge_state.mode,
        "action": action
    }

@router.post("/queue-offline-event")
def queue_offline_event(payload: OfflineEventPayload, db: Session = Depends(get_db)):
    """Stores an event in the local offline sync queue when operating in Edge Mode."""
    ev_id = f"EVT-EDGE-{uuid.uuid4().hex[:6].upper()}"

    event_dict = {
        "id": ev_id,
        "camera_id": payload.camera_id,
        "event_type": payload.event_type,
        "tracking_id": payload.tracking_id,
        "object_type": payload.object_type,
        "risk_score": payload.risk_score,
        "risk_level": payload.risk_level,
        "notes": f"[OFFLINE CAPTURE] {payload.notes}"
    }

    queue_item = SyncQueueItem(
        event_id=ev_id,
        camera_id=payload.camera_id,
        status="PENDING",
        payload_json=json.dumps(event_dict),
        created_at=datetime.now(timezone.utc)
    )
    db.add(queue_item)
    db.commit()

    return {
        "message": "Incident stored in local Edge queue",
        "event_id": ev_id,
        "status": "QUEUED_OFFLINE",
        "queue_id": queue_item.id
    }

@router.post("/sync")
def sync_edge_queue(db: Session = Depends(get_db)):
    """Synchronizes all pending offline events into the primary central ledger with idempotency."""
    if not edge_state.is_network_online:
        raise HTTPException(status_code=400, detail="Cannot synchronize while network is offline. Restore network first.")

    pending_items = db.query(SyncQueueItem).filter(SyncQueueItem.status == "PENDING").all()
    synced_events = []

    for item in pending_items:
        try:
            ev_data = json.loads(item.payload_json)
            # Idempotency check: ensure event doesn't already exist
            existing = db.query(Event).filter(Event.id == item.event_id).first()
            if not existing:
                last_event = db.query(Event).order_by(Event.timestamp.desc()).first()
                prev_h = last_event.evidence_hash if last_event else "GENESIS_HASH_00000000000000000000000000000000"
                snap = EvidenceService.create_synthetic_keyframe(
                    event_id=item.event_id,
                    camera_id=item.camera_id,
                    camera_location="Sector A — Frontier Road",
                    event_type=ev_data.get("event_type", "Restricted Zone Intrusion"),
                    track_label=f"{ev_data.get('object_type', 'person').upper()} #{ev_data.get('tracking_id', 17)}",
                    risk_score=ev_data.get("risk_score", 85),
                    risk_level=ev_data.get("risk_level", "CRITICAL")
                )

                new_event = Event(
                    id=item.event_id,
                    camera_id=item.camera_id,
                    event_type=ev_data.get("event_type", "Restricted Zone Intrusion"),
                    tracking_id=ev_data.get("tracking_id", 17),
                    object_type=ev_data.get("object_type", "person"),
                    risk_score=ev_data.get("risk_score", 85),
                    risk_level=ev_data.get("risk_level", "CRITICAL"),
                    evidence_path=snap["evidence_path"],
                    evidence_hash=snap["evidence_hash"],
                    prev_hash=prev_h,
                    status="NEW",
                    notes=f"{ev_data.get('notes', '')} (Synchronized from {edge_state.node_id})"
                )
                db.add(new_event)

            item.status = "SYNCED"
            item.synced_at = datetime.now(timezone.utc)
            synced_events.append(item.event_id)
        except Exception as e:
            item.retry_count += 1
            item.status = "FAILED"

    db.commit()

    # Log sync audit
    audit = AuditLog(
        username="EDGE_SYNC_DAEMON",
        action="EDGE_QUEUE_SYNCHRONIZED",
        details=f"Synchronized {len(synced_events)} offline events from {edge_state.node_id} into central ledger."
    )
    db.add(audit)
    db.commit()

    return {
        "message": f"Successfully synchronized {len(synced_events)} events to Central Ledger",
        "synced_count": len(synced_events),
        "synced_event_ids": synced_events,
        "pending_remaining": db.query(SyncQueueItem).filter(SyncQueueItem.status == "PENDING").count()
    }
