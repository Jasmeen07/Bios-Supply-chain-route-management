"""
impact.py – Impact analysis: affected shipments, delay, stockout, revenue at risk.
"""
import json
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.config import REVENUE_EXPOSURE_CAP
from backend.app.models import Disruption, Impact, Shipment, Inventory, Product, Supplier, Location
from backend.app.routing.graph import load_network


def compute_impact(db: Session, disruption: Disruption):
    """
    Compute and persist the Impact for a disruption.
    Replaces any existing impact record.
    """
    affected_shipments = []

    extra_delay_h = 0.0
    stockout_date: Optional[str] = None
    units_short = 0.0
    revenue_at_risk = 0.0
    margin_at_risk = 0.0

    if disruption.type in ("traffic", "weather"):
        lane_id = disruption.entity_id
        result = _lane_impact(db, lane_id, disruption.severity, disruption.type)
        affected_shipments = result["affected_shipments"]
        extra_delay_h = result["extra_delay_h"]

    elif disruption.type == "supplier_delay":
        supplier_id = disruption.entity_id
        result = _supplier_impact(db, supplier_id, disruption.severity)
        affected_shipments = result["affected_shipments"]
        extra_delay_h = result["extra_delay_h"]
        units_short = result["units_short"]
        revenue_at_risk = result["revenue_at_risk"]
        margin_at_risk = result["margin_at_risk"]
        stockout_date = result.get("stockout_date")

    elif disruption.type == "inventory":
        # entity_id format: "location_id::sku"
        parts = disruption.entity_id.split("::")
        if len(parts) == 2:
            result = _inventory_impact(db, parts[0], parts[1])
            units_short = result["units_short"]
            revenue_at_risk = result["revenue_at_risk"]
            margin_at_risk = result["margin_at_risk"]
            stockout_date = result.get("stockout_date")
            affected_shipments = result.get("affected_shipments", [])

    # Compute revenue_at_risk for lane disruptions too (from affected shipments)
    if disruption.type in ("traffic", "weather") and affected_shipments:
        for sid in affected_shipments:
            ship = db.query(Shipment).filter(Shipment.id == sid).first()
            if ship:
                prod = db.query(Product).filter(Product.sku == ship.sku).first()
                if prod:
                    # Estimate units at risk based on delay
                    daily_demand = _get_daily_demand(db, ship.destination_id, ship.sku)
                    u_short = daily_demand * (extra_delay_h / 24)
                    revenue_at_risk += u_short * prod.price
                    margin_at_risk += u_short * prod.price * prod.margin
                    units_short += u_short

    # Update disruption risk_score with real exposure
    exposure = min(1.0, revenue_at_risk / REVENUE_EXPOSURE_CAP)
    disruption.risk_score = round(100 * disruption.severity * (0.4 + 0.6 * exposure), 1)
    _update_level(disruption)
    db.add(disruption)

    if disruption.impacts:
        impact = disruption.impacts[0]
        impact.affected_shipments_json = json.dumps(affected_shipments)
        impact.extra_delay_h = round(extra_delay_h, 2)
        impact.stockout_date = stockout_date
        impact.units_short = round(units_short, 1)
        impact.revenue_at_risk = round(revenue_at_risk, 2)
        impact.margin_at_risk = round(margin_at_risk, 2)
    else:
        impact = Impact(
            disruption_id=disruption.id,
            affected_shipments_json=json.dumps(affected_shipments),
            extra_delay_h=round(extra_delay_h, 2),
            stockout_date=stockout_date,
            units_short=round(units_short, 1),
            revenue_at_risk=round(revenue_at_risk, 2),
            margin_at_risk=round(margin_at_risk, 2),
        )
        db.add(impact)
    db.flush()



def _update_level(d: Disruption):
    from backend.app.config import RISK_SCORE_LOW_MAX, RISK_SCORE_MEDIUM_MAX
    if d.risk_score > RISK_SCORE_MEDIUM_MAX:
        d.level = "high"
    elif d.risk_score > RISK_SCORE_LOW_MAX:
        d.level = "medium"
    else:
        d.level = "low"


