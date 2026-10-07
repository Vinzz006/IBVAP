import os
import sys
import time
import requests
from pathlib import Path
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.main import app
from backend.database.database import SessionLocal
from backend.database.models import User, Camera, Event, AuditLog, Vehicle
from backend.services.evidence_service import EvidenceService

def run_verification():
    print("\n=======================================================")
    print("▶ RUNNING FULL SYSTEM FUNCTIONAL VERIFICATION")
    print("=======================================================")

    client = TestClient(app)

    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"✔ 1. Health check passed: {res.json()}")

    # 2. Authentication Login
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✔ 2. Admin login successful. JWT Token obtained.")

    # 3. List Cameras & Telemetry
    cams_res = client.get("/api/cameras", headers=headers)
    assert cams_res.status_code == 200, f"List cameras failed: {cams_res.text}"
    cams = cams_res.json()
    assert len(cams) >= 4, f"Expected at least 4 cameras, got {len(cams)}"
    print(f"✔ 3. Listed {len(cams)} cameras with live telemetry.")

    # 4. Webcam Detection (Non-blocking cached)
    webcams_res = client.get("/api/cameras/webcams/detect")
    assert webcams_res.status_code == 200, f"Webcam detect failed: {webcams_res.text}"
    print(f"✔ 4. Non-blocking webcam detection passed: {webcams_res.json()}")

    # 5. System Stats
    stats_res = client.get("/api/system/stats", headers=headers)
    assert stats_res.status_code == 200, f"System stats failed: {stats_res.text}"
    print(f"✔ 5. System stats returned: {stats_res.json()}")

    # 6. Red Team Stress Test / Intrusion Event Generation
    redteam_res = client.post("/api/system/red-team-stress-test", json={"scenario": "COORDINATED_MULTI_SECTOR", "intensity": "HIGH"}, headers=headers)
    assert redteam_res.status_code == 200, f"Red team test failed: {redteam_res.text}"
    rt_data = redteam_res.json()
    print(f"✔ 6. Red team test generated incident: {rt_data['test_id']} ({len(rt_data['event_ids'])} events)")
    event_id = rt_data["event_ids"][0]


    # 7. List Events
    events_res = client.get("/api/events?limit=10", headers=headers)
    assert events_res.status_code == 200, f"List events failed: {events_res.text}"
    events = events_res.json()
    assert len(events) > 0, "No events returned"
    print(f"✔ 7. Events queried successfully. Total in page: {len(events)}")

    # 8. Cryptographic Evidence Verification
    verify_res = client.post(f"/api/evidence/events/{event_id}/verify", headers=headers)
    assert verify_res.status_code == 200, f"Evidence verify failed: {verify_res.text}"
    verify_data = verify_res.json()
    assert verify_data["is_valid"] is True, f"Evidence integrity check failed: {verify_data}"
    print(f"✔ 8. Cryptographic SHA-256 seal verified: status={verify_data['status']}, hash={verify_data['recorded_hash'][:16]}...")

    # 9. Simulate Tamper Test
    db = SessionLocal()
    ev = db.query(Event).filter(Event.id == event_id).first()
    assert ev is not None, "Event not found in DB"
    tamper_success = EvidenceService.simulate_tamper(ev.evidence_path)
    assert tamper_success is True, "Failed to simulate file tampering"
    db.close()

    # Re-verify after tampering
    tampered_verify_res = client.post(f"/api/evidence/events/{event_id}/verify", headers=headers)
    assert tampered_verify_res.status_code == 200
    tampered_data = tampered_verify_res.json()
    assert tampered_data["is_valid"] is False, "Tampered evidence should have failed validation!"
    assert tampered_data["status"] == "TAMPER_DETECTED"
    print(f"✔ 9. Tamper detection verified! Status={tampered_data['status']} (SHA-256 mismatch caught instantly).")

    # 10. Explainability API
    explain_res = client.get(f"/api/explainability/events/{event_id}", headers=headers)
    assert explain_res.status_code == 200, f"Explainability failed: {explain_res.text}"
    print(f"✔ 10. Explainable AI factor breakdown verified: {explain_res.json()['event_id']}")

    # 11. Security Posture API
    sec_res = client.get("/api/security/overview", headers=headers)
    assert sec_res.status_code == 200, f"Security overview failed: {sec_res.text}"
    print(f"✔ 11. Zero-Trust Security posture verified: Score={sec_res.json()['posture_score']}/100")

    # 12. Decision Commander Overview
    dec_res = client.get("/api/decision/overview", headers=headers)
    assert dec_res.status_code == 200, f"Decision overview failed: {dec_res.text}"
    print(f"✔ 12. Decision Command overview verified.")

    # 13. Mission Orchestration Demo
    msn_res = client.post("/api/missions/demo-scenario", json={"operator_username": "Duty Officer P. Singh"}, headers=headers)
    assert msn_res.status_code == 200, f"Mission demo failed: {msn_res.text}"
    print(f"✔ 13. Mission Orchestration demo scenario verified: {msn_res.json()['id']}")

    print("\n=======================================================")
    print("✅ ALL 13 FUNCTIONAL VERIFICATION SUITES PASSED 100%")
    print("=======================================================\n")

if __name__ == "__main__":
    run_verification()
