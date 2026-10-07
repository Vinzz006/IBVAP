import os
from pathlib import Path
from backend.database.database import engine, Base, SessionLocal
from backend.database.models import User, Camera, Sector, EdgeNode, PrivacyPolicy
from backend.api.auth import hash_password
from backend.config import TEST_VIDEOS_DIR

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Seed Users
        if not db.query(User).filter(User.username == "admin").first():
            db.add(User(
                username="admin",
                password_hash=hash_password("admin123"),
                full_name="Senior Sector Commander",
                role="ADMIN"
            ))
        if not db.query(User).filter(User.username == "operator").first():
            db.add(User(
                username="operator",
                password_hash=hash_password("operator123"),
                full_name="Duty Officer P. Singh",
                role="OPERATOR"
            ))
        if not db.query(User).filter(User.username == "viewer").first():
            db.add(User(
                username="viewer",
                password_hash=hash_password("viewer123"),
                full_name="Tactical Observer",
                role="VIEWER"
            ))

        # 2. Seed Cameras
        cameras = [
            {
                "id": "CAM-01",
                "name": "Perimeter Cam #1 (Sector A - Border Fence)",
                "location": "Sector A - Highway 104 Perimeter",
                "stream_url": str(TEST_VIDEOS_DIR / "scenario_border_intrusion.mp4"),
                "zone_polygon": [[0.15, 0.45], [0.85, 0.45], [0.90, 0.95], [0.10, 0.95]]
            },
            {
                "id": "CAM-02",
                "name": "Thermal Cam #2 (Sector B - River Scrub)",
                "location": "Sector B - Riverine Basin & Fencing",
                "stream_url": str(TEST_VIDEOS_DIR / "scenario_night_movement.mp4"),
                "zone_polygon": [[0.20, 0.50], [0.80, 0.50], [0.85, 0.90], [0.15, 0.90]]
            },
            {
                "id": "CAM-03",
                "name": "Checkpoint Cam #3 (Sector C - Transit Gate)",
                "location": "Sector C - Transit Gate & Rail Spur",
                "stream_url": str(TEST_VIDEOS_DIR / "scenario_vehicle_checkpoint.mp4"),
                "zone_polygon": [[0.25, 0.40], [0.75, 0.40], [0.80, 0.85], [0.20, 0.85]]
            },
            {
                "id": "CAM-04",
                "name": "Patrol Cam #4 (Sector D - Valley Outpost)",
                "location": "Sector D - Mountain Ridge Pass",
                "stream_url": str(TEST_VIDEOS_DIR / "scenario_normal_patrol.mp4"),
                "zone_polygon": [[0.10, 0.35], [0.90, 0.35], [0.95, 0.90], [0.05, 0.90]]
            }
        ]

        for cam_data in cameras:
            cam = db.query(Camera).filter(Camera.id == cam_data["id"]).first()
            if not cam:
                db.add(Camera(**cam_data))
            else:
                cam.stream_url = cam_data["stream_url"]

        # 3. Seed Sectors
        sectors = [
            {"id": "SEC-A", "name": "Sector A (Highway 104 Perimeter)", "camera_id": "CAM-01", "terrain": "Open Highway Buffer", "region": "North Border Sector", "camera_count": 8, "sensor_count": 4},
            {"id": "SEC-B", "name": "Sector B (Riverine Basin & Fencing)", "camera_id": "CAM-02", "terrain": "Dense River Scrub & Virtual Fence", "region": "Riverine Sector", "camera_count": 12, "sensor_count": 6},
            {"id": "SEC-C", "name": "Sector C (Transit Gate & Rail Spur)", "camera_id": "CAM-03", "terrain": "Active Logistics Crossing", "region": "Transit Gate Sector", "camera_count": 10, "sensor_count": 5},
            {"id": "SEC-D", "name": "Sector D (Mountain Ridge Pass)", "camera_id": "CAM-04", "terrain": "Steep Valley Outpost", "region": "Highland Sector", "camera_count": 6, "sensor_count": 3}
        ]
        for sec in sectors:
            s = db.query(Sector).filter(Sector.id == sec["id"]).first()
            if not s:
                db.add(Sector(**sec))

        # 4. Seed Edge Nodes
        edge_nodes = [
            {"id": "EDGE-NODE-SECTOR-A", "sector_id": "SEC-A", "node_name": "Edge AI Node Alpha", "hostname": "edge-alpha-01", "ip_address": "10.0.1.51"},
            {"id": "EDGE-NODE-SECTOR-B", "sector_id": "SEC-B", "node_name": "Edge AI Node Bravo", "hostname": "edge-bravo-01", "ip_address": "10.0.1.52"},
            {"id": "EDGE-NODE-SECTOR-C", "sector_id": "SEC-C", "node_name": "Edge AI Node Charlie", "hostname": "edge-charlie-01", "ip_address": "10.0.1.53"},
            {"id": "EDGE-NODE-SECTOR-D", "sector_id": "SEC-D", "node_name": "Edge AI Node Delta", "hostname": "edge-delta-01", "ip_address": "10.0.1.54"}
        ]
        for node in edge_nodes:
            n = db.query(EdgeNode).filter(EdgeNode.id == node["id"]).first()
            if not n:
                db.add(EdgeNode(**node))

        # 5. Seed Privacy Policy
        if not db.query(PrivacyPolicy).first():
            db.add(PrivacyPolicy(evidence_retention_days=30, metadata_retention_days=90, audit_retention_days=365, masking_enabled=False))

        db.commit()
        print("Database seeded successfully with initial users, cameras, sectors, and edge nodes.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
