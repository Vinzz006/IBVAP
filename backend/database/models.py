import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from backend.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(64), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    full_name = Column(String(128), default="Operator")
    role = Column(String(32), default="OPERATOR")  # ADMIN, OPERATOR, VIEWER
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True)  # e.g., CAM-01
    name = Column(String(128), nullable=False)
    location = Column(String(256), nullable=False)
    stream_url = Column(String(512), nullable=False)
    status = Column(String(32), default="ONLINE")  # ONLINE, OFFLINE, STANDBY
    zone_polygon = Column(JSON, default=list)  # [[x, y], ...]
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    events = relationship("Event", back_populates="camera", cascade="all, delete-orphan")

    def get_zone_polygon(self) -> List[List[float]]:
        if isinstance(self.zone_polygon, list):
            return self.zone_polygon
        if isinstance(self.zone_polygon, str):
            try:
                return json.loads(self.zone_polygon)
            except Exception:
                return []
        return []

    def set_zone_polygon(self, polygon: List[List[float]]):
        self.zone_polygon = polygon


class Event(Base):
    __tablename__ = "events"

    id = Column(String(64), primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=True, index=True)
    tracking_id = Column(Integer, index=True, nullable=True)
    object_type = Column(String(64), default="person")
    event_type = Column(String(128), default="Restricted Zone Intrusion")
    risk_score = Column(Integer, default=50, index=True)
    risk_level = Column(String(32), default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(32), default="NEW", index=True)  # NEW, ACKNOWLEDGED, RESOLVED, DISPATCHED
    confidence = Column(Float, default=0.85)
    bbox = Column(JSON, default=list)  # [x1, y1, x2, y2]
    centroid = Column(JSON, default=list)  # [cx, cy]
    dwell_time = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    evidence_path = Column(String(512), nullable=True)
    evidence_hash = Column(String(128), nullable=True)
    prev_hash = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    operator_notes = Column(Text, nullable=True)
    operator_name = Column(String(128), nullable=True)

    acknowledged_by = Column(String(128), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(128), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_type = Column(String(64), nullable=True)

    camera = relationship("Camera", back_populates="events")
    vehicle = relationship("Vehicle", back_populates="event", uselist=False, cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_events_camera_timestamp", "camera_id", "timestamp"),
        Index("ix_events_risk_timestamp", "risk_level", "timestamp"),
        Index("ix_events_status_timestamp", "status", "timestamp"),
    )

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(64), ForeignKey("events.id"), unique=True, index=True)
    plate_number = Column(String(64), default="UNKNOWN")
    plate_confidence = Column(Float, default=0.0)
    plate_bbox = Column(JSON, default=list)
    vehicle_type = Column(String(64), default="car")
    flag_status = Column(String(64), default="CLEAR")

    event = relationship("Event", back_populates="vehicle")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    user_id = Column(String(64), nullable=True)
    username = Column(String(64), default="SYSTEM", index=True)
    action = Column(String(128), nullable=False)
    event_id = Column(String(64), nullable=True, index=True)
    details = Column(Text, nullable=True)

