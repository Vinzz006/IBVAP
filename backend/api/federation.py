import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.database.database import get_db
from backend.database.models import Sector, EdgeNode, IntelligenceRecord, EventCorrelation, Event, AuditLog
from backend.services.federation_service import FederationService
from backend.services.alert_service import alert_broadcaster

router = APIRouter(prefix="", tags=["Federated Border Intelligence"])

# Pydantic Request Models
class CreateSectorRequest(BaseModel):
    sector_id: Optional[str] = None
    sector_name: str
    region: str = "Frontier Sector"
    edge_node_id: Optional[str] = None
    connectivity: str = "FIBER_OPTIC"
    camera_count: int = 12
    sensor_count: int = 4

class RegisterNodeRequest(BaseModel):
    node_id: Optional[str] = None
    sector_id: str
    hostname: Optional[str] = None
    version: str = "v1.3.0-edge"

class NodeHeartbeatRequest(BaseModel):
    cpu_usage: Optional[float] = 30.0
    memory_usage: Optional[float] = 45.0
    ai_status: Optional[str] = "RUNNING"
    storage_status: Optional[str] = "HEALTHY"
    storage_free_gb: Optional[float] = 450.0
    network_status: Optional[str] = "CONNECTED"
    status: Optional[str] = "ONLINE"

class StructuredIntelligencePayload(BaseModel):
    event_id: str
    sector_id: Optional[str] = None
    edge_node_id: Optional[str] = None
    camera_id: str = "CAM-01"
    event_type: str = "Restricted Zone Intrusion"
    object_type: str = "person"
    tracking_reference: int = 17
    risk_level: str = "CRITICAL"
    risk_score: int = 85
    timestamp: Optional[str] = None
    location_reference: Optional[str] = "Sector Perimeter"
    evidence_hash: Optional[str] = None
    sensor_context: Optional[Dict[str, Any]] = None
    idempotency_key: Optional[str] = None

class EvidenceRetrievalRequest(BaseModel):
    event_id: str
    operator_username: Optional[str] = "Duty Officer"

class SimulationActionRequest(BaseModel):
    action: str  # "MASTER_DEMO", "SECTOR_NET_LOSS", "SECTOR_NET_RESTORE", "SIM_CROSS_JOURNEY"
    sector_id: Optional[str] = "SEC-C"
    target_id: Optional[int] = 17

# --- Sector Management Routes ---
@router.get("/sectors")
def list_sectors(db: Session = Depends(get_db)):
    """Lists all registered frontier sectors with live operational telemetry."""
    return {
        "total_sectors": db.query(Sector).count(),
        "sectors": FederationService.get_sectors(db)
    }

@router.post("/sectors")
def create_sector(req: CreateSectorRequest, db: Session = Depends(get_db)):
    """Registers a new frontier sector."""
    sec = FederationService.register_sector(db, req.model_dump())
    return {
        "message": f"Sector {sec.id} registered successfully",
        "sector_id": sec.id,
        "name": sec.name
    }

