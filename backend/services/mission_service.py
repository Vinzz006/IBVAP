import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database.models import Mission, Event, AuditLog, Sector

class MissionService:
    @classmethod
    def list_missions(cls, db: Session, status: Optional[str] = None, priority: Optional[str] = None,
                      sector_id: Optional[str] = None, assigned_operator: Optional[str] = None,
                      limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        query = db.query(Mission)
        if status:
            query = query.filter(Mission.status == status.upper())
        if priority:
            query = query.filter(Mission.priority == priority.upper())
        if sector_id:
            query = query.filter(Mission.sector_id == sector_id)
        if assigned_operator:
            query = query.filter(Mission.assigned_operator == assigned_operator)

        missions = query.order_by(desc(Mission.created_at)).offset(skip).limit(limit).all()
        return [cls._to_dict(m) for m in missions]

    @classmethod
    def create_mission(cls, db: Session, data: Dict[str, Any], operator_username: str = "Operator") -> Dict[str, Any]:
        msn_id = data.get("id") or f"MSN-{uuid.uuid4().hex[:6].upper()}"
        title = data.get("title") or f"Perimeter Security Intercept {msn_id}"
        mission = Mission(
            id=msn_id,
            title=title,
            priority=data.get("priority", "HIGH"),
            priority_score=data.get("priority_score", 75),
            sector_id=data.get("sector_id", "SEC-B"),
            primary_event_id=data.get("primary_event_id"),
            primary_target_id=data.get("primary_target_id", 17),
            object_type=data.get("object_type", "person"),
            assigned_operator=data.get("assigned_operator", operator_username),
            response_type=data.get("response_type", "QRF_DEPLOYMENT"),
            status=data.get("status", "DETECTED"),
            timeline=[
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "event": "MISSION_INITIATED",
                    "actor": operator_username,
                    "details": f"Mission {msn_id} created: {title}"
                }
            ],
            recommendations=[
                {"action": "DEPLOY_QRF", "confidence": 0.92, "reason": "Target inside restricted border zone"},
                {"action": "SEAL_PERIMETER_GATE", "confidence": 0.88, "reason": "Vector moving towards secondary exit"}
            ]
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)
        return cls._to_dict(mission)

    @classmethod
    def get_commander_overview(cls, db: Session) -> Dict[str, Any]:
        all_missions = db.query(Mission).all()
        active = [m for m in all_missions if m.status in ["DETECTED", "ASSIGNED", "IN_PROGRESS", "ESCALATED"]]
        critical_count = sum(1 for m in active if m.priority == "CRITICAL" or m.priority_score >= 80)
        resolved_today = sum(1 for m in all_missions if m.status == "RESOLVED")

        return {
            "total_active_missions": len(active),
            "critical_missions": critical_count,
            "resolved_today": resolved_today,
            "tactical_readiness_pct": 96.5,
            "avg_response_minutes": 2.4,
            "qrf_units_deployed": 3,
            "drone_recon_active": 1
        }

    @classmethod
    def get_mission_analytics(cls, db: Session) -> Dict[str, Any]:
        return {
            "resolution_times_by_priority": {"CRITICAL": 3.1, "HIGH": 5.8, "MEDIUM": 12.4, "LOW": 20.0},
            "false_positive_rate_pct": 3.2,
            "sector_distribution": {"SEC-A": 4, "SEC-B": 9, "SEC-C": 3, "SEC-D": 2},
            "top_threat_actors": [{"type": "person", "count": 14}, {"type": "vehicle", "count": 4}]
        }

    @classmethod
    def execute_demo_scenario(cls, db: Session, operator_username: str = "Duty Officer P. Singh") -> Dict[str, Any]:
        msn_id = f"MSN-DEMO-{uuid.uuid4().hex[:4].upper()}"
        mission = Mission(
            id=msn_id,
            title="Rapid Intercept: Riverine Basin Sector B Perimeter Breach",
            priority="CRITICAL",
            priority_score=95,
            sector_id="SEC-B",
            primary_target_id=17,
            object_type="person",
            assigned_operator=operator_username,
            response_type="QRF_DEPLOYMENT",
            status="IN_PROGRESS",
            timeline=[
                {"timestamp": (datetime.now(timezone.utc) - timedelta(minutes=3)).isoformat(), "event": "TARGET_DETECTED", "actor": "AI_ENGINE", "details": "Target #17 classified as Person with 0.89 confidence."},
                {"timestamp": (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat(), "event": "ZONE_BREACH", "actor": "INTRUSION_DETECTOR", "details": "Virtual fence breached in Sector B."},
                {"timestamp": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(), "event": "QRF_AUTHORIZED", "actor": operator_username, "details": "Tactical Bravo unit dispatched."}
            ],
            recommendations=[
                {"action": "ACTIVATE_SIREN_CHIME", "confidence": 0.95, "reason": "Immediate deterrence of perimeter breach"},
                {"action": "SECTOR_LOCKDOWN", "confidence": 0.90, "reason": "Prevent lateral escape into scrubland"}
            ]
        )
        db.add(mission)
        db.commit()
        db.refresh(mission)
        return cls._to_dict(mission)

    @classmethod
    def get_mission_detail(cls, db: Session, mission_id: str) -> Optional[Dict[str, Any]]:
        m = db.query(Mission).filter(Mission.id == mission_id).first()
        return cls._to_dict(m) if m else None

    @classmethod
    def _to_dict(cls, m: Mission) -> Dict[str, Any]:
        return {
            "id": m.id,
            "title": m.title,
            "priority": m.priority,
            "priority_score": m.priority_score,
            "sector_id": m.sector_id,
            "primary_event_id": m.primary_event_id,
            "primary_target_id": m.primary_target_id,
            "object_type": m.object_type,
            "assigned_operator": m.assigned_operator,
            "response_type": m.response_type,
            "status": m.status,
            "notes": m.notes,
            "timeline": m.timeline or [],
            "recommendations": m.recommendations or [],
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None
        }

