"""
routes_network.py – GET /api/network
"""
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Disruption
from backend.app.schemas import NetworkOut, LocationOut, LaneOut
from backend.app.routing.graph import load_network
from backend.app.providers.traffic import traffic_provider, ratio_to_severity
from backend.app.analysis.scoring import risk_level

router = APIRouter()


@router.get("/network", response_model=NetworkOut)
def get_network(db: Session = Depends(get_db)):
    data = load_network()

    # Build lane risk map from open disruptions
    lane_risk_map: dict[str, float] = {}
    for d in db.query(Disruption).filter(
        Disruption.status == "open", Disruption.entity_type == "lane"
    ).all():
        lane_risk_map[d.entity_id] = d.risk_score

    # Get current traffic ratios
    all_lane_ids = [l["id"] for l in data["lanes"]]
    ratios = traffic_provider.get_all_ratios(all_lane_ids)

    loc_map = {loc["id"]: loc["name"] for loc in data["locations"]}
    locations = [LocationOut(**loc) for loc in data["locations"]]
    lanes = []
    for lane in data["lanes"]:
        lid = lane["id"]
        risk_score = lane_risk_map.get(lid, 0.0)
        level = risk_level(risk_score)
        ratio = ratios.get(lid, 1.0)
        current_dur = lane["baseline_duration_s"] * ratio

        lanes.append(LaneOut(
            id=lid,
            from_id=lane["from_id"],
            to_id=lane["to_id"],
            from_name=loc_map.get(lane["from_id"], lane["from_id"]),
            to_name=loc_map.get(lane["to_id"], lane["to_id"]),
            distance_km=lane["distance_km"],
            baseline_duration_s=lane["baseline_duration_s"],
            cost=lane["cost"],
            geometry=lane["geometry"],
            approximate=lane.get("approximate", False),
            risk_score=round(risk_score, 1),
            risk_level=level,
            level=level,
            current_duration_s=round(current_dur, 1),
        ))

    return NetworkOut(locations=locations, lanes=lanes)

