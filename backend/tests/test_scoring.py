"""
test_scoring.py – Tests for impact formulas, risk scoring, and level classifications.
"""
import pytest
from backend.app.analysis.scoring import compute_risk_score, risk_level
from backend.app.config import REVENUE_EXPOSURE_CAP, RISK_SCORE_LOW_MAX, RISK_SCORE_MEDIUM_MAX


def test_risk_score_formula_hand_calculated():
    # Case 1: Zero revenue exposure
    # severity = 0.5, revenue = 0 -> exposure = 0 -> score = 100 * 0.5 * 0.4 = 20.0
    score = compute_risk_score(severity=0.5, revenue_at_risk=0.0)
    level = risk_level(score)
    assert score == 20.0
    assert level == "low"

    # Case 2: Half revenue exposure
    # exposure_cap = 10,000,000 -> rev = 5,000,000 -> exposure = 0.5
    # score = 100 * 0.8 * (0.4 + 0.6 * 0.5) = 100 * 0.8 * 0.7 = 56.0
    score = compute_risk_score(severity=0.8, revenue_at_risk=5_000_000.0)
    level = risk_level(score)
    assert score == 56.0
    assert level == "medium"

    # Case 3: Full revenue exposure (capped)
    # rev = 20,000,000 -> exposure = 1.0
    # score = 100 * 0.9 * (0.4 + 0.6 * 1.0) = 100 * 0.9 * 1.0 = 90.0
    score = compute_risk_score(severity=0.9, revenue_at_risk=20_000_000.0)
    level = risk_level(score)
    assert score == 90.0
    assert level == "high"



def test_risk_level_boundaries():
    assert risk_level(0.0) == "low"
    assert risk_level(RISK_SCORE_LOW_MAX - 0.1) == "low"
    assert risk_level(RISK_SCORE_LOW_MAX) == "medium"
    assert risk_level(RISK_SCORE_MEDIUM_MAX) == "medium"
    assert risk_level(RISK_SCORE_MEDIUM_MAX + 0.1) == "high"
    assert risk_level(100.0) == "high"
