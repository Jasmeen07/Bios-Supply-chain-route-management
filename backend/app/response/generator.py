"""
generator.py – Response generator: produces all feasible candidate actions
for a disruption, evaluates them, ranks them, and attaches template explanations.
"""
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.config import (
    PRIORITY_WEIGHTS, DEFAULT_WEIGHTS, MAX_RECOMMENDATIONS_PER_DISRUPTION,
    EXPEDITE_COST_MULTIPLIER, EXPEDITE_TIME_REDUCTION,
    REBALANCE_MIN_SURPLUS_DAYS, ROUTE_K_ALTERNATIVES,
)
from backend.app.models import (
    Disruption, Recommendation, Shipment, Supplier, Inventory,
    Product, Location, Impact,
)
from backend.app.routing.optimiser import compute_route_alternatives
from backend.app.routing.graph import load_network


def generate_recommendations(
    db: Session,
    disruption: Disruption,
    priority: str = "balanced",
):
    """Generate, rank and persist recommendations for a disruption."""

    # Clear old recommendations
    disruption.recommendations.clear()
    db.flush()


    impact = disruption.impacts[0] if disruption.impacts else None
    candidates = []

    # ── MONITOR baseline (always present) ────────────────────────────────────
    candidates.append(_make_monitor(disruption, impact))

    # ── Route-based actions (traffic / weather on a lane) ─────────────────────
    if disruption.type in ("traffic", "weather"):
        candidates.extend(_reroute_candidates(db, disruption, impact))
        candidates.extend(_expedite_candidates(db, disruption, impact))

    # ── Supplier-delay actions ────────────────────────────────────────────────
    elif disruption.type == "supplier_delay":
        candidates.extend(_alternate_supplier_candidates(db, disruption, impact))
        candidates.extend(_expedite_candidates(db, disruption, impact))

    # ── Inventory-shortage actions ────────────────────────────────────────────
    elif disruption.type == "inventory":
        candidates.extend(_rebalance_candidates(db, disruption, impact))
        candidates.extend(_safety_stock_candidates(db, disruption, impact))
        candidates.extend(_expedite_candidates(db, disruption, impact))

    # ── Rank candidates ───────────────────────────────────────────────────────
    weights = PRIORITY_WEIGHTS.get(priority, DEFAULT_WEIGHTS)
    _rank_candidates(candidates, weights)

    # Keep top N + MONITOR
    monitor = [c for c in candidates if c["action_type"] == "monitor"]
    non_monitor = [c for c in candidates if c["action_type"] != "monitor"]
    top = non_monitor[:MAX_RECOMMENDATIONS_PER_DISRUPTION] + monitor[:1]

    for i, c in enumerate(top):
        r = Recommendation(
            id=f"r_{uuid.uuid4().hex[:8]}",
            disruption_id=disruption.id,
            action_type=c["action_type"],
            params_json=json.dumps(c.get("params", {})),
            delay_saved_h=c.get("delay_saved_h", 0.0),
            cost_delta=c.get("cost_delta", 0.0),
            cost_delta_pct=c.get("cost_delta_pct", 0.0),
            risk_reduction=c.get("risk_reduction", 0.0),
            utility=c.get("utility", 0.0),
            rank=i + 1,
            title=c["title"],
            explanation=c["explanation"],
            evidence_json=json.dumps(c.get("evidence", [])),
            status="proposed",
            feasible=c.get("feasible", True),
            confidence=c.get("confidence", 0.5),
        )
        db.add(r)
    db.flush()


def _rank_candidates(candidates: list, weights: dict):
    """Normalise metrics and compute utility score for each candidate."""
    delays = [c.get("delay_saved_h", 0) for c in candidates]
    costs = [c.get("cost_delta", 0) for c in candidates]
    risks = [c.get("risk_reduction", 0) for c in candidates]

    max_delay = max(delays, default=1) or 1
    max_risk = max(risks, default=1) or 1
    cost_range = max(costs, default=0) - min(costs, default=0) or 1

    for c in candidates:
        norm_time = max(0, c.get("delay_saved_h", 0)) / max_delay
        norm_cost = 1 - (c.get("cost_delta", 0) - min(costs, default=0)) / cost_range
        norm_risk = max(0, c.get("risk_reduction", 0)) / max_risk
        c["utility"] = (
            weights["time"] * norm_time
            + weights["cost"] * norm_cost
            + weights["risk"] * norm_risk
        )

    candidates.sort(key=lambda c: (-c["utility"], c["action_type"] == "monitor"))


def _make_monitor(disruption: Disruption, impact: Optional[Impact]) -> dict:
    rev = impact.revenue_at_risk if impact else 0
    delay = impact.extra_delay_h if impact else 0
    return {
        "action_type": "monitor",
        "title": "Monitor – no immediate action",
        "explanation": (
            f"Continue monitoring {disruption.entity_name}. "
            f"Current risk score: {disruption.risk_score:.0f} ({disruption.level}). "
            f"Projected extra delay: {delay:.1f} h. Revenue at risk: ₹{rev:,.0f}. "
            f"This option has zero cost change but accepts full delay and risk."
        ),
        "delay_saved_h": 0.0,
        "cost_delta": 0.0,
        "cost_delta_pct": 0.0,
        "risk_reduction": 0.0,
        "confidence": disruption.confidence,
        "feasible": True,
        "params": {},
        "evidence": json.loads(disruption.evidence_json or "[]"),
    }


