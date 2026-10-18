"""
seed.py – populates the database with synthetic but realistic demo data.
Fixed random seed for determinism. Run once before starting the API.
"""
import json
import os
import random
import sys
from datetime import datetime, timedelta

# Allow running as a script from any CWD
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.app.config import SEED, NETWORK_JSON_PATH
from backend.app.db import engine, SessionLocal
from backend.app.models import (
    Base, Location, Lane, Supplier, Product, Inventory,
    Shipment, SupplierDelivery, AuditLog
)

rng = random.Random(SEED)


def _load_network():
    with open(NETWORK_JSON_PATH) as f:
        return json.load(f)


SKUS = [
    {"sku": "SKU-ELEC", "name": "Consumer Electronics", "price": 8500.0,  "margin": 0.18, "replenishment_lead_days": 7},
    {"sku": "SKU-FASH", "name": "Fashion Apparel",       "price": 2200.0,  "margin": 0.35, "replenishment_lead_days": 5},
    {"sku": "SKU-PHMA", "name": "Pharma Supplies",       "price": 1500.0,  "margin": 0.22, "replenishment_lead_days": 3},
    {"sku": "SKU-AUTO", "name": "Auto Parts",             "price": 4800.0,  "margin": 0.15, "replenishment_lead_days": 8},
    {"sku": "SKU-FOOD", "name": "Packaged Food",          "price": 350.0,   "margin": 0.25, "replenishment_lead_days": 2},
    {"sku": "SKU-CHEM", "name": "Industrial Chemicals",   "price": 6200.0,  "margin": 0.12, "replenishment_lead_days": 6},
    {"sku": "SKU-CONS", "name": "Consumer Goods",         "price": 950.0,   "margin": 0.30, "replenishment_lead_days": 4},
    {"sku": "SKU-FURN", "name": "Furniture",              "price": 12000.0, "margin": 0.20, "replenishment_lead_days": 10},
]

SUPPLIER_NAMES = {
    "ludhiana": "Ludhiana Textiles & Auto Pvt Ltd",
    "pune":     "Pune Engineering Works Ltd",
    "surat":    "Surat Chemical & Pharma Co",
    "chennai":  "Chennai Electronics Hub Ltd",
}

# Supplier-to-SKU capability mapping
SUPPLIER_SKUS = {
    "ludhiana": ["SKU-FASH", "SKU-AUTO", "SKU-FURN"],
    "pune":     ["SKU-AUTO", "SKU-ELEC", "SKU-CONS"],
    "surat":    ["SKU-CHEM", "SKU-PHMA", "SKU-FOOD"],
    "chennai":  ["SKU-ELEC", "SKU-PHMA", "SKU-CONS"],
}

SUPPLIER_RELIABILITY = {
    "ludhiana": 0.92,
    "pune":     0.78,   # slightly unreliable for demo
    "surat":    0.95,
    "chennai":  0.88,
}


