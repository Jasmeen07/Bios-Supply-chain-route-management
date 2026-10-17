"""
scoring.py – Risk score computation (0–100) and level classification.
"""
from backend.app.config import (
    REVENUE_EXPOSURE_CAP, RISK_SCORE_LOW_MAX, RISK_SCORE_MEDIUM_MAX
)


def compute_risk_score(severity: float, revenue_at_risk: float) -> float:
    """
    risk_score = 100 * severity * (0.4 + 0.6 * exposure)
    exposure = min(1, revenue_at_risk / exposure_cap)
    """
    exposure = min(1.0, revenue_at_risk / REVENUE_EXPOSURE_CAP)
    score = 100 * severity * (0.4 + 0.6 * exposure)
    return round(min(100.0, max(0.0, score)), 1)


def risk_level(score: float) -> str:
    if score > RISK_SCORE_MEDIUM_MAX:
        return "high"
    if score >= RISK_SCORE_LOW_MAX:
        return "medium"

    return "low"