@router.get("/sectors/{sector_id}")
def get_sector_detail(sector_id: str, db: Session = Depends(get_db)):
    """Retrieves deep telemetry, deployed cameras, and edge node status for a sector."""
    detail = FederationService.get_sector_detail(db, sector_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Sector {sector_id} not found")
    return detail

# --- Edge Node Management Routes ---
@router.get("/edge-nodes")
def list_edge_nodes(db: Session = Depends(get_db)):
    """Lists all edge computing nodes with hardware, AI engine, and storage telemetry."""
    return {
        "total_nodes": db.query(EdgeNode).count(),
        "edge_nodes": FederationService.get_edge_nodes(db)
    }

@router.post("/edge-nodes")
def register_edge_node(req: RegisterNodeRequest, db: Session = Depends(get_db)):
    """Registers a new edge node and generates its secure node API authentication key."""
    return FederationService.register_edge_node(db, req.model_dump())

@router.get("/edge-nodes/{node_id}")
def get_edge_node(node_id: str, db: Session = Depends(get_db)):
    """Retrieves operational state for a specific edge node."""
    node = db.query(EdgeNode).filter(EdgeNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Edge node {node_id} not found")
    return {
        "node_id": node.id,
        "sector_id": node.sector_id,
        "hostname": node.hostname,
        "status": node.status,
        "version": node.version,
        "cpu_usage": node.cpu_usage,
        "memory_usage": node.memory_usage,
        "ai_status": node.ai_status,
        "storage_status": node.storage_status,
        "storage_free_gb": node.storage_free_gb,
        "network_status": node.network_status,
        "last_heartbeat": node.last_heartbeat.isoformat() if node.last_heartbeat else None,
        "last_sync": node.last_sync.isoformat() if node.last_sync else None
    }

@router.post("/edge-nodes/{node_id}/heartbeat")
def post_edge_heartbeat(node_id: str, req: NodeHeartbeatRequest, db: Session = Depends(get_db)):
    """Processes periodic telemetry heartbeats from edge nodes."""
    res = FederationService.process_heartbeat(db, node_id, req.model_dump())
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

# --- Federated Structured Intelligence & Sync Routes ---
@router.post("/federation/intelligence")
async def submit_federated_intelligence(payload: StructuredIntelligencePayload, db: Session = Depends(get_db)):
    """
    Primary Phase 13 Ingestion Endpoint:
    Receives structured intelligence from edge nodes idempotently. Raw surveillance video remains local at the edge.
    """
    res = FederationService.ingest_intelligence(db, payload.model_dump())
    if res.get("status") == "REJECTED":
        raise HTTPException(status_code=400, detail=res.get("error", "Intelligence rejected"))

    # Broadcast new federated alert to active SOC operators via WebSocket
    if not res.get("is_duplicate"):
        await alert_broadcaster.broadcast_alert({
            "event_id": payload.event_id,
            "camera_id": payload.camera_id,
            "event_type": payload.event_type,
            "risk_score": payload.risk_score,
            "risk_level": payload.risk_level,
            "tracking_id": payload.tracking_reference,
            "sector_id": res.get("sector_id"),
            "edge_node_id": res.get("edge_node_id"),
            "evidence_hash": res.get("evidence_hash"),
            "source": f"FEDERATED_EDGE_{res.get('edge_node_id')}",
            "notes": f"Ingested from {res.get('edge_node_id')}"
        })

    return res

@router.get("/federation/intelligence")
def list_federated_intelligence(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    """Lists structured intelligence records synchronized into Central Command."""
    records = db.query(IntelligenceRecord).order_by(desc(IntelligenceRecord.timestamp)).limit(limit).all()
    return {
        "total_records": db.query(IntelligenceRecord).count(),
        "records": [
            {
                "id": r.id,
                "event_id": r.event_id,
                "sector_id": r.sector_id,
                "edge_node_id": r.edge_node_id,
                "camera_id": r.camera_id,
                "event_type": r.event_type,
                "object_type": r.object_type,
                "tracking_reference": r.tracking_reference,
                "risk_level": r.risk_level,
                "risk_score": r.risk_score,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "location_reference": r.location_reference,
                "evidence_hash": r.evidence_hash,
                "sync_state": r.sync_state,
                "idempotency_key": r.idempotency_key
            }
            for r in records
        ]
    }

@router.get("/federation/sync")
def get_federation_sync_status(db: Session = Depends(get_db)):
    """Retrieves sync status across all edge sectors."""
    sectors = db.query(Sector).all()
    return {
        "sync_mode": "IDEMPOTENT_STRUCTURED_SYNC",
        "pending_sync_records": db.query(IntelligenceRecord).filter(IntelligenceRecord.sync_state == "PENDING_SYNC").count(),
        "synced_records": db.query(IntelligenceRecord).filter(IntelligenceRecord.sync_state == "SYNCED").count(),
        "sectors": [
            {
                "sector_id": s.id,
                "sector_name": s.name,
                "status": s.status,
                "last_sync": s.last_sync.isoformat() if s.last_sync else None
            }
            for s in sectors
        ]
    }

@router.post("/federation/sync")
def trigger_federation_sync(db: Session = Depends(get_db)):
    """Flushes and synchronizes all pending edge queue records idempotently."""
    pending = db.query(IntelligenceRecord).filter(IntelligenceRecord.sync_state == "PENDING_SYNC").all()
    count = 0
    for p in pending:
        p.sync_state = "SYNCED"
        count += 1
    db.commit()

    return {
        "message": f"Successfully synchronized {count} pending records",
        "synced_count": count
    }

# --- Cross-Sector Correlation & Intelligence Graph ---
@router.get("/federation/correlations")
def get_federation_correlations(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Retrieves cross-sector event correlations with transparent factor scoring."""
    return {
        "correlations": FederationService.get_correlations(db, limit)
    }

@router.get("/federation/graph")
def get_federation_graph(db: Session = Depends(get_db)):
    """Returns connected Intelligence Graph nodes & links representing real application relationships."""
    return FederationService.generate_intelligence_graph(db)

# --- Federated Health & Decision Intelligence ---
@router.get("/federation/health")
def get_federation_health(db: Session = Depends(get_db)):
    """Returns Federated Network Overview KPIs and Sector Health Matrix."""
    return FederationService.get_federated_health(db)

@router.get("/federation/decision")
def get_federation_decision(db: Session = Depends(get_db)):
    """Evaluates multi-sector threat rankings answering: Which sector needs attention first?"""
    return FederationService.get_federated_decision_priorities(db)

# --- On-Demand Local Evidence Retrieval ---
@router.post("/federation/evidence-request")
def request_federated_evidence(req: EvidenceRetrievalRequest, db: Session = Depends(get_db)):
    """
    Authorized on-demand retrieval of local evidence keyframe from the edge post with SHA-256 integrity verification.
    """
    res = FederationService.verify_local_evidence_on_demand(db, req.event_id, req.operator_username)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res

# --- Federated Simulation & Master Demo Harness ---
@router.post("/federation/simulate-scenario")
def run_federation_simulation(req: SimulationActionRequest, db: Session = Depends(get_db)):
    """
    Executes federated simulation actions or triggers the 14-Step Master Demo scenario.
    """
    if req.action == "MASTER_DEMO":
        return FederationService.run_master_demo(db)

    elif req.action == "SECTOR_NET_LOSS":
        sec = db.query(Sector).filter(Sector.id == req.sector_id).first()
        node = db.query(EdgeNode).filter(EdgeNode.sector_id == req.sector_id).first()
        if sec:
            sec.status = "OFFLINE"
            sec.connectivity = "OFFLINE"
        if node:
            node.status = "OFFLINE"
            node.network_status = "DISCONNECTED"
        db.commit()
        return {
            "message": f"Network severed for {req.sector_id}. Edge node {node.id if node else ''} switched to EDGE OFFLINE mode.",
            "sector_status": "OFFLINE",
            "simulation_badge": "SIMULATION"
        }

    elif req.action == "SECTOR_NET_RESTORE":
        sec = db.query(Sector).filter(Sector.id == req.sector_id).first()
        node = db.query(EdgeNode).filter(EdgeNode.sector_id == req.sector_id).first()
        if sec:
            sec.status = "ONLINE"
            sec.connectivity = "FIBER_OPTIC"
            sec.last_sync = datetime.now(timezone.utc)
        if node:
            node.status = "ONLINE"
            node.network_status = "CONNECTED"
            node.last_sync = datetime.now(timezone.utc)
        db.commit()
        return {
            "message": f"Network uplink restored for {req.sector_id}. Automatic sync completed.",
            "sector_status": "ONLINE",
            "simulation_badge": "SIMULATION"
        }

    elif req.action == "RESET_NETWORK":
        sectors = db.query(Sector).all()
        nodes = db.query(EdgeNode).all()
        for s in sectors:
            s.status = "ONLINE"
            s.connectivity = "FIBER_OPTIC" if s.id in ["SEC-A", "SEC-C"] else "ENCRYPTED_5G" if s.id == "SEC-B" else "SATELLITE_LINK"
        for n in nodes:
            n.status = "ONLINE"
            n.network_status = "CONNECTED"
            n.ai_status = "RUNNING"
            n.storage_status = "HEALTHY"
        db.commit()
        return {
            "message": "Federated network simulation reset to baseline.",
            "simulation_badge": "SIMULATION"
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unknown simulation action: {req.action}")
