"""
suppliers.py – Supplier delivery performance analysis provider.
"""
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy.orm import Session

from backend.app.config import (
    SUPPLIER_RECENT_WINDOW_DAYS, SUPPLIER_BASELINE_WINDOW_DAYS,
    SUPPLIER_Z_MEDIUM, SUPPLIER_Z_HIGH, SUPPLIER_OTR_MEDIUM, SUPPLIER_OTR_HIGH,
    SUPPLIER_SEVERITY_DENOM, SUPPLIER_MIN_DELIVERIES,
)
from backend.app.models import SupplierDelivery, Supplier


def get_supplier_metrics(db: Session, supplier_id: str) -> dict:
    """
    Compute z-score of recent delay vs baseline, on-time rate, and severity.
    Returns a dict with keys: z_score, on_time_rate, severity, confidence,
    recent_mean_delay_h, baseline_mean_delay_h, baseline_std_h, n_recent, n_baseline,
    level, current_delay_days.
    """
    now = datetime.utcnow()
    recent_cutoff = now - timedelta(days=SUPPLIER_RECENT_WINDOW_DAYS)
    baseline_cutoff = now - timedelta(days=SUPPLIER_BASELINE_WINDOW_DAYS)

    all_deliveries = (
        db.query(SupplierDelivery)
        .filter(
            SupplierDelivery.supplier_id == supplier_id,
            SupplierDelivery.promised_at >= baseline_cutoff,
        )
        .all()
    )

    recent = [d for d in all_deliveries if d.promised_at >= recent_cutoff]
    baseline = [d for d in all_deliveries if d.promised_at < recent_cutoff]

    if not baseline:
        # Insufficient history
        return _default_metrics()

    baseline_delays = np.array([d.delay_hours for d in baseline])
    recent_delays = np.array([d.delay_hours for d in recent]) if recent else np.array([0.0])

    baseline_mean = float(np.mean(baseline_delays))
    baseline_std = float(np.std(baseline_delays)) or 1.0   # avoid div/0
    recent_mean = float(np.mean(recent_delays))

    z_score = (recent_mean - baseline_mean) / baseline_std

    # On-time rate: deliveries with delay <= 0
    all_recent = baseline + recent
    on_time = sum(1 for d in all_recent if d.delay_hours <= 0)
    on_time_rate = on_time / len(all_recent) if all_recent else 1.0

    # Severity
    severity = max(0.0, min(z_score / SUPPLIER_SEVERITY_DENOM, 1.0))
    if z_score < 0:
        severity = 0.0   # performing better than baseline

    # Confidence: grows with number of deliveries
    confidence = min(1.0, len(all_recent) / SUPPLIER_MIN_DELIVERIES)

    # Level
    if z_score >= SUPPLIER_Z_HIGH or on_time_rate < SUPPLIER_OTR_HIGH:
        level = "high"
    elif z_score >= SUPPLIER_Z_MEDIUM or on_time_rate < SUPPLIER_OTR_MEDIUM:
        level = "medium"
    else:
        level = "low"

    current_delay_days = max(0.0, recent_mean - baseline_mean) / 24

    return {
        "z_score": round(z_score, 3),
        "on_time_rate": round(on_time_rate, 3),
        "severity": round(severity, 4),
        "confidence": round(confidence, 3),
        "recent_mean_delay_h": round(recent_mean, 2),
        "baseline_mean_delay_h": round(baseline_mean, 2),
        "baseline_std_h": round(baseline_std, 2),
        "n_recent": len(recent),
        "n_baseline": len(baseline),
        "level": level,
        "current_delay_days": round(current_delay_days, 2),
    }


def _default_metrics() -> dict:
    return {
        "z_score": 0.0, "on_time_rate": 1.0, "severity": 0.0,
        "confidence": 0.0, "recent_mean_delay_h": 0.0, "baseline_mean_delay_h": 0.0,
        "baseline_std_h": 1.0, "n_recent": 0, "n_baseline": 0,
        "level": "low", "current_delay_days": 0.0,
    }


def get_all_supplier_metrics(db: Session) -> dict[str, dict]:
    suppliers = db.query(Supplier).all()
    return {s.id: get_supplier_metrics(db, s.id) for s in suppliers}