def _reroute_candidates(db: Session, disruption: Disruption, impact: Optional[Impact]) -> list:
    candidates = []
    affected = json.loads(impact.affected_shipments_json) if impact else []

    network = load_network()
    lane_map = {l["id"]: l for l in network["lanes"]}
    loc_map = {l["id"]: l for l in network["locations"]}

    for ship_id in affected[:3]:   # limit to 3 shipments
        ship = db.query(Shipment).filter(Shipment.id == ship_id).first()
        if not ship:
            continue

        result = compute_route_alternatives(
            origin_id=ship.origin_id,
            destination_id=ship.destination_id,
            current_lane_ids=ship.route_lane_ids,
            lane_risk_scores={disruption.entity_id: disruption.severity},
        )

        for alt in result.get("alternatives", []):
            current = result["current"]
            delta_h = current["duration_h"] - alt["duration_h"]  # saved = positive
            delta_cost = alt["cost"] - current["cost"]
            delta_cost_pct = (delta_cost / current["cost"] * 100) if current["cost"] else 0
            risk_red = max(0, current["risk_score"] - alt["risk_score"])

            via_lids = alt["lane_ids"]
            via_names = []
            for lid in via_lids:
                lane = lane_map.get(lid)
                if lane:
                    name = loc_map.get(lane["to_id"], {}).get("name", lane["to_id"])
                    via_names.append(name)
            via_str = " → ".join(via_names[:3]) if via_names else "alternate route"

            candidates.append({
                "action_type": "reroute",
                "title": f"Reroute {ship_id} via {via_str[:40]}",
                "explanation": (
                    f"Reroute shipment {ship_id} to avoid the {disruption.type} disruption "
                    f"on {disruption.entity_name}. "
                    f"New route saves {delta_h:.1f} h, costs {delta_cost_pct:+.1f}%, "
                    f"and reduces risk score by {risk_red:.0f} points."
                ),
                "delay_saved_h": round(delta_h, 2),
                "cost_delta": round(delta_cost, 2),
                "cost_delta_pct": round(delta_cost_pct, 1),
                "risk_reduction": round(risk_red, 1),
                "confidence": disruption.confidence,
                "feasible": True,
                "params": {
                    "shipment_id": ship_id,
                    "new_lane_ids": alt["lane_ids"],
                },
                "evidence": json.loads(disruption.evidence_json or "[]"),
            })

    return candidates


def _alternate_supplier_candidates(db: Session, disruption: Disruption, impact: Optional[Impact]) -> list:
    candidates = []
    delayed_sup = db.query(Supplier).filter(Supplier.id == disruption.entity_id).first()
    if not delayed_sup:
        return candidates

    # Find shipments from this supplier
    affected = json.loads(impact.affected_shipments_json) if impact else []
    if not affected:
        return candidates

    ship = db.query(Shipment).filter(Shipment.id == affected[0]).first()
    if not ship:
        return candidates

    # Find other suppliers that can supply the same SKU
    all_suppliers = db.query(Supplier).filter(Supplier.id != delayed_sup.id).all()

    for alt_sup in all_suppliers[:3]:
        # Estimate lead time improvement
        lead_improvement_h = max(0, impact.extra_delay_h * 0.6) if impact else 0
        cost_premium = (1 - alt_sup.reliability) * 5000  # rough cost estimate

        candidates.append({
            "action_type": "alternate_supplier",
            "title": f"Switch to {alt_sup.name}",
            "explanation": (
                f"Switch from {delayed_sup.name} (currently delayed) to {alt_sup.name} "
                f"for shipment {affected[0]}. "
                f"Estimated lead time saved: {lead_improvement_h:.0f} h. "
                f"Supplier reliability: {alt_sup.reliability * 100:.0f}%. "
                f"Cost premium: ₹{cost_premium:,.0f}."
            ),
            "delay_saved_h": round(lead_improvement_h, 1),
            "cost_delta": round(cost_premium, 0),
            "cost_delta_pct": round(cost_premium / 100000 * 100, 1),
            "risk_reduction": round(disruption.risk_score * 0.5, 1),
            "confidence": min(0.8, alt_sup.reliability),
            "feasible": True,
            "params": {
                "shipment_id": affected[0],
                "new_supplier_id": alt_sup.id,
            },
            "evidence": json.loads(disruption.evidence_json or "[]"),
        })

    return candidates


