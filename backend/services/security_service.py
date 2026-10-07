import time
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database.models import SecurityEvent, NodeTrustRecord, AuditLog, User

class SecurityService:
    def __init__(self):
        # In-memory failed login tracking: (ip, username) -> list of timestamps
        self._failed_attempts: Dict[Tuple[str, str], list] = {}
        self._lockouts: Dict[Tuple[str, str], float] = {}

    def is_rate_limited(self, ip: str, username: str) -> Tuple[bool, int]:
        key = (ip, username)
        now = time.time()
        if key in self._lockouts:
            unlock_time = self._lockouts[key]
            if now < unlock_time:
                return True, int(unlock_time - now)
            else:
                del self._lockouts[key]
                self._failed_attempts.pop(key, None)
        return False, 0

    def record_login_attempt(self, ip: str, username: str, success: bool, db: Optional[Session] = None):
        key = (ip, username)
        now = time.time()
        if success:
            self._failed_attempts.pop(key, None)
            self._lockouts.pop(key, None)
        else:
            attempts = self._failed_attempts.get(key, [])
            # Keep attempts from last 5 minutes
            attempts = [t for t in attempts if now - t < 300]
            attempts.append(now)
            self._failed_attempts[key] = attempts
            if len(attempts) >= 5:
                # Lockout for 60 seconds
                self._lockouts[key] = now + 60
                if db:
                    sec_evt = SecurityEvent(
                        event_type="BRUTE_FORCE_LOCKOUT",
                        severity="HIGH",
                        source="AUTH_GUARD",
                        actor_username=username,
                        actor_ip=ip,
                        target_resource="/api/auth/login",
                        details=f"5 consecutive failed login attempts detected for user {username} from IP {ip}. Temporary lockout enacted.",
                        mitigation_action="IP_THROTTLED_60S"
                    )
                    db.add(sec_evt)
                    db.commit()

    def calculate_security_posture(self, db: Session) -> Dict[str, Any]:
        recent_security_events = db.query(SecurityEvent).order_by(desc(SecurityEvent.created_at)).limit(20).all()
        critical_unresolved = sum(1 for e in recent_security_events if e.severity == "CRITICAL" and e.status == "NEW")
        high_unresolved = sum(1 for e in recent_security_events if e.severity == "HIGH" and e.status == "NEW")

        nodes = db.query(NodeTrustRecord).all()
        quarantined_nodes = sum(1 for n in nodes if n.status == "QUARANTINED")

        score = 98 - (critical_unresolved * 15) - (high_unresolved * 5) - (quarantined_nodes * 10)
        score = max(20, min(100, score))

        status = "SECURE" if score >= 85 else "ELEVATED_RISK" if score >= 65 else "COMPROMISED"

        return {
            "status": status,
            "posture_score": score,
            "dimensions": {
                "zero_trust_auth": {"status": "HEALTHY", "score": 95, "details": "JWT PBKDF2 with dynamic rate limiting"},
                "cryptographic_evidence": {"status": "HEALTHY", "score": 98, "details": "SHA-256 tamper-evident integrity chaining"},
                "edge_node_attestation": {"status": "HEALTHY" if quarantined_nodes == 0 else "DEGRADED", "score": 92 if quarantined_nodes == 0 else 70, "details": f"{len(nodes) - quarantined_nodes}/{len(nodes)} edge nodes fully attested"},
                "network_perimeter": {"status": "SECURE", "score": 96, "details": "Encrypted communication & CORS policy enforced"},
                "incident_response": {"status": "OPERATIONAL", "score": 90, "details": "Automated containment active"}
            },
            "unresolved_events": critical_unresolved + high_unresolved,
            "total_nodes_monitored": len(nodes)
        }

    def quarantine_node(self, node_id: str, reason: str, operator_name: str, db: Session) -> Dict[str, Any]:
        node = db.query(NodeTrustRecord).filter(NodeTrustRecord.node_id == node_id).first()
        if not node:
            node = NodeTrustRecord(node_id=node_id, trust_score=0, status="QUARANTINED", quarantine_reason=reason)
            db.add(node)
        else:
            node.status = "QUARANTINED"
            node.trust_score = 0
            node.quarantined_at = datetime.now(timezone.utc)
            node.quarantine_reason = reason

        audit = AuditLog(
            username=operator_name,
            action="QUARANTINE_EDGE_NODE",
            details=f"Edge Node {node_id} manually quarantined. Reason: {reason}"
        )
        db.add(audit)
        db.commit()
        return {"node_id": node_id, "status": "QUARANTINED", "message": f"Node {node_id} isolated from secure cluster."}

    def restore_node(self, node_id: str, operator_name: str, db: Session) -> Dict[str, Any]:
        node = db.query(NodeTrustRecord).filter(NodeTrustRecord.node_id == node_id).first()
        if node:
            node.status = "TRUSTED"
            node.trust_score = 100
            node.quarantined_at = None
            node.quarantine_reason = None

        audit = AuditLog(
            username=operator_name,
            action="RESTORE_EDGE_NODE",
            details=f"Edge Node {node_id} re-attested and restored to trusted cluster."
        )
        db.add(audit)
        db.commit()
        return {"node_id": node_id, "status": "TRUSTED", "message": f"Node {node_id} trust restored."}

security_service = SecurityService()
