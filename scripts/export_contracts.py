"""
export_contracts.py – Generates contracts/openapi.yaml and contracts/fixtures/*.json
directly from the live FastAPI app and TestClient.
"""
import json
import yaml
import os
import sys
from pathlib import Path

# Allow running as a script from any CWD
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient

from backend.app.main import app

from backend.app.db import engine, Base, SessionLocal
from scripts.seed import seed_all

def export():
    # 1. Initialize tables and seed
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()

    root = Path(__file__).resolve().parent.parent
    contracts_dir = root / "contracts"
    fixtures_dir = contracts_dir / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    # 2. Export openapi.yaml
    openapi_schema = app.openapi()
    with open(contracts_dir / "openapi.yaml", "w", encoding="utf-8") as f:
        yaml.dump(openapi_schema, f, sort_keys=False)
    print("Exported contracts/openapi.yaml")

    # 3. Export fixtures using TestClient
    with TestClient(app) as client:
        # Overview
        res = client.get("/api/overview")
        if res.status_code == 200:
            with open(fixtures_dir / "overview.json", "w", encoding="utf-8") as f:
                json.dump(res.json(), f, indent=2)
            print("Exported overview.json")

        # Network
        res = client.get("/api/network")
        if res.status_code == 200:
            with open(fixtures_dir / "network.json", "w", encoding="utf-8") as f:
                json.dump(res.json(), f, indent=2)
            print("Exported network.json")

        # Shipments
        res = client.get("/api/shipments")
        shipments = res.json()
        with open(fixtures_dir / "shipments.json", "w", encoding="utf-8") as f:
            json.dump(shipments, f, indent=2)
        print("Exported shipments.json")

        # Suppliers
        res = client.get("/api/suppliers")
        with open(fixtures_dir / "suppliers.json", "w", encoding="utf-8") as f:
            json.dump(res.json(), f, indent=2)
        print("Exported suppliers.json")

        # Disruptions
        res = client.get("/api/disruptions")
        disruptions = res.json()
        with open(fixtures_dir / "disruptions.json", "w", encoding="utf-8") as f:
            json.dump(disruptions, f, indent=2)
        print("Exported disruptions.json")

        # Disruption detail
        if disruptions:
            did = disruptions[0]["id"]
            res = client.get(f"/api/disruptions/{did}")
            with open(fixtures_dir / "disruption_detail.json", "w", encoding="utf-8") as f:
                json.dump(res.json(), f, indent=2)
            print("Exported disruption_detail.json")

        # Route compare
        if shipments:
            sid = shipments[0]["id"]
            res = client.get(f"/api/routes/compare?shipment_id={sid}&priority=balanced")
            with open(fixtures_dir / "route_compare.json", "w", encoding="utf-8") as f:
                json.dump(res.json(), f, indent=2)
            print("Exported route_compare.json")

        # Simulate scenario SCN_02
        res = client.post("/api/simulate", json={"scenario_id": "SCN_02"})
        sim_data = res.json()
        with open(fixtures_dir / "simulate_result.json", "w", encoding="utf-8") as f:
            json.dump(sim_data, f, indent=2)
        print("Exported simulate_result.json")

        # Recommendations & Approve
        res = client.get("/api/recommendations")
        recs = res.json()
        if recs:
            rec_id = recs[0]["id"]
            res = client.post(f"/api/recommendations/{rec_id}/approve")
            with open(fixtures_dir / "approve_result.json", "w", encoding="utf-8") as f:
                json.dump(res.json(), f, indent=2)
            print("Exported approve_result.json")

        # Reset simulation back to clean seed
        client.post("/api/simulate/reset")
        print("Reset back to clean baseline state.")

if __name__ == "__main__":
    export()