def _expedite_candidates(db: Session, disruption: Disruption, impact: Optional[Impact]) -> list:
    affected = json.loads(impact.affected_shipments_json) if impact else []
    if not affected:
        return []

    ship = db.query(Shipment).filter(Shipment.id == affected[0]).first()
    if not ship:
        return []

    current_delay = impact.extra_delay_h if impact else 0
    saved_h = current_delay * EXPEDITE_TIME_REDUCTION

    # Cost estimate from route
    network = load_network()
    lane_map = {l["id"]: l for l in network["lanes"]}
    base_cost = sum(lane_map.get(lid, {}).get("cost", 0) for lid in ship.route_lane_ids)
    extra_cost = base_cost * (EXPEDITE_COST_MULTIPLIER - 1)

    return [{
        "action_type": "expedite",
        "title": f"Expedite {ship.id} (priority freight)",
        "explanation": (
            f"Upgrade shipment {ship.id} to priority freight to recover "
            f"{saved_h:.1f} h of the {current_delay:.1f} h disruption delay. "
            f"Estimated extra cost: ₹{extra_cost:,.0f} ({(EXPEDITE_COST_MULTIPLIER - 1) * 100:.0f}% premium)."
        ),
        "delay_saved_h": round(saved_h, 1),
        "cost_delta": round(extra_cost, 0),
        "cost_delta_pct": round((EXPEDITE_COST_MULTIPLIER - 1) * 100, 0),
        "risk_reduction": round(disruption.risk_score * 0.35, 1),
        "confidence": 0.75,
        "feasible": True,
        "params": {"shipment_id": ship.id, "mode": "priority_freight"},
        "evidence": json.loads(disruption.evidence_json or "[]"),
    }]


def _rebalance_candidates(db: Session, disruption: Disruption, impact: Optional[Impact]) -> list:
    parts = disruption.entity_id.split("::")
    if len(parts) != 2:
        return []
    short_loc_id, sku = parts

    # Find warehouses with surplus
    donor_invs = (
        db.query(Inventory)
        .filter(Inventory.sku == sku)
        .all()
    )
    candidates = []
    for inv in donor_invs:
        if inv.location_id == short_loc_id:
            continue
        loc = db.query(Location).filter(Location.id == inv.location_id).first()
        if not loc or loc.type != "warehouse":
            continue
        days_cover = inv.on_hand / inv.avg_daily_demand if inv.avg_daily_demand > 0 else 0
        if days_cover < REBALANCE_MIN_SURPLUS_DAYS:
            continue

        # Estimate transfer qty = half the surplus
        surplus_units = max(0, (days_cover - REBALANCE_MIN_SURPLUS_DAYS) * inv.avg_daily_demand)
        transfer_qty = surplus_units * 0.5

        short_loc = db.query(Location).filter(Location.id == short_loc_id).first()
        dest_name = short_loc.name if short_loc else short_loc_id

        candidates.append({
            "action_type": "rebalance",
            "title": f"Transfer {sku} from {loc.name} to {dest_name}",
            "explanation": (
                f"Transfer {transfer_qty:.0f} units of {sku} from {loc.name} "
                f"(currently {days_cover:.1f} days cover) to {dest_name}. "
                f"This avoids a stockout while a replenishment order arrives."
            ),
            "delay_saved_h": 0.0,
            "cost_delta": round(transfer_qty * 50, 0),  # ₹50 per unit transfer cost
            "cost_delta_pct": 0.0,
            "risk_reduction": round(disruption.risk_score * 0.6, 1),
            "confidence": 0.85,
            "feasible": True,
            "params": {
                "from_location_id": inv.location_id,
                "to_location_id": short_loc_id,
                "sku": sku,
                "qty": transfer_qty,
            },
            "evidence": json.loads(disruption.evidence_json or "[]"),
        })

    return candidates[:2]


def _safety_stock_candidates(db: Session, disruption: Disruption, impact: Optional[Impact]) -> list:
    parts = disruption.entity_id.split("::")
    if len(parts) != 2:
        return []
    loc_id, sku = parts

    prod = db.query(Product).filter(Product.sku == sku).first()
    if not prod:
        return []

    inv = db.query(Inventory).filter(
        Inventory.location_id == loc_id, Inventory.sku == sku
    ).first()
    if not inv:
        return []

    # Cost of holding extra 5 days of stock
    from backend.app.config import SAFETY_STOCK_HOLDING_COST_RATE
    extra_units = inv.avg_daily_demand * 5
    holding_cost = extra_units * prod.price * SAFETY_STOCK_HOLDING_COST_RATE * 30  # per month

    return [{
        "action_type": "increase_safety_stock",
        "title": f"Increase safety stock for {sku} at {loc_id}",
        "explanation": (
            f"Raise the safety stock level for {sku} at {loc_id} by 5 days of demand "
            f"({extra_units:.0f} units). Estimated monthly holding cost: ₹{holding_cost:,.0f}. "
            f"This protects against future supply disruptions."
        ),
        "delay_saved_h": 0.0,
        "cost_delta": round(holding_cost, 0),
        "cost_delta_pct": round(holding_cost / (prod.price * extra_units) * 100, 1),
        "risk_reduction": round(disruption.risk_score * 0.4, 1),
        "confidence": 0.90,
        "feasible": True,
        "params": {"location_id": loc_id, "sku": sku, "extra_days": 5},
        "evidence": json.loads(disruption.evidence_json or "[]"),
    }]
