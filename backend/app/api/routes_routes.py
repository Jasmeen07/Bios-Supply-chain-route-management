"""
routes_routes.py – GET /api/routes/compare
"""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Shipment, Disruption
from backend.app.schemas import RouteCompareOut, RouteOption, RouteDelta
from backend.app.routing.optimiser import compute_route_alternatives
from backend.app.providers.traffic import traffic_provider
from backend.app.analysis.scoring import risk_level

router = APIRouter()

PRIORITY_ALIAS_MAP = {
    "speed": "fastest",
    "fastest": "fastest",
    "balanced": "balanced",
    "cheapest": "cheapest",
    "cost": "cheapest",
    "safest": "safest",
    "eco": "safest",
}


@router.get("/routes/compare", response_model=RouteCompareOut)
def compare_routes(
    shipment_id: str = Query(..., description="ID of shipment to compare routes for"),
    priority: str = Query("balanced", description="Optimization priority: fastest, balanced, cheapest, safest"),
    db: Session = Depends(get_db),
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment {shipment_id} not found")

    try:
        current_lanes = json.loads(shipment.route_lane_ids_json or "[]")
    except Exception:
        current_lanes = []

    # Map priority aliases
    canonical_priority = PRIORITY_ALIAS_MAP.get(priority.lower(), "balanced")

    # Live lane risk scores from open disruptions
    open_disruptions = db.query(Disruption).filter(
        Disruption.status == "open", Disruption.entity_type == "lane"
    ).all()
    lane_risk_scores = {d.entity_id: d.severity for d in open_disruptions}

    # Live traffic ratios
    all_lanes = list(current_lanes)
    traffic_ratios = traffic_provider.get_all_ratios(all_lanes)

    comp = compute_route_alternatives(
        origin_id=shipment.origin_id,
        destination_id=shipment.destination_id,
        current_lane_ids=current_lanes,
        lane_risk_scores=lane_risk_scores,
        traffic_ratios=traffic_ratios,
        priority=canonical_priority,
    )

    current_opt = RouteOption(
        route_id="route_current",
        route_name="Current Route",
        lane_ids=comp["current"]["lane_ids"],
        distance_km=comp["current"].get("distance_km", 0.0),
        duration_h=comp["current"]["duration_h"],
        cost=comp["current"]["cost"],
        risk_score=comp["current"]["risk_score"],
        level=risk_level(comp["current"]["risk_score"]),
        geometry=comp["current"]["geometry"],
        label="Current Route",
    )

    alts = []
    labels = ["Recommended Alternative", "Second Alternative", "Third Alternative"]
    for i, a in enumerate(comp["alternatives"]):
        delta_obj = None
        if "delta" in a:
            delta_obj = RouteDelta(
                duration_h=a["delta"]["duration_h"],
                cost_pct=a["delta"]["cost_pct"],
                risk=a["delta"]["risk"],
            )
        alts.append(RouteOption(
            route_id=f"route_alt_{i+1}",
            route_name=labels[i] if i < len(labels) else f"Alternative {i + 1}",
            lane_ids=a["lane_ids"],
            distance_km=a.get("distance_km", 0.0),
            duration_h=a["duration_h"],
            cost=a["cost"],
            risk_score=a["risk_score"],
            level=risk_level(a["risk_score"]),
            geometry=a["geometry"],
            delta=delta_obj,
            rank=a.get("rank", i + 1),
            label=labels[i] if i < len(labels) else f"Alternative {i + 1}",
            utility=a.get("utility", 0.0),
        ))

    return RouteCompareOut(
        shipment_id=shipment_id,
        priority=canonical_priority,
        current=current_opt,
        alternatives=alts,
    )
