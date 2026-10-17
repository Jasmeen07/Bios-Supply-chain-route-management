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

        num_shipments = rng.randint(12, 15)
        for i in range(num_shipments):
            sup_loc = rng.choice(supplier_locs)
            sup_id = f"SUP-{sup_loc['id'].upper()}"
            avail_skus = SUPPLIER_SKUS.get(sup_loc["id"], [s["sku"] for s in SKUS])
            sku_id = rng.choice(avail_skus)

            dest_id = rng.choice(store_ids)
            route = find_route(sup_loc["id"], dest_id)

            # Calculate route duration
            total_dur_s = sum(
                lane_map[lid]["baseline_duration_s"]
                for lid in route if lid in lane_map
            )

            planned_eta = now + timedelta(hours=rng.uniform(12, 120))
            # Some shipments slightly delayed
            current_eta = planned_eta + timedelta(hours=rng.uniform(-2, 8))

            db.add(Shipment(
                id=f"S-{100 + i}",
                supplier_id=sup_id,
                origin_id=sup_loc["id"],
                destination_id=dest_id,
                sku=sku_id,
                qty=rng.randint(100, 1000),
                route_lane_ids_json=json.dumps(route),
                status="in_transit",
                planned_eta=planned_eta,
                current_eta=current_eta,
            ))

        db.add(AuditLog(event="seed", payload_json=json.dumps({"seed": SEED, "ts": now.isoformat()})))
        db.commit()
        print(f"Seeded database: {len(network['locations'])} locations, {len(network['lanes'])} lanes, "
              f"{len(SKUS)} SKUs, 4 suppliers, {num_shipments} shipments.")

    finally:
        if own_db:
            db.close()



if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--reset", action="store_true", help="Drop and recreate all tables")
    args = p.parse_args()
    seed_all(reset=args.reset)
