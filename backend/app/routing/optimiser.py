"""
optimiser.py – k-shortest-path route finder and route comparison builder.
"""
from typing import Optional
import networkx as nx

from backend.app.routing.graph import (
    get_graph, get_lane_by_id, route_to_geometry, route_metrics, load_network
)
from backend.app.config import (
    ROUTE_K_ALTERNATIVES, PRIORITY_WEIGHTS, DEFAULT_WEIGHTS
)


def _path_to_lane_ids(G: nx.DiGraph, path: list) -> list:
    """Convert a list of node IDs into a list of lane IDs."""
    lane_ids = []
    for i in range(len(path) - 1):
        edge_data = G.get_edge_data(path[i], path[i + 1])
        if edge_data:
            lane_ids.append(edge_data["lane_id"])
    return lane_ids


def _path_risk_score(lane_ids: list, lane_risk_scores: dict) -> float:
    if not lane_ids:
        return 0.0
    scores = [lane_risk_scores.get(lid, 0.0) for lid in lane_ids]
    return sum(scores) / len(scores) * 100


def compute_route_alternatives(
    origin_id: str,
    destination_id: str,
    current_lane_ids: list,
    lane_risk_scores: Optional[dict] = None,
    traffic_ratios: Optional[dict] = None,
    priority: str = "balanced",
    k: int = ROUTE_K_ALTERNATIVES,
) -> dict:
    """
    Return current route metrics + up to k alternative routes.
    """
    risk_scores = lane_risk_scores or {}
    ratios = traffic_ratios or {}

    G = get_graph(risk_scores, ratios)

    # Current route metrics
    net_data = load_network()
    lane_map = {l["id"]: l for l in net_data["lanes"]}

    def compute_option(lane_ids: list) -> dict:
        dur_s = sum(
            lane_map[lid]["baseline_duration_s"] * ratios.get(lid, 1.0)
            for lid in lane_ids if lid in lane_map
        )
        cost = sum(lane_map[lid]["cost"] for lid in lane_ids if lid in lane_map)
        risk = _path_risk_score(lane_ids, risk_scores)
        geom = route_to_geometry(lane_ids)
        return {
            "lane_ids": lane_ids,
            "duration_h": round(dur_s / 3600, 2),
            "cost": round(cost, 2),
            "risk_score": round(risk, 1),
            "geometry": geom,
        }

    current = compute_option(current_lane_ids)

    # Find k alternative paths
    alternatives = []
    try:
        paths = list(nx.shortest_simple_paths(G, origin_id, destination_id, weight="weight"))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        paths = []

    weights = PRIORITY_WEIGHTS.get(priority, DEFAULT_WEIGHTS)

    for path in paths[:k + 5]:  # check a few extra to skip the current one
        lane_ids = _path_to_lane_ids(G, path)
        if lane_ids == current_lane_ids:
            continue

        opt = compute_option(lane_ids)
        delta_dur_h = opt["duration_h"] - current["duration_h"]
        delta_cost_pct = (
            ((opt["cost"] - current["cost"]) / current["cost"] * 100) if current["cost"] else 0.0
        )
        delta_risk = opt["risk_score"] - current["risk_score"]
        opt["delta"] = {
            "duration_h": round(delta_dur_h, 2),
            "cost_pct": round(delta_cost_pct, 1),
            "risk": round(delta_risk, 1),
        }
        alternatives.append(opt)
        if len(alternatives) >= k:
            break

    # Rank alternatives by utility
    if alternatives:
        max_delay = max(abs(a["delta"]["duration_h"]) for a in alternatives) or 1
        max_cost = max(abs(a["delta"]["cost_pct"]) for a in alternatives) or 1
        max_risk = max(abs(a["delta"]["risk"]) for a in alternatives) or 1

        for alt in alternatives:
            norm_time = max(0, -alt["delta"]["duration_h"]) / max_delay
            norm_cost = max(0, -alt["delta"]["cost_pct"]) / max_cost
            norm_risk = max(0, -alt["delta"]["risk"]) / max_risk
            alt["utility"] = (
                weights["time"] * norm_time
                + weights["cost"] * norm_cost
                + weights["risk"] * norm_risk
            )

        alternatives.sort(key=lambda a: -a.get("utility", 0))
        for i, alt in enumerate(alternatives):
            alt["rank"] = i + 1
            # Remove internal utility key
            alt.pop("utility", None)

    return {
        "current": current,
        "alternatives": alternatives,
    }
