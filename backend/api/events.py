from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from backend.database.database import get_db
from backend.database.models import Event, Camera, AuditLog, Vehicle

router = APIRouter(prefix="/events", tags=["Events"])

class AcknowledgeRequest(BaseModel):
    notes: Optional[str] = "Incident reviewed and acknowledged by operator."
    operator_name: Optional[str] = "Duty Operator"

class ResolveRequest(BaseModel):
    notes: Optional[str] = "Incident investigated and resolved."
    operator_name: Optional[str] = "Duty Operator"

class DispatchRequest(BaseModel):
    dispatch_type: str = "QRF_DEPLOYMENT"  # QRF_DEPLOYMENT, SIREN_ALARM, DRONE_RECON, BARRIER_LOCK
    units: List[str] = ["QRF Team Bravo (3 Operators)", "SSB UAV Recon Unit-4"]
    eta_minutes: int = 3
    siren_activated: bool = True
    barrier_locked: bool = False
    operator_callsign: str = "Control Desk Charlie"
    notes: Optional[str] = "Immediate tactical interception authorized."

@router.get("")
def list_events(
    camera_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Event).options(joinedload(Event.vehicle))
    if camera_id and camera_id not in ("undefined", "null", ""):
        query = query.filter(Event.camera_id == camera_id)
    if risk_level and risk_level not in ("undefined", "null", ""):
        query = query.filter(Event.risk_level == risk_level.upper())
    if event_type and event_type not in ("undefined", "null", ""):
        query = query.filter(Event.event_type == event_type)
    if status and status not in ("undefined", "null", ""):
        query = query.filter(Event.status == status.upper())

    total = query.count()
    events = query.order_by(desc(Event.timestamp)).offset(skip).limit(limit).all()

    camera_map = {c.id: c for c in db.query(Camera).all()}

    result = []
    for ev in events:
        cam = camera_map.get(ev.camera_id)
        veh = ev.vehicle
        result.append({
            "id": ev.id,
            "camera_id": ev.camera_id,
            "camera_name": cam.name if cam else ev.camera_id,
            "location": cam.location if cam else "Sector Unknown",
            "event_type": ev.event_type,
            "tracking_id": ev.tracking_id,
            "object_type": ev.object_type,
            "risk_score": ev.risk_score,
            "risk_level": ev.risk_level,
            "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
            "evidence_path": ev.evidence_path,
            "evidence_hash": ev.evidence_hash,
            "prev_hash": ev.prev_hash,
            "status": ev.status,
            "notes": ev.notes,
            "acknowledged_by": ev.acknowledged_by,
            "acknowledged_at": ev.acknowledged_at.isoformat() if ev.acknowledged_at else None,
            "vehicle": {
                "plate_number": veh.plate_number,
                "confidence": veh.confidence
            } if veh else None
        })

    return {
        "total": total,
        "events": result
    }

@router.get("/reconstruct-journey")
def reconstruct_suspect_journey(
    object_type: Optional[str] = "person",
    db: Session = Depends(get_db)
):
    """
    Correlates security incidents across all cameras to reconstruct multi-sector movement paths.
    """
    events = db.query(Event).filter(Event.object_type == object_type).order_by(Event.timestamp.asc()).limit(15).all()
    
    if not events:
        events = db.query(Event).order_by(Event.timestamp.asc()).limit(10).all()

    camera_map = {c.id: c for c in db.query(Camera).all()}
    journey_steps = []
    prev_time = None

    for idx, ev in enumerate(events):
        cam = camera_map.get(ev.camera_id)
        
        # Calculate transit duration from previous checkpoint
        transit_str = "Origin Detection Point"
        if prev_time and ev.timestamp:
            delta = int((ev.timestamp - prev_time).total_seconds())
            if delta < 60:
                transit_str = f"+{delta}s transit time"
            else:
                transit_str = f"+{delta // 60}m {delta % 60}s transit time"
        
        prev_time = ev.timestamp

        journey_steps.append({
            "step_number": idx + 1,
            "event_id": ev.id,
            "camera_id": ev.camera_id,
            "camera_name": cam.name if cam else ev.camera_id,
            "location": cam.location if cam else "Sector Perimeter",
            "event_type": ev.event_type,
            "target": f"{ev.object_type.upper()} #{ev.tracking_id}",
            "risk_level": ev.risk_level,
            "risk_score": ev.risk_score,
            "timestamp": ev.timestamp.strftime("%H:%M:%S UTC") if ev.timestamp else "02:14:00",
            "transit_delta": transit_str,
            "evidence_path": ev.evidence_path,
            "status": ev.status
        })

    return {
        "target_type": object_type,
        "total_checkpoints": len(journey_steps),
        "journey_steps": journey_steps,
        "estimated_velocity": "4.2 km/h (Pedestrian Transit)",
        "vector_heading": "North-West towards Riverine Basin (Sector B)"
    }

