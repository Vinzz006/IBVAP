import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database.database import SessionLocal
from backend.database.models import Mission, Event, Sector, EdgeNode, User
from backend.services.mission_service import MissionService, InvalidStateTransitionError
from backend.services.federation_service import FederationService

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_mission_lifecycle_valid_state_transitions(auth_headers):
    db = SessionLocal()
    # 1. Create mission (starts in DETECTED)
    m = MissionService.create_mission(db, {
        "title": "Perimeter Patrol Incident",
        "sector_id": "SEC-B",
        "priority": "HIGH"
    }, operator_username="test_operator")
    m_id = m["id"]
    assert m["status"] == "DETECTED"

    # 2. DETECTED -> ACKNOWLEDGED
    res = client.patch(f"/api/missions/{m_id}/status", json={"status": "ACKNOWLEDGED", "operator_username": "op1"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "ACKNOWLEDGED"

    # 3. ACKNOWLEDGED -> AWAITING_APPROVAL
    res = client.patch(f"/api/missions/{m_id}/status", json={"status": "AWAITING_APPROVAL"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "AWAITING_APPROVAL"

    # 4. AWAITING_APPROVAL -> APPROVED via approve endpoint
    res = client.post(f"/api/missions/{m_id}/approve", json={"operator_username": "commander", "notes": "Approved QRF"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "APPROVED"

    # 5. APPROVED -> DISPATCHED
    res = client.patch(f"/api/missions/{m_id}/status", json={"status": "DISPATCHED"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "DISPATCHED"

    # 6. DISPATCHED -> RESOLVED via resolve endpoint
    res = client.post(f"/api/missions/{m_id}/resolve", json={"resolution_type": "RESOLVED", "notes": "Sector clear"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

    # 7. Timeline has recorded each state transition
    res_tl = client.get(f"/api/missions/{m_id}/timeline", headers=auth_headers)
    assert res_tl.status_code == 200
    tl = res_tl.json()
    assert len(tl) >= 5
    db.close()

def test_mission_lifecycle_invalid_transition_returns_409(auth_headers):
    db = SessionLocal()
    m = MissionService.create_mission(db, {"title": "Test Mission 409", "sector_id": "SEC-A"}, operator_username="op")
    m_id = m["id"]

    # Invalid: cannot jump directly from DETECTED to RESOLVED
    res = client.patch(f"/api/missions/{m_id}/status", json={"status": "RESOLVED"}, headers=auth_headers)
    assert res.status_code == 409
    assert "Cannot transition mission" in res.json()["detail"]

    # Resolve mission properly
    MissionService.update_mission_status(db, m_id, "ACKNOWLEDGED")
    MissionService.update_mission_status(db, m_id, "AWAITING_APPROVAL")
    MissionService.update_mission_status(db, m_id, "APPROVED")
    MissionService.update_mission_status(db, m_id, "DISPATCHED")
    MissionService.update_mission_status(db, m_id, "RESOLVED")

    # Invalid: cannot approve an already resolved mission
    res_post_resolved = client.post(f"/api/missions/{m_id}/approve", json={"notes": "reopen"}, headers=auth_headers)
    assert res_post_resolved.status_code == 409
    db.close()

def test_mission_escalation_and_context(auth_headers):
    db = SessionLocal()
    m = MissionService.create_mission(db, {"title": "Escalation Test", "sector_id": "SEC-C"}, operator_username="op")
    m_id = m["id"]

    # Escalate mission
    res_esc = client.post(f"/api/missions/{m_id}/escalate", json={"target_level": "COMMAND", "reason": "Immediate breach"}, headers=auth_headers)
    assert res_esc.status_code == 200
    assert res_esc.json()["status"] == "ESCALATED"
    assert res_esc.json()["priority"] == "CRITICAL"

    # Check mission context & health
    res_ctx = client.get(f"/api/missions/{m_id}/context", headers=auth_headers)
    assert res_ctx.status_code == 200
    assert "sector" in res_ctx.json()

    res_hlth = client.get(f"/api/missions/{m_id}/health", headers=auth_headers)
    assert res_hlth.status_code == 200
    assert res_hlth.json()["status"] == "OPERATIONAL"
    db.close()

def test_federation_service_methods(auth_headers):
    # 1. Federated health
    res_hlth = client.get("/api/federation/health", headers=auth_headers)
    assert res_hlth.status_code == 200
    data = res_hlth.json()
    assert "summary" in data
    assert "sectors" in data

    # 2. Intelligence graph
    res_graph = client.get("/api/federation/graph", headers=auth_headers)
    assert res_graph.status_code == 200
    assert "nodes" in res_graph.json()
    assert "links" in res_graph.json()

    # 3. Correlations
    res_corr = client.get("/api/federation/correlations", headers=auth_headers)
    assert res_corr.status_code == 200
    assert "correlations" in res_corr.json()

    # 4. Decision priorities
    res_dec = client.get("/api/federation/decision", headers=auth_headers)
    assert res_dec.status_code == 200
    assert "rankings" in res_dec.json()

    # 5. Register edge node & heartbeat
    res_reg = client.post("/api/edge-nodes", json={"node_id": "EDGE-TEST-01", "sector_id": "SEC-A", "hostname": "edge-test"}, headers=auth_headers)
    assert res_reg.status_code == 200

    res_hb = client.post("/api/edge-nodes/EDGE-TEST-01/heartbeat", json={"cpu_usage": 22.5, "status": "ONLINE"}, headers=auth_headers)
    assert res_hb.status_code == 200
    assert res_hb.json()["status"] == "HEARTBEAT_ACKNOWLEDGED"

    # 6. Structured intelligence ingestion (with idempotency)
    intel_payload = {
        "event_id": "EVT-INTEL-TEST-01",
        "sector_id": "SEC-A",
        "camera_id": "CAM-01",
        "event_type": "Restricted Zone Intrusion",
        "tracking_reference": 99,
        "risk_level": "HIGH",
        "risk_score": 75,
        "idempotency_key": "IDEMP-KEY-TEST-01"
    }
    res_intel = client.post("/api/federation/intelligence", json=intel_payload, headers=auth_headers)
    assert res_intel.status_code == 200
    assert res_intel.json()["is_duplicate"] is False

    # Second submission with same idempotency key
    res_intel2 = client.post("/api/federation/intelligence", json=intel_payload, headers=auth_headers)
    assert res_intel2.status_code == 200
    assert res_intel2.json()["is_duplicate"] is True

def test_simulation_reset_endpoint(auth_headers):
    # Trigger simulation event
    client.post("/api/simulation/trigger-event", json={"event_type": "intrusion", "camera_id": "CAM-01"}, headers=auth_headers)

    # Call reset
    res = client.post("/api/simulation/reset", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "RESET_SUCCESS"
