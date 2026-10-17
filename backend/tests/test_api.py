"""
test_api.py – End-to-end integration tests for all FastAPI REST endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db import engine, Base, SessionLocal
from scripts.seed import seed_all


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_all(reset=True, db_session=db)
    db.close()
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"
    assert "version" in data


def test_overview_endpoint(client):
    res = client.get("/api/overview")
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "risk_by_cause" in data
    assert "top_risky_lanes" in data
    assert "recent_disruptions" in data
    assert "top_recommendations" in data
    assert "network_status" in data


def test_network_endpoint(client):
    res = client.get("/api/network")
    assert res.status_code == 200
    data = res.json()
    assert "locations" in data
    assert "lanes" in data
    assert len(data["locations"]) == 13
    assert len(data["lanes"]) == 66


def test_shipments_endpoint(client):
    res = client.get("/api/shipments")
    assert res.status_code == 200
    shipments = res.json()
    assert isinstance(shipments, list)
    assert len(shipments) >= 12
    s = shipments[0]
    assert "id" in s
    assert "origin_name" in s
    assert "destination_name" in s
    assert "supplier_name" in s
    assert "status" in s


def test_suppliers_endpoint(client):
    res = client.get("/api/suppliers")
    assert res.status_code == 200
    suppliers = res.json()
    assert len(suppliers) == 4
    sup = suppliers[0]
    assert "name" in sup
    assert "reliability" in sup
    assert "on_time_rate" in sup


def test_route_compare_endpoint(client):
    res = client.get("/api/routes/compare?shipment_id=S-100&priority=balanced")
    assert res.status_code == 200
    data = res.json()
    assert data["shipment_id"] == "S-100"
    assert "current" in data
    assert "alternatives" in data
    assert "duration_h" in data["current"]


def test_simulate_and_approve_flow(client):
    # 1. Inject a scenario
    sim_res = client.post("/api/simulate", json={"scenario_id": "SCN_02"})
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["scenario_id"] == "SCN_02"

    # 2. Check disruption created
    disruptions = client.get("/api/disruptions").json()
    assert len(disruptions) > 0
    did = disruptions[0]["id"]

    # 3. Disruption detail endpoint
    d_res = client.get(f"/api/disruptions/{did}")
    assert d_res.status_code == 200
    detail = d_res.json()
    assert detail["id"] == did
    assert "evidence" in detail
    assert "impact" in detail

    # 4. Check recommendations generated
    recs = client.get(f"/api/recommendations?disruption_id={did}").json()
    assert len(recs) > 0
    rec_id = recs[0]["id"]

    # 5. Approve recommendation
    app_res = client.post(f"/api/recommendations/{rec_id}/approve")
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data["applied"] is True
    assert app_data["after_risk_score"] <= app_data["before_risk_score"]

    # 6. Idempotent check (second click on approve returns success without error)
    app_res2 = client.post(f"/api/recommendations/{rec_id}/approve")
    assert app_res2.status_code == 200
    assert app_res2.json()["applied"] is True

    # 7. Reset simulation
    reset_res = client.post("/api/simulate/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "success"
