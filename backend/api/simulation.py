import uuid
import random
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import Event, Camera, AuditLog
from backend.services.evidence_service import EvidenceService

router = APIRouter(prefix="/simulation", tags=["Border Digital Twin"])

class DigitalTwinEntity:
    def __init__(self, id: str, entity_type: str, sector: str, x: float, y: float, heading: str = "SOUTH"):
        self.id = id
        self.entity_type = entity_type
        self.sector = sector
        self.x = x
        self.y = y
        self.heading = heading
        self.is_in_restricted_zone = False

class DigitalTwinState:
    def __init__(self):
        self.entities: Dict[str, DigitalTwinEntity] = {}
        self.camera_failures: List[str] = []
        self.network_offline: bool = False
        self.sensor_anomalies: List[str] = []
        self.active_breaches: List[Dict[str, Any]] = []

twin_state = DigitalTwinState()

class SpawnEntityRequest(BaseModel):
    entity_type: str = "person"  # person, vehicle
    sector: str = "CAM-01"
    x: Optional[float] = 45.0
    y: Optional[float] = 30.0

class TriggerEventRequest(BaseModel):
    event_type: str = "intrusion"  # intrusion, night_movement, camera_failure, network_loss, sensor_anomaly
    camera_id: str = "CAM-01"
    intensity: Optional[str] = "HIGH"

@router.get("/state")
def get_digital_twin_state(db: Session = Depends(get_db)):
    """Retrieves real-time state of the Border Digital Twin simulation environment."""
    cameras = [
        {"id": "CAM-01", "name": "Sector A Highway", "x": 25, "y": 40, "status": "OFFLINE" if "CAM-01" in twin_state.camera_failures else "ONLINE", "zone": [[20, 35], [40, 35], [40, 55], [20, 55]]},
        {"id": "CAM-02", "name": "Sector B Riverine", "x": 50, "y": 65, "status": "OFFLINE" if "CAM-02" in twin_state.camera_failures else "ONLINE", "zone": [[45, 55], [65, 55], [65, 75], [45, 75]]},
        {"id": "CAM-03", "name": "Sector C Checkpoint", "x": 75, "y": 45, "status": "OFFLINE" if "CAM-03" in twin_state.camera_failures else "ONLINE", "zone": [[70, 40], [85, 40], [85, 60], [70, 60]]},
        {"id": "CAM-04", "name": "Sector D Mountain", "x": 90, "y": 25, "status": "OFFLINE" if "CAM-04" in twin_state.camera_failures else "ONLINE", "zone": [[82, 20], [98, 20], [98, 38], [82, 38]]}
    ]

    entity_list = [
        {
            "id": e.id,
            "type": e.entity_type,
            "sector": e.sector,
            "x": e.x,
            "y": e.y,
            "heading": e.heading,
            "in_restricted_zone": e.is_in_restricted_zone
        }
        for e in twin_state.entities.values()
    ]

    return {
        "mode": "DIGITAL_TWIN_SIMULATION",
        "sectors": [
            {"id": "SEC-A", "name": "Sector A — North Perimeter", "terrain": "Arid Highway", "risk_index": "CRITICAL" if len(twin_state.active_breaches) > 0 else "LOW"},
            {"id": "SEC-B", "name": "Sector B — Riverine Basin", "terrain": "River Wetland", "risk_index": "HIGH"},
            {"id": "SEC-C", "name": "Sector C — Transit Checkpoint", "terrain": "Paved Road", "risk_index": "MEDIUM"},
            {"id": "SEC-D", "name": "Sector D — High Mountain Pass", "terrain": "Rocky Ridge", "risk_index": "LOW"}
        ],
        "cameras": cameras,
        "entities": entity_list,
        "active_breaches": twin_state.active_breaches,
        "system_failures": {
            "cameras_offline": twin_state.camera_failures,
            "network_offline": twin_state.network_offline,
            "sensor_anomalies": twin_state.sensor_anomalies
        },
        "disclaimer": "SIMULATION MODE: Synthetic conceptual sector coordinates for evaluator testing."
    }

@router.post("/spawn")
def spawn_entity(req: SpawnEntityRequest):
    """Spawns an entity into the Border Digital Twin canvas."""
    entity_id = f"SIM-{req.entity_type.upper()}-{uuid.uuid4().hex[:4].upper()}"
    entity = DigitalTwinEntity(
        id=entity_id,
        entity_type=req.entity_type,
        sector=req.sector,
        x=req.x,
        y=req.y,
        heading="SOUTH" if req.y < 50 else "NORTH"
    )
    twin_state.entities[entity_id] = entity

    return {
        "message": f"Spawned {req.entity_type} into Digital Twin",
        "entity_id": entity_id,
        "sector": req.sector,
        "coordinates": {"x": req.x, "y": req.y}
    }