def seed_all(reset: bool = False, db_session = None):
    """Create all tables and insert seed data."""
    rng.seed(SEED)
    random.seed(SEED)
    if reset:
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)

    db = db_session if db_session is not None else SessionLocal()
    own_db = (db_session is None)
    try:
        # Skip if already seeded and not reset
        if not reset and db.query(Location).count() > 0:
            return


        network = _load_network()

        # ── Locations ─────────────────────────────────────────────────────────
        for loc in network["locations"]:
            db.merge(Location(
                id=loc["id"],
                name=loc["name"],
                type=loc["type"],
                lat=loc["lat"],
                lng=loc["lng"],
            ))

        # ── Lanes ─────────────────────────────────────────────────────────────
        for lane in network["lanes"]:
            db.merge(Lane(
                id=lane["id"],
                from_id=lane["from_id"],
                to_id=lane["to_id"],
                distance_km=lane["distance_km"],
                baseline_duration_s=lane["baseline_duration_s"],
                cost=lane["cost"],
                geometry_json=json.dumps(lane["geometry"]),
                approximate=lane.get("approximate", False),
            ))

        # ── Products ──────────────────────────────────────────────────────────
        for sku in SKUS:
            db.merge(Product(**sku))

        # ── Suppliers ─────────────────────────────────────────────────────────
        supplier_locs = [l for l in network["locations"] if l["type"] == "supplier"]
        for loc in supplier_locs:
            db.merge(Supplier(
                id=f"SUP-{loc['id'].upper()}",
                name=SUPPLIER_NAMES.get(loc["id"], loc["name"]),
                location_id=loc["id"],
                base_lead_time_days=rng.uniform(3, 7),
                reliability=SUPPLIER_RELIABILITY.get(loc["id"], 0.90),
            ))

        # ── Inventory ─────────────────────────────────────────────────────────
        warehouse_ids = [l["id"] for l in network["locations"] if l["type"] == "warehouse"]
        store_ids = [l["id"] for l in network["locations"] if l["type"] == "store"]

        for loc_id in warehouse_ids + store_ids:
            for sku in SKUS:
                avg_demand = rng.uniform(10, 80) if loc_id in warehouse_ids else rng.uniform(5, 30)
                # Ensure healthy baseline cover above replenishment lead time + buffer
                lead = sku.get("replenishment_lead_days", 5)
                days_cover = lead + 3.0 + rng.uniform(4, 12)
                db.add(Inventory(
                    location_id=loc_id,
                    sku=sku["sku"],
                    on_hand=round(avg_demand * days_cover),
                    avg_daily_demand=round(avg_demand, 2),
                ))

        # ── Supplier delivery history (60 days) ───────────────────────────────
        now = datetime.utcnow()
        for loc in supplier_locs:
            sup_id = f"SUP-{loc['id'].upper()}"
            rel = SUPPLIER_RELIABILITY.get(loc["id"], 0.90)

            for d in range(60):
                promised = now - timedelta(days=60 - d) + timedelta(hours=rng.uniform(0, 24))
                # Realistic baseline delivery distribution (mostly on-time)
                if rng.random() > rel:
                    delay_h = rng.uniform(2, 10)
                else:
                    delay_h = rng.uniform(-6, 1)

                delivered = promised + timedelta(hours=delay_h)
                db.add(SupplierDelivery(
                    supplier_id=sup_id,
                    promised_at=promised,
                    delivered_at=delivered,
                    delay_hours=round(delay_h, 1),
                ))


        # ── Shipments (12-15) ─────────────────────────────────────────────────
        hub_ids = [l["id"] for l in network["locations"] if l["type"] == "warehouse"]
        lane_map = {l["id"]: l for l in network["lanes"]}

        def find_route(from_id: str, to_id: str) -> list:
            """Simple route: find direct lane or go via a hub."""
            direct = f"L_{from_id}_{to_id}"
            if direct in lane_map:
                return [direct]
            # Find a hub that connects
            for hub in hub_ids:
                l1 = f"L_{from_id}_{hub}"
                l2 = f"L_{hub}_{to_id}"
                if l1 in lane_map and l2 in lane_map:
                    return [l1, l2]
            return [f"L_{from_id}_{to_id}"]  # fallback (may not exist)

        # Canonical shipments mapping 1-to-1 with contracts/scenarios.yaml corridors
        CANONICAL_SHIPMENTS = [
            {
                "id": "S-101",
                "supplier_id": "SUP-LUDHIANA",
                "origin_id": "ludhiana",
                "destination_id": "delhi",
                "sku": "SKU-FASH",
                "qty": 900,
                "route": ["L_ludhiana_delhi"],
                "status": "in_transit",
                "delay_h": 1.0,
            },
            {
                "id": "S-102",
                "supplier_id": "SUP-PUNE",
                "origin_id": "nagpur",
                "destination_id": "hyderabad",
                "sku": "SKU-AUTO",
                "qty": 600,
                "route": ["L_nagpur_hyderabad"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-103",
                "supplier_id": "SUP-CHENNAI",
                "origin_id": "bengaluru",
                "destination_id": "chennai",
                "sku": "SKU-ELEC",
                "qty": 750,
                "route": ["L_bengaluru_chennai"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-104",
                "supplier_id": "SUP-PUNE",
                "origin_id": "pune",
                "destination_id": "delhi",
                "sku": "SKU-ELEC",
                "qty": 450,
                "route": ["L_pune_delhi"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-105",
                "supplier_id": "SUP-SURAT",
                "origin_id": "surat",
                "destination_id": "delhi",
                "sku": "SKU-CHEM",
                "qty": 400,
                "route": ["L_surat_delhi"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-106",
                "supplier_id": "SUP-PUNE",
                "origin_id": "pune",
                "destination_id": "mumbai",
                "sku": "SKU-AUTO",
                "qty": 1200,
                "route": ["L_pune_mumbai"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-107",
                "supplier_id": "SUP-LUDHIANA",
                "origin_id": "delhi",
                "destination_id": "lucknow",
                "sku": "SKU-FOOD",
                "qty": 850,
                "route": ["L_delhi_lucknow"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-108",
                "supplier_id": "SUP-PUNE",
                "origin_id": "delhi",
                "destination_id": "jaipur",
                "sku": "SKU-CONS",
                "qty": 650,
                "route": ["L_delhi_jaipur"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-109",
                "supplier_id": "SUP-CHENNAI",
                "origin_id": "chennai",
                "destination_id": "hyderabad",
                "sku": "SKU-PHMA",
                "qty": 500,
                "route": ["L_chennai_delhi", "L_delhi_hyderabad"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-110",
                "supplier_id": "SUP-SURAT",
                "origin_id": "surat",
                "destination_id": "mumbai",
                "sku": "SKU-CHEM",
                "qty": 420,
                "route": ["L_surat_delhi", "L_delhi_mumbai"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
            {
                "id": "S-111",
                "supplier_id": "SUP-PUNE",
                "origin_id": "pune",
                "destination_id": "bengaluru",
                "sku": "SKU-PHMA",
                "qty": 550,
                "route": ["L_pune_bengaluru"],
                "status": "in_transit",
                "delay_h": 0.0,
            },
        ]

        for s_def in CANONICAL_SHIPMENTS:
            planned_eta = now + timedelta(hours=36)
            current_eta = planned_eta + timedelta(hours=s_def["delay_h"])

            db.add(Shipment(
                id=s_def["id"],
                supplier_id=s_def["supplier_id"],
                origin_id=s_def["origin_id"],
                destination_id=s_def["destination_id"],
                sku=s_def["sku"],
                qty=s_def["qty"],
                route_lane_ids_json=json.dumps(s_def["route"]),
                status=s_def["status"],
                planned_eta=planned_eta,
                current_eta=current_eta,
            ))

        db.add(AuditLog(event="seed", payload_json=json.dumps({"seed": SEED, "ts": now.isoformat()})))
        db.commit()
        print(f"Seeded database: {len(network['locations'])} locations, {len(network['lanes'])} lanes, "
              f"{len(SKUS)} SKUs, 4 suppliers, {len(CANONICAL_SHIPMENTS)} shipments.")

    finally:
        if own_db:
            db.close()



if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--reset", action="store_true", help="Drop and recreate all tables")
    args = p.parse_args()
    seed_all(reset=args.reset)