def _lane_impact(db: Session, lane_id: str, severity: float, d_type: str) -> dict:
    """Find shipments using this lane and compute delay."""
    network = load_network()
    lane_map = {l["id"]: l for l in network["lanes"]}
    lane = lane_map.get(lane_id)
    if not lane:
        return {"affected_shipments": [], "extra_delay_h": 0.0}

    baseline_h = lane["baseline_duration_s"] / 3600
    if d_type == "weather":
        delay_factor = 1 + severity   # weather slows travel
        extra_h = baseline_h * (delay_factor - 1)
    else:  # traffic
        delay_factor = 1 + severity * 0.8  # traffic ratio derived from severity
        extra_h = baseline_h * (delay_factor - 1)

    affected = []
    from_id = lane.get("from_id")
    to_id = lane.get("to_id")
    reverse_lane_id = f"L_{to_id}_{from_id}" if from_id and to_id else ""

    for ship in db.query(Shipment).filter(Shipment.status == "in_transit").all():
        if (lane_id in ship.route_lane_ids or 
            (reverse_lane_id and reverse_lane_id in ship.route_lane_ids) or
            (from_id and to_id and ship.origin_id == from_id and ship.destination_id == to_id) or
            (from_id and to_id and ship.origin_id == to_id and ship.destination_id == from_id)):
            affected.append(ship.id)
            # Update ETA
            ship.current_eta = ship.current_eta + timedelta(hours=extra_h)
            db.add(ship)

    # Ensure a shipment exists for this corridor if none was active
    if not affected and from_id and to_id:
        now = datetime.utcnow()
        new_sid = f"S-SIM-{lane_id.replace('L_', '')[:12].upper()}"
        existing = db.query(Shipment).filter(Shipment.id == new_sid).first()
        if not existing:
            sku = "SKU-ELEC"
            if "pune" in (from_id, to_id) and "mumbai" in (from_id, to_id):
                sku = "SKU-AUTO"
            elif "surat" in (from_id, to_id):
                sku = "SKU-CHEM"
            elif "ludhiana" in (from_id, to_id):
                sku = "SKU-FASH"
            elif "lucknow" in (from_id, to_id):
                sku = "SKU-FOOD"
            elif "bengaluru" in (from_id, to_id) and "pune" in (from_id, to_id):
                sku = "SKU-PHMA"

            sup_id = "SUP-PUNE"
            if "ludhiana" in (from_id, to_id): sup_id = "SUP-LUDHIANA"
            elif "surat" in (from_id, to_id): sup_id = "SUP-SURAT"
            elif "chennai" in (from_id, to_id): sup_id = "SUP-CHENNAI"

            new_shipment = Shipment(
                id=new_sid,
                supplier_id=sup_id,
                origin_id=from_id,
                destination_id=to_id,
                sku=sku,
                qty=500,
                route_lane_ids_json=json.dumps([lane_id]),
                status="in_transit",
                planned_eta=now + timedelta(hours=36),
                current_eta=now + timedelta(hours=36 + extra_h),
            )
            db.add(new_shipment)
            db.flush()
            affected.append(new_sid)
        else:
            affected.append(existing.id)

    return {"affected_shipments": affected, "extra_delay_h": round(extra_h, 2)}


def _supplier_impact(db: Session, supplier_id: str, severity: float) -> dict:
    """Find shipments from this supplier and estimate delay + revenue at risk."""
    metrics_delay_h = severity * 96  # severity 1.0 → up to 4 days delay
    affected = []
    units_short = 0.0
    revenue_at_risk = 0.0
    margin_at_risk = 0.0
    earliest_stockout = None

    for ship in db.query(Shipment).filter(
        Shipment.supplier_id == supplier_id,
        Shipment.status == "in_transit"
    ).all():
        affected.append(ship.id)
        ship.current_eta = ship.current_eta + timedelta(hours=metrics_delay_h)
        db.add(ship)

        prod = db.query(Product).filter(Product.sku == ship.sku).first()
        if prod:
            daily_demand = _get_daily_demand(db, ship.destination_id, ship.sku)
            u_short = daily_demand * (metrics_delay_h / 24)
            units_short += u_short
            revenue_at_risk += u_short * prod.price
            margin_at_risk += u_short * prod.price * prod.margin

            # Estimate stockout
            inv = db.query(Inventory).filter(
                Inventory.location_id == ship.destination_id,
                Inventory.sku == ship.sku
            ).first()
            if inv and inv.avg_daily_demand > 0:
                days_cover = inv.on_hand / inv.avg_daily_demand
                sd = (datetime.utcnow() + timedelta(days=days_cover)).date().isoformat()
                if earliest_stockout is None or sd < earliest_stockout:
                    earliest_stockout = sd

    return {
        "affected_shipments": affected,
        "extra_delay_h": round(metrics_delay_h, 2),
        "units_short": round(units_short, 1),
        "revenue_at_risk": round(revenue_at_risk, 2),
        "margin_at_risk": round(margin_at_risk, 2),
        "stockout_date": earliest_stockout,
    }


def _inventory_impact(db: Session, location_id: str, sku: str) -> dict:
    inv = db.query(Inventory).filter(
        Inventory.location_id == location_id, Inventory.sku == sku
    ).first()
    if not inv:
        return {"units_short": 0, "revenue_at_risk": 0, "margin_at_risk": 0}

    prod = db.query(Product).filter(Product.sku == sku).first()
    lead_days = prod.replenishment_lead_days if prod else 5.0

    days_cover = inv.on_hand / inv.avg_daily_demand if inv.avg_daily_demand > 0 else 999.0
    stockout = (datetime.utcnow() + timedelta(days=days_cover)).date().isoformat()
    demand_until = inv.avg_daily_demand * lead_days
    units_short = max(0.0, demand_until - inv.on_hand)

    price = prod.price if prod else 0.0
    margin = prod.margin if prod else 0.0

    # Find shipments heading to this location with this SKU
    affected = [
        s.id for s in db.query(Shipment).filter(
            Shipment.destination_id == location_id,
            Shipment.sku == sku,
            Shipment.status == "in_transit",
        ).all()
    ]

    return {
        "units_short": round(units_short, 1),
        "revenue_at_risk": round(units_short * price, 2),
        "margin_at_risk": round(units_short * price * margin, 2),
        "stockout_date": stockout,
        "affected_shipments": affected,
    }


def _get_daily_demand(db: Session, location_id: str, sku: str) -> float:
    inv = db.query(Inventory).filter(
        Inventory.location_id == location_id, Inventory.sku == sku
    ).first()
    return inv.avg_daily_demand if inv else 10.0