@router.post("/trigger-event")
def trigger_digital_twin_event(req: TriggerEventRequest, db: Session = Depends(get_db)):
    """Triggers an event or failure scenario in the Digital Twin simulation."""
    if req.event_type == "camera_failure":
        if req.camera_id not in twin_state.camera_failures:
            twin_state.camera_failures.append(req.camera_id)
        return {"status": "FAILURE_SIMULATED", "target": req.camera_id, "mode": "CAMERA_OFFLINE"}

    elif req.event_type == "network_loss":
        twin_state.network_offline = True
        return {"status": "FAILURE_SIMULATED", "mode": "EDGE_MODE_ACTIVE"}

    elif req.event_type == "sensor_anomaly":
        twin_state.sensor_anomalies.append(f"ACOUSTIC-SPIKE-{req.camera_id}")
        return {"status": "ANOMALY_TRIGGERED", "type": "WIRE_TENSION_SPIKE"}

    # Real incident event injection marked as SIMULATION
    ev_id = f"EVT-SIM-{uuid.uuid4().hex[:6].upper()}"
    track_id = random.randint(301, 399)

    snap = EvidenceService.create_synthetic_keyframe(
        event_id=ev_id,
        camera_id=req.camera_id,
        camera_location="Sector Perimeter Outpost",
        event_type=f"[SIMULATION] {req.event_type.capitalize()} Breach",
        track_label=f"PERSON #{track_id}",
        risk_score=95 if req.intensity == "HIGH" else 65,
        risk_level="CRITICAL" if req.intensity == "HIGH" else "HIGH"
    )

    new_event = Event(
        id=ev_id,
        camera_id=req.camera_id,
        event_type=f"[SIMULATION] {req.event_type.capitalize()} Breach",
        tracking_id=track_id,
        object_type="person" if "vehicle" not in req.event_type else "car",
        risk_score=95 if req.intensity == "HIGH" else 65,
        risk_level="CRITICAL" if req.intensity == "HIGH" else "HIGH",
        evidence_path=snap["evidence_path"],
        evidence_hash=snap["evidence_hash"],
        prev_hash="GENESIS_HASH_00000000000000000000000000000000",
        status="NEW",
        notes=f"Digital Twin Scenario Trigger [{req.event_type}]"
    )
    db.add(new_event)
    db.commit()

    breach_entry = {
        "event_id": ev_id,
        "camera_id": req.camera_id,
        "type": req.event_type,
        "risk_level": new_event.risk_level,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    twin_state.active_breaches.append(breach_entry)

    return {
        "message": f"Digital twin event [{req.event_type}] triggered successfully",
        "event_id": ev_id,
        "camera_id": req.camera_id,
        "status": "SIMULATION_EVENT_INJECTED"
    }

@router.post("/reset")
def reset_digital_twin_simulation(db: Session = Depends(get_db)):
    """Resets all Digital Twin simulation entities, breaches, and simulated records from database."""
    twin_state.entities.clear()
    twin_state.camera_failures.clear()
    twin_state.network_offline = False
    twin_state.sensor_anomalies.clear()
    twin_state.active_breaches.clear()

    # Clean up simulated events
    deleted_events = db.query(Event).filter(
        (Event.id.like("EVT-SIM-%")) |
        (Event.id.like("EVT-RT-%")) |
        (Event.event_type.like("%[SIMULATION]%")) |
        (Event.notes.like("%Simulation%")) |
        (Event.notes.like("%Stress Test%"))
    ).delete(synchronize_session=False)

    # Clean up demo missions
    from backend.database.models import Mission
    deleted_missions = db.query(Mission).filter(Mission.id.like("MSN-DEMO-%")).delete(synchronize_session=False)

    audit = AuditLog(
        username="SIMULATION_CONTROLLER",
        action="SIMULATION_RESET",
        details=f"Reset simulation state. Removed {deleted_events} simulated events and {deleted_missions} demo missions."
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Digital Twin simulation reset to baseline state",
        "status": "RESET_SUCCESS",
        "deleted_simulated_events": deleted_events,
        "deleted_demo_missions": deleted_missions
    }