class Detection(Base):
    __tablename__ = "detections"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(64), ForeignKey("events.id"), nullable=True, index=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=True, index=True)
    target_id = Column(Integer, nullable=True, index=True)
    class_name = Column(String(64), default="person")
    confidence = Column(Float, default=0.0)
    bbox = Column(JSON, default=list)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    event = relationship("Event", back_populates="detections")

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(String(64), primary_key=True, default=lambda: f"SEC-EVT-{uuid.uuid4().hex[:6].upper()}")
    event_type = Column(String(128), nullable=False)
    severity = Column(String(32), default="MEDIUM", index=True)
    source = Column(String(128), default="SYSTEM")
    actor_username = Column(String(128), default="anonymous")
    actor_ip = Column(String(64), default="127.0.0.1")
    target_resource = Column(String(256), default="/api")
    details = Column(Text, nullable=True)
    mitigation_action = Column(String(256), nullable=True)
    status = Column(String(32), default="NEW", index=True)
    acknowledged_by = Column(String(128), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(128), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class NodeTrustRecord(Base):
    __tablename__ = "node_trust_records"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id = Column(String(64), unique=True, index=True, nullable=False)
    trust_score = Column(Integer, default=100)
    status = Column(String(32), default="TRUSTED")  # TRUSTED, QUARANTINED, REVOKED
    last_heartbeat = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    signature = Column(String(256), nullable=True)
    quarantined_at = Column(DateTime, nullable=True)
    quarantine_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class PrivacyPolicy(Base):
    __tablename__ = "privacy_policies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evidence_retention_days = Column(Integer, default=30)
    metadata_retention_days = Column(Integer, default=90)
    audit_retention_days = Column(Integer, default=365)
    masking_enabled = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Sector(Base):
    __tablename__ = "sectors"

    id = Column(String(64), primary_key=True)  # e.g., SEC-A
    name = Column(String(128), nullable=False)
    camera_id = Column(String(64), nullable=True)
    terrain = Column(String(256), default="Open Frontier")
    region = Column(String(128), default="Frontier Sector")
    status = Column(String(32), default="SECURE")
    risk_index = Column(Integer, default=20)
    connectivity = Column(String(64), default="FIBER_OPTIC")
    camera_count = Column(Integer, default=4)
    sensor_count = Column(Integer, default=2)
    coordinates = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class EdgeNode(Base):
    __tablename__ = "edge_nodes"

    id = Column(String(64), primary_key=True)  # e.g. EDGE-NODE-SECTOR-A
    sector_id = Column(String(64), ForeignKey("sectors.id"), nullable=True)
    node_name = Column(String(128), nullable=True)
    hostname = Column(String(128), default="edge-node-01")
    ip_address = Column(String(64), default="10.0.1.50")
    status = Column(String(32), default="ONLINE")
    model_version = Column(String(64), default="yolov8n-v2.1")
    version = Column(String(64), default="v1.3.0-edge")
    cpu_usage = Column(Float, default=25.0)
    memory_usage = Column(Float, default=40.0)
    ai_status = Column(String(32), default="RUNNING")
    storage_status = Column(String(32), default="HEALTHY")
    storage_free_gb = Column(Float, default=450.0)
    network_status = Column(String(32), default="CONNECTED")
    last_heartbeat = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_sync = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class IntelligenceRecord(Base):
    __tablename__ = "intelligence_records"

    id = Column(String(64), primary_key=True, default=lambda: f"INTEL-{uuid.uuid4().hex[:6].upper()}")
    # Federated intelligence fields (Phase 13)
    event_id = Column(String(64), nullable=True, index=True)
    edge_node_id = Column(String(64), ForeignKey("edge_nodes.id"), nullable=True)
    camera_id = Column(String(64), nullable=True)
    event_type = Column(String(128), nullable=True)
    object_type = Column(String(64), default="person")
    tracking_reference = Column(Integer, nullable=True)
    risk_level = Column(String(32), default="MEDIUM")
    risk_score = Column(Integer, default=50)
    location_reference = Column(String(256), nullable=True)
    evidence_hash = Column(String(64), nullable=True)
    sync_state = Column(String(32), default="SYNCED")   # PENDING_SYNC | SYNCED
    idempotency_key = Column(String(128), nullable=True, unique=True)
    # Legacy fields
    sector_id = Column(String(64), ForeignKey("sectors.id"), nullable=True)
    title = Column(String(256), nullable=False, default="Intelligence Record")
    description = Column(Text, nullable=True)
    threat_level = Column(String(32), default="MEDIUM")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    source = Column(String(128), default="RADAR_FENCE_CORRELATOR")

class EventCorrelation(Base):
    __tablename__ = "event_correlations"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    correlation_id = Column(String(64), index=True)
    event_ids = Column(JSON, default=list)
    confidence = Column(Float, default=0.9)
    pattern_type = Column(String(128), default="MULTI_SECTOR_MOVEMENT")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class TargetAssociation(Base):
    __tablename__ = "target_associations"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    global_track_id = Column(Integer, index=True)
    camera_id = Column(String(64), index=True)
    local_track_id = Column(Integer, index=True)
    class_name = Column(String(64), default="person")
    appearance_features = Column(JSON, default=list)
    first_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    active = Column(Boolean, default=True)

class SyncQueueItem(Base):
    __tablename__ = "sync_queue_items"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(64), nullable=False)
    action = Column(String(32), default="CREATE")
    payload = Column(JSON, default=dict)
    status = Column(String(32), default="PENDING")  # PENDING, SYNCED, FAILED
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Mission(Base):
    __tablename__ = "missions"

    id = Column(String(64), primary_key=True, default=lambda: f"MSN-{uuid.uuid4().hex[:6].upper()}")
    title = Column(String(256), nullable=False)
    priority = Column(String(32), default="HIGH")
    priority_score = Column(Integer, default=75)
    sector_id = Column(String(64), default="SEC-B")
    primary_event_id = Column(String(64), nullable=True)
    primary_target_id = Column(Integer, default=17)
    object_type = Column(String(64), default="person")
    assigned_operator = Column(String(128), nullable=True)
    response_type = Column(String(64), default="QRF_DEPLOYMENT")
    status = Column(String(32), default="DETECTED")
    notes = Column(Text, nullable=True)
    timeline = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
