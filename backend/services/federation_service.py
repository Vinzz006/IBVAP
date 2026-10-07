import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database.models import Sector, EdgeNode, IntelligenceRecord, EventCorrelation, Event, AuditLog

class FederationService:
    @classmethod
    def get_sectors(cls, db: Session) -> List[Dict[str, Any]]:
        sectors = db.query(Sector).all()
        result = []
        for s in sectors:
            node = db.query(EdgeNode).filter(EdgeNode.sector_id == s.id).first()
            result.append({
                "id": s.id,
                "name": s.name,
                "camera_id": s.camera_id,
                "terrain": s.terrain,
                "region": s.region,
                "status": s.status,
                "risk_index": s.risk_index,
                "connectivity": s.connectivity,
                "camera_count": s.camera_count,
                "sensor_count": s.sensor_count,
                "coordinates": s.coordinates or [],
                "edge_node": {
                    "id": node.id,
                    "status": node.status,
                    "cpu_usage": node.cpu_usage,
                    "memory_usage": node.memory_usage
                } if node else None
            })
        return result

    @classmethod
    def register_sector(cls, db: Session, payload: Dict[str, Any]) -> Sector:
        sec_id = payload.get("sector_id") or f"SEC-{uuid.uuid4().hex[:4].upper()}"
        sec = Sector(
            id=sec_id,
            name=payload.get("sector_name", f"Sector {sec_id}"),
            region=payload.get("region", "Frontier Sector"),
            connectivity=payload.get("connectivity", "FIBER_OPTIC"),
            camera_count=payload.get("camera_count", 12),
            sensor_count=payload.get("sensor_count", 4)
        )
        db.add(sec)
        db.commit()
        db.refresh(sec)
        return sec

    @classmethod
    def get_sector_detail(cls, db: Session, sector_id: str) -> Optional[Dict[str, Any]]:
        sec = db.query(Sector).filter(Sector.id == sector_id).first()
        if not sec:
            return None
        node = db.query(EdgeNode).filter(EdgeNode.sector_id == sec.id).first()
        recent_events = db.query(Event).filter(Event.camera_id == sec.camera_id).order_by(desc(Event.timestamp)).limit(5).all()
        return {
            "id": sec.id,
            "name": sec.name,
            "camera_id": sec.camera_id,
            "terrain": sec.terrain,
            "region": sec.region,
            "status": sec.status,
            "risk_index": sec.risk_index,
            "connectivity": sec.connectivity,
            "camera_count": sec.camera_count,
            "sensor_count": sec.sensor_count,
            "coordinates": sec.coordinates or [],
            "edge_node": {
                "id": node.id,
                "status": node.status,
                "cpu_usage": node.cpu_usage,
                "memory_usage": node.memory_usage,
                "storage_free_gb": node.storage_free_gb,
                "ai_status": node.ai_status,
                "network_status": node.network_status
            } if node else None,
            "recent_events": [
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "risk_level": e.risk_level,
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None
                } for e in recent_events
            ]
        }

    @classmethod
    def get_edge_nodes(cls, db: Session) -> List[Dict[str, Any]]:
        nodes = db.query(EdgeNode).all()
        return [
            {
                "id": n.id,
                "sector_id": n.sector_id,
                "node_name": n.node_name or n.hostname,
                "ip_address": n.ip_address,
                "status": n.status,
                "model_version": n.model_version,
                "version": n.version,
                "cpu_usage": n.cpu_usage,
                "memory_usage": n.memory_usage,
                "ai_status": n.ai_status,
                "storage_status": n.storage_status,
                "storage_free_gb": n.storage_free_gb,
                "network_status": n.network_status,
                "last_sync": n.last_sync.isoformat() if n.last_sync else None
            } for n in nodes
        ]
