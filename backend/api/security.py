"""
IBVAP Phase 16: Zero-Trust Security, Cyber Resilience & Continuous Security Monitoring API Router
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database.database import get_db
from backend.database.models import SecurityEvent, NodeTrustRecord, AuditLog, User
from backend.services.security_service import security_service

router = APIRouter(prefix="/security", tags=["Zero-Trust Security & Cyber Resilience"])


class AcknowledgeSecurityEventRequest(BaseModel):
    operator_name: Optional[str] = "Duty Officer"
    notes: Optional[str] = "Acknowledged via Security Operations Center drawer."


class ResolveSecurityEventRequest(BaseModel):
    operator_name: Optional[str] = "Duty Officer"
    resolution_type: Optional[str] = "RESOLVED"  # RESOLVED, CONTAINED, FALSE_POSITIVE
    notes: Optional[str] = "Incident contained and verified safe."


class NodeActionRequest(BaseModel):
    operator_name: Optional[str] = "Duty Officer"
    reason: Optional[str] = "Manual quarantine requested by operator."


class SimulationTriggerRequest(BaseModel):
    scenario: str  # SIM_BRUTE_FORCE, SIM_INVALID_TOKEN, SIM_UNAUTHORIZED_EVIDENCE, SIM_UNTRUSTED_NODE, SIM_EVIDENCE_TAMPER, SIM_CONFIG_TAMPER
    operator_name: Optional[str] = "Red Team Operator"


# ------------------------------------------------------------------------------
# 1. Security Overview & Posture
# ------------------------------------------------------------------------------
@router.get("/overview")
def get_security_overview(db: Session = Depends(get_db)):
    """Retrieves the overall prototype security posture score and dimension breakdown."""
    return security_service.calculate_security_posture(db)


@router.get("/health")
def get_security_health(db: Session = Depends(get_db)):
    """Returns granular health metrics across all zero-trust components."""
    overview = security_service.calculate_security_posture(db)
    return {
        "overall_status": overview["status"],
        "posture_score": overview["posture_score"],
        "dimensions": overview["dimensions"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ------------------------------------------------------------------------------
# 2. Security Events & Alert Triage
# ------------------------------------------------------------------------------
@router.get("/events")
def get_security_events(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    """Lists security events with optional severity and status filters."""
    query = db.query(SecurityEvent)
    if severity:
        query = query.filter(SecurityEvent.severity == severity.upper())
    if status:
        query = query.filter(SecurityEvent.status == status.upper())
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type)
        
    events = query.order_by(desc(SecurityEvent.created_at)).limit(limit).all()
    
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "severity": e.severity,
            "source": e.source,
            "actor_username": e.actor_username,
            "actor_ip": e.actor_ip,
            "target_resource": e.target_resource,
            "details": e.details,
            "mitigation_action": e.mitigation_action,
            "status": e.status,
            "acknowledged_by": e.acknowledged_by,
            "acknowledged_at": e.acknowledged_at.isoformat() if e.acknowledged_at else None,
            "resolved_by": e.resolved_by,
            "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
            "resolution_notes": e.resolution_notes,
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in events
    ]


@router.get("/events/{event_id}")
def get_security_event_detail(event_id: str, db: Session = Depends(get_db)):
    """Retrieves full forensic details for a specific security alert."""
    e = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not e:
        raise HTTPException(status_code=404, detail=f"Security event {event_id} not found.")
    return {
        "id": e.id,
        "event_type": e.event_type,
        "severity": e.severity,
        "source": e.source,
        "actor_username": e.actor_username,
        "actor_ip": e.actor_ip,
        "target_resource": e.target_resource,
        "details": e.details,
        "mitigation_action": e.mitigation_action,
        "status": e.status,
        "acknowledged_by": e.acknowledged_by,
        "acknowledged_at": e.acknowledged_at.isoformat() if e.acknowledged_at else None,
        "resolved_by": e.resolved_by,
        "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
        "resolution_notes": e.resolution_notes,
        "created_at": e.created_at.isoformat() if e.created_at else None
    }


@router.post("/events/{event_id}/acknowledge")
def acknowledge_security_event(
    event_id: str,
    req: AcknowledgeSecurityEventRequest,
    db: Session = Depends(get_db)
):
    """Acknowledges a security event with operator notes."""
    result = security_service.acknowledge_security_event(event_id, req.operator_name, req.notes, db)
    if not result:
        raise HTTPException(status_code=404, detail=f"Security event {event_id} not found.")
    return {"status": "ACKNOWLEDGED", "event_id": event_id, "acknowledged_by": req.operator_name}


@router.post("/events/{event_id}/resolve")
def resolve_security_event(
    event_id: str,
    req: ResolveSecurityEventRequest,
    db: Session = Depends(get_db)
):
    """Resolves or marks a security event as false positive / contained."""
    result = security_service.resolve_security_event(
        event_id, req.operator_name, req.resolution_type, req.notes, db
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"Security event {event_id} not found.")
    return {"status": result.status, "event_id": event_id, "resolved_by": req.operator_name}


# ------------------------------------------------------------------------------
# 3. Federated Node Trust & Credential Management
# ------------------------------------------------------------------------------
@router.get("/nodes")
def get_node_trust_matrix(db: Session = Depends(get_db)):
    """Retrieves trust states, credential age, and security health for all edge nodes."""
    return security_service.get_node_trust_matrix(db)


@router.post("/nodes/{node_id}/rotate-credential")
def rotate_node_credential(
    node_id: str,
    req: NodeActionRequest,
    db: Session = Depends(get_db)
):
    """Rotates cryptographic TLS token for an edge node."""
    try:
        return security_service.rotate_node_credential(node_id, req.operator_name, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/nodes/{node_id}/quarantine")
def quarantine_node(
    node_id: str,
    req: NodeActionRequest,
    db: Session = Depends(get_db)
):
    """Restricts and quarantines an untrusted or compromised node."""
    try:
        return security_service.quarantine_node(node_id, req.operator_name, req.reason, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/nodes/{node_id}/restore")
def restore_node_trust(
    node_id: str,
    req: NodeActionRequest,
    db: Session = Depends(get_db)
):
    """Restores full trusted status for a previously quarantined node."""
    try:
        return security_service.restore_node_trust(node_id, req.operator_name, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ------------------------------------------------------------------------------
# 4. RBAC Permission Matrix & Security Audit Feed
# ------------------------------------------------------------------------------
@router.get("/matrix")
def get_rbac_matrix():
    """Returns the zero-trust Role-Based Access Control (RBAC) permission matrix."""
    return {
        "roles": ["ADMIN", "OPERATOR", "VIEWER"],
        "matrix": [
            {"resource": "Live CCTV Surveillance Feed", "admin": True, "operator": True, "viewer": True, "description": "Stream viewing with AI bounding boxes"},
            {"resource": "Incident Ledger & Alerts Drawer", "admin": True, "operator": True, "viewer": True, "description": "View threat logs & risk scores"},
            {"resource": "Acknowledge / Triage Incidents", "admin": True, "operator": True, "viewer": False, "description": "Operator incident notes & status update"},
            {"resource": "Virtual Fence / Zone Editor", "admin": True, "operator": True, "viewer": False, "description": "Polygon boundary arming and editing"},
            {"resource": "UAV Tactical Flight Controls", "admin": True, "operator": True, "viewer": False, "description": "Dispatch 360° orbit & patrol sweep"},
            {"resource": "SHA-256 Evidence Hash Verification", "admin": True, "operator": True, "viewer": False, "description": "Recompute disk cryptographic hashes"},
            {"resource": "Security Center Operations", "admin": True, "operator": True, "viewer": False, "description": "Security posture monitoring & alert triage"},
            {"resource": "Node Credential Rotation & Quarantine", "admin": True, "operator": True, "viewer": False, "description": "Manage edge node trust and tokens"},
            {"resource": "System User & Role Management", "admin": True, "operator": False, "viewer": False, "description": "Provision and revoke operator accounts"},
            {"resource": "Audit Trail Log Review", "admin": True, "operator": True, "viewer": False, "description": "Immutable activity and security logs"}
        ]
    }


@router.get("/audit")
def get_security_audit_logs(
    action: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db)
):
    """Returns audit log records filtered by action or actor."""
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if username:
        query = query.filter(AuditLog.username == username)
    logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).all()
    return [
        {
            "id": l.id,
            "username": l.username,
            "action": l.action,
            "event_id": l.event_id,
            "details": l.details,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None
        }
        for l in logs
    ]


# ------------------------------------------------------------------------------
# 5. Red-Team Cyber Attack Simulation Engine
# ------------------------------------------------------------------------------
@router.post("/simulation/trigger")
def trigger_attack_simulation(
    req: SimulationTriggerRequest,
    db: Session = Depends(get_db)
):
    """Executes a defensive cyber attack simulation scenario."""
    try:
        return security_service.trigger_attack_simulation(req.scenario, req.operator_name, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/simulation/reset")
def reset_attack_simulation(
    req: NodeActionRequest,
    db: Session = Depends(get_db)
):
    """Resets all simulation artifacts and restores nominal security health."""
    return security_service.reset_simulation(req.operator_name, db)


# ------------------------------------------------------------------------------
# 6. Security Posture Report Export
# ------------------------------------------------------------------------------
@router.post("/report")
def generate_security_report(
    operator_name: Optional[str] = "Duty Officer",
    db: Session = Depends(get_db)
):
    """Generates an official continuous security assessment report."""
    overview = security_service.calculate_security_posture(db)
    nodes = security_service.get_node_trust_matrix(db)
    events = db.query(SecurityEvent).order_by(desc(SecurityEvent.created_at)).limit(20).all()
    
    audit = AuditLog(
        username=operator_name,
        action="SECURITY_REPORT_GENERATED",
        details=f"Operator {operator_name} generated full zero-trust posture assessment report."
    )
    db.add(audit)
    db.commit()

    return {
        "report_id": f"SEC-REP-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
        "generated_by": operator_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "posture_score": overview["posture_score"],
        "posture_status": overview["status"],
        "dimensions": overview["dimensions"],
        "metrics": overview["metrics"],
        "node_inventory": nodes,
        "recent_security_events": [
            {"id": e.id, "type": e.event_type, "severity": e.severity, "status": e.status, "mitigation": e.mitigation_action}
            for e in events
        ]
    }
