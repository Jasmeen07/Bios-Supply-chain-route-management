"""
graph.py – loads the network from network.json and exposes a NetworkX DiGraph.
"""
import json
import os
import math
from typing import Optional
import networkx as nx

from backend.app.config import NETWORK_JSON_PATH, ROUTE_COST_PER_KM, ROUTE_FIXED_COST


_graph: Optional[nx.DiGraph] = None
_network_data: Optional[dict] = None


def load_network() -> dict:
    """Load network.json once and cache it."""
    global _network_data
    if _network_data is None:
        path = NETWORK_JSON_PATH
        if not os.path.exists(path):
            # Try relative to CWD variations
            alt = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "network.json")
            if os.path.exists(alt):
                path = alt
        with open(path, "r") as f:
            _network_data = json.load(f)
    return _network_data


def get_graph(lane_risk_scores: Optional[dict] = None,
              traffic_ratios: Optional[dict] = None) -> nx.DiGraph:
    """
    Build (or rebuild) a directed graph from network.json.
    Optionally accept risk scores per lane and traffic ratios per lane
    so the optimiser can use risk-adjusted edge weights.
    """
    data = load_network()
    G = nx.DiGraph()

    for loc in data["locations"]:
        G.add_node(loc["id"], **loc)

    for lane in data["lanes"]:
        lid = lane["id"]
        risk = (lane_risk_scores or {}).get(lid, 0.0)
        ratio = (traffic_ratios or {}).get(lid, 1.0)
        dur_s = lane["baseline_duration_s"] * ratio
        cost = lane["cost"]

        # Risk-adjusted weight: w = duration_s*(1+delay) + cost_w*cost + risk_w*risk*duration_s
        from backend.app.config import ROUTE_WEIGHT_COST, ROUTE_WEIGHT_RISK
        delay_factor = ratio - 1
        w = dur_s * (1 + delay_factor) + ROUTE_WEIGHT_COST * cost + ROUTE_WEIGHT_RISK * risk * dur_s

        G.add_edge(
            lane["from_id"], lane["to_id"],
            lane_id=lid,
            distance_km=lane["distance_km"],
            baseline_duration_s=lane["baseline_duration_s"],
            current_duration_s=dur_s,
            cost=cost,
            risk_score=risk,
            weight=w,
            geometry=lane["geometry"],
            approximate=lane.get("approximate", False),
        )

    return G


def get_lane_by_id(lane_id: str) -> Optional[dict]:
    data = load_network()
    for lane in data["lanes"]:
        if lane["id"] == lane_id:
            return lane
    return None


def get_location_by_id(loc_id: str) -> Optional[dict]:
    data = load_network()
    for loc in data["locations"]:
        if loc["id"] == loc_id:
            return loc
    return None


def lanes_for_node_pair(from_id: str, to_id: str) -> Optional[dict]:
    data = load_network()
    for lane in data["lanes"]:
        if lane["from_id"] == from_id and lane["to_id"] == to_id:
            return lane
    return None


def route_to_geometry(lane_ids: list) -> dict:
    """Merge lane geometries into a single GeoJSON LineString."""
    data = load_network()
    lane_map = {l["id"]: l for l in data["lanes"]}
    coords = []
    for lid in lane_ids:
        lane = lane_map.get(lid)
        if lane:
            geom = lane["geometry"]
            for pt in geom.get("coordinates", []):
                if not coords or pt != coords[-1]:
                    coords.append(pt)
    if not coords:
        return {"type": "LineString", "coordinates": []}
    return {"type": "LineString", "coordinates": coords}


def route_metrics(lane_ids: list) -> dict:
    """Return total duration_s, distance_km and cost for a list of lane IDs."""
    data = load_network()
    lane_map = {l["id"]: l for l in data["lanes"]}
    total_dur = 0.0
    total_dist = 0.0
    total_cost = 0.0
    for lid in lane_ids:
        lane = lane_map.get(lid)
        if lane:
            total_dur += lane["baseline_duration_s"]
            total_dist += lane["distance_km"]
            total_cost += lane["cost"]
    return {"duration_s": total_dur, "distance_km": total_dist, "cost": total_cost}