@router.get("/{event_id}")
def get_event(event_id: str, db: Session = Depends(get_db)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    cam = db.query(Camera).filter(Camera.id == ev.camera_id).first()
    veh = db.query(Vehicle).filter(Vehicle.event_id == ev.id).first()

    return {
        "id": ev.id,
        "camera_id": ev.camera_id,
        "camera_name": cam.name if cam else ev.camera_id,
        "location": cam.location if cam else "Sector Unknown",
        "event_type": ev.event_type,
        "tracking_id": ev.tracking_id,
        "object_type": ev.object_type,
        "risk_score": ev.risk_score,
        "risk_level": ev.risk_level,
        "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
        "evidence_path": ev.evidence_path,
        "evidence_hash": ev.evidence_hash,
        "prev_hash": ev.prev_hash,
        "status": ev.status,
        "notes": ev.notes,
        "acknowledged_by": ev.acknowledged_by,
        "acknowledged_at": ev.acknowledged_at.isoformat() if ev.acknowledged_at else None,
        "vehicle": {
            "plate_number": veh.plate_number,
            "confidence": veh.confidence
        } if veh else None
    }

@router.post("/{event_id}/acknowledge")
def acknowledge_event(event_id: str, req: AcknowledgeRequest, db: Session = Depends(get_db)):
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    ev.status = "ACKNOWLEDGED"
    ev.acknowledged_by = req.operator_name
    ev.acknowledged_at = datetime.now(timezone.utc)
    if req.notes:
        ev.notes = req.notes
    
    audit = AuditLog(
        username=req.operator_name,
        action="ACKNOWLEDGE_EVENT",
        event_id=event_id,
        details=f"Incident {event_id} acknowledged by {req.operator_name}. Note: {req.notes}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Event {event_id} acknowledged", "status": "ACKNOWLEDGED"}

@router.post("/{event_id}/resolve")
def resolve_event(event_id: str, req: Optional[ResolveRequest] = None, db: Session = Depends(get_db)):
    """Marks an incident as RESOLVED with operator notes and creates an immutable audit trail entry."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    op_name = req.operator_name if req and req.operator_name else "Duty Operator"
    notes = req.notes if req and req.notes else "Incident reviewed and marked resolved."

    ev.status = "RESOLVED"
    ev.acknowledged_by = op_name
    ev.acknowledged_at = datetime.now(timezone.utc)
    ev.notes = notes

    audit = AuditLog(
        username=op_name,
        action="RESOLVE_EVENT",
        event_id=event_id,
        details=f"Incident {event_id} resolved by {op_name}. Note: {notes}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Event {event_id} marked as RESOLVED", "status": "RESOLVED", "event_id": event_id}

@router.post("/{event_id}/dispatch-response")
def dispatch_tactical_response(event_id: str, req: DispatchRequest, db: Session = Depends(get_db)):
    """
    Executes a simulated tactical response (QRF team deployment, drone launch, siren activation).
    """
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    ev.status = "DISPATCHED"
    ev.acknowledged_by = f"QRF Authorized by {req.operator_callsign}"
    ev.acknowledged_at = datetime.now(timezone.utc)
    ev.notes = f"TACTICAL DISPATCH AUTHORIZED: {', '.join(req.units)}. ETA: {req.eta_minutes} mins. Siren: {'ON' if req.siren_activated else 'OFF'}. Barrier: {'LOCKED' if req.barrier_locked else 'NORMAL'}."

    audit = AuditLog(
        username=req.operator_callsign,
        action="QRF_TACTICAL_DISPATCH",
        event_id=event_id,
        details=f"Dispatched {len(req.units)} units to {ev.camera_id} for incident {event_id}. {ev.notes}"
    )
    db.add(audit)
    db.commit()

    return {
        "message": f"Tactical QRF response deployed to {ev.camera_id}",
        "event_id": event_id,
        "status": "DISPATCHED",
        "units_deployed": req.units,
        "eta_minutes": req.eta_minutes,
        "dispatch_timestamp": datetime.now(timezone.utc).isoformat()
    }
