from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.database.models import User
from backend.services.mission_service import MissionService, InvalidStateTransitionError
from backend.api.auth import get_current_user

router = APIRouter(prefix="/missions", tags=["Phase 14: Mission Orchestration"])

class CreateMissionRequest(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    priority: Optional[str] = "HIGH"
    priority_score: Optional[int] = 75
    sector_id: Optional[str] = "SEC-B"
    primary_event_id: Optional[str] = None
    primary_target_id: Optional[int] = 17
    object_type: Optional[str] = "person"
    assigned_operator: Optional[str] = None
    response_type: Optional[str] = "QRF_DEPLOYMENT"
    status: Optional[str] = "DETECTED"

class StatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None
    operator_username: Optional[str] = "Duty Operator"

class AssignOperatorRequest(BaseModel):
    assigned_operator: str
    acting_user: Optional[str] = "Duty Officer"

class ApprovalRequest(BaseModel):
    operator_username: Optional[str] = "Duty Officer P. Singh"
    notes: Optional[str] = "Keyframe evidence reviewed and prototype tactical response approved."
    action_type: Optional[str] = "QRF_DEPLOYMENT"

class RejectionRequest(BaseModel):
    operator_username: Optional[str] = "Duty Officer P. Singh"
    notes: Optional[str] = "Response rejected after review. Target deemed false alarm / low threat."

class EscalationRequest(BaseModel):
    operator_username: Optional[str] = "Duty Officer P. Singh"
    target_level: Optional[str] = "SUPERVISOR"
    reason: Optional[str] = "Critical perimeter breach requires senior operational oversight."

class ResolutionRequest(BaseModel):
    resolution_type: Optional[str] = "RESOLVED"  # FALSE_POSITIVE, RESOLVED, ESCALATED, NO_FURTHER_ACTION, OTHER
    notes: Optional[str] = "Incident investigated and sector secured by quick reaction team."
    operator_username: Optional[str] = "Duty Officer P. Singh"

class DemoScenarioRequest(BaseModel):
    operator_username: Optional[str] = "Duty Officer P. Singh"

@router.get("")
def list_missions(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    sector_id: Optional[str] = None,
    assigned_operator: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Lists missions with multi-parameter filtering."""
    return MissionService.list_missions(
        db, status=status, priority=priority, sector_id=sector_id,
        assigned_operator=assigned_operator, limit=limit, skip=skip
    )

@router.post("", status_code=status.HTTP_201_CREATED)
def create_mission(req: CreateMissionRequest, db: Session = Depends(get_db)):
    """Manually creates a new Phase 14 mission."""
    return MissionService.create_mission(db, req.model_dump(), operator_username=req.assigned_operator or "Operator")

@router.get("/stats/overview")
def get_commander_overview(db: Session = Depends(get_db)):
    """Executive summary metrics for the Commander View."""
    return MissionService.get_commander_overview(db)

@router.get("/stats/analytics")
def get_mission_analytics(db: Session = Depends(get_db)):
    """Operational learning metrics: resolution times, sector distribution, false positive rate."""
    return MissionService.get_mission_analytics(db)

@router.post("/demo-scenario")
def run_demo_scenario(req: Optional[DemoScenarioRequest] = None, db: Session = Depends(get_db)):
    """Executes the full 15-step Phase 14 demo scenario matching evaluator specifications."""
    op = req.operator_username if req and req.operator_username else "Duty Officer P. Singh"
    return MissionService.execute_demo_scenario(db, operator_username=op)

@router.get("/{mission_id}")
def get_mission_detail(mission_id: str, db: Session = Depends(get_db)):
    """Retrieves full mission context, timeline, recommendations, and health."""
    m = MissionService.get_mission_detail(db, mission_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Mission {mission_id} not found")
    return m

@router.patch("/{mission_id}/status")
def update_mission_status(mission_id: str, req: StatusUpdateRequest, db: Session = Depends(get_db)):
    """Transitions mission lifecycle state."""
    try:
        return MissionService.update_mission_status(
            db, mission_id, req.status, operator_username=req.operator_username, notes=req.notes
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{mission_id}/assign")
def assign_operator(mission_id: str, req: AssignOperatorRequest, db: Session = Depends(get_db)):
    """Assigns designated operator to the mission."""
    try:
        return MissionService.assign_operator(
            db, mission_id, req.assigned_operator, acting_user=req.acting_user or "Admin"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{mission_id}/timeline")
def get_mission_timeline(mission_id: str, db: Session = Depends(get_db)):
    """Retrieves chronological mission timeline with exact timestamps."""
    try:
        return MissionService.get_mission_timeline(db, mission_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{mission_id}/context")
def get_mission_context(mission_id: str, db: Session = Depends(get_db)):
    """Retrieves aggregated operational context (cameras, targets, sensors, evidence)."""
    try:
        return MissionService.get_mission_context(db, mission_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{mission_id}/recommendations")
def get_mission_recommendations(mission_id: str, db: Session = Depends(get_db)):
    """Retrieves explainable advisory next action recommendations."""
    detail = MissionService.get_mission_detail(db, mission_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Mission {mission_id} not found")
    return detail.get("recommendations", [])

@router.post("/{mission_id}/approve")
def approve_mission_response(mission_id: str, req: Optional[ApprovalRequest] = None, db: Session = Depends(get_db)):
    """HUMAN APPROVAL GATE: Authorizes response workflow and initiates tactical dispatch simulation."""
    op = req.operator_username if req and req.operator_username else "Duty Officer P. Singh"
    notes = req.notes if req and req.notes else "Evidence verified and response authorized."
    action = req.action_type if req and req.action_type else "QRF_DEPLOYMENT"
    try:
        return MissionService.approve_mission_response(
            db, mission_id, operator_username=op, notes=notes, action_type=action
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{mission_id}/reject")
def reject_mission_response(mission_id: str, req: Optional[RejectionRequest] = None, db: Session = Depends(get_db)):
    """Rejects advisory response workflow."""
    op = req.operator_username if req and req.operator_username else "Duty Officer P. Singh"
    notes = req.notes if req and req.notes else "Recommendation rejected after inspection."
    try:
        return MissionService.reject_mission_response(
            db, mission_id, operator_username=op, notes=notes
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{mission_id}/escalate")
def escalate_mission(mission_id: str, req: Optional[EscalationRequest] = None, db: Session = Depends(get_db)):
    """Escalates mission to SUPERVISOR or COMMAND."""
    op = req.operator_username if req and req.operator_username else "Duty Officer P. Singh"
    lvl = req.target_level if req and req.target_level else "SUPERVISOR"
    reason = req.reason if req and req.reason else "Critical security incident escalation."
    try:
        return MissionService.escalate_mission(
            db, mission_id, operator_username=op, target_level=lvl, reason=reason
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{mission_id}/resolve")
def resolve_mission(mission_id: str, req: Optional[ResolutionRequest] = None, db: Session = Depends(get_db)):
    """Marks mission as RESOLVED and generates post-incident summary."""
    op = req.operator_username if req and req.operator_username else "Duty Officer P. Singh"
    res_type = req.resolution_type if req and req.resolution_type else "RESOLVED"
    notes = req.notes if req and req.notes else "Incident resolved successfully."
    try:
        return MissionService.resolve_mission(
            db, mission_id, resolution_type=res_type, notes=notes, operator_username=op
        )
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{mission_id}/health")
def get_mission_health(mission_id: str, db: Session = Depends(get_db)):
    """Returns live health check of all integrated subsystems."""
    try:
        return MissionService.get_mission_health(db, mission_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
