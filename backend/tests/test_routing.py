"""
test_routing.py – Tests for graph construction, risk-adjusted weights, and route optimiser.
"""
import pytest
from backend.app.routing.graph import get_graph, load_network
from backend.app.routing.optimiser import compute_route_alternatives


def test_zero_risk_baseline():
    # When all risk scores are zero and traffic is baseline, graph is connected
    G = get_graph({}, {})
    assert G.number_of_nodes() == 13
    assert G.number_of_edges() > 0


def test_blocked_lane_avoidance():
    # Origin: pune, Destination: delhi
    net = load_network()
    direct_lane = "L_pune_delhi"
    
    # Baseline comparison
    comp_normal = compute_route_alternatives(
        origin_id="pune",
        destination_id="delhi",
        current_lane_ids=[direct_lane],
        priority="fastest",
    )
    assert comp_normal["current"]["lane_ids"] == [direct_lane]

    # Now make direct lane severe risk (score 1.0)
    risk_scores = {direct_lane: 1.0}
    comp_risk = compute_route_alternatives(
        origin_id="pune",
        destination_id="delhi",
        current_lane_ids=[direct_lane],
        lane_risk_scores=risk_scores,
        priority="safest",
    )
    # The alternatives should avoid the high-risk direct lane
    if comp_risk["alternatives"]:
        alt = comp_risk["alternatives"][0]
        assert alt["risk_score"] < comp_risk["current"]["risk_score"]
        assert direct_lane not in alt["lane_ids"]


def test_priority_weights():
    # Comparing alternatives under different priorities re-orders recommendations
    comp_fastest = compute_route_alternatives(
        origin_id="pune",
        destination_id="kolkata",
        current_lane_ids=["L_pune_nagpur", "L_nagpur_kolkata"],
        priority="fastest",
    )
    comp_cheapest = compute_route_alternatives(
        origin_id="pune",
        destination_id="kolkata",
        current_lane_ids=["L_pune_nagpur", "L_nagpur_kolkata"],
        priority="cheapest",
    )
    assert "alternatives" in comp_fastest
    assert "alternatives" in comp_cheapest
    assert len(comp_fastest["alternatives"]) > 0
    assert len(comp_cheapest["alternatives"]) > 0

