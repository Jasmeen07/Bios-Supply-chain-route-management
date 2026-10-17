"""
inventory.py – Inventory shortage detection provider.
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.config import (
    INVENTORY_SAFETY_BUFFER_DAYS, INVENTORY_CONFIDENCE,
)
from backend.app.models import Inventory, Product


def get_inventory_status(db: Session, location_id: str, sku: str,
                          supplier_delay_days: float = 0.0,
                          replenishment_lead_days: Optional[float] = None) -> dict:
    """
    Returns shortage info for a given (location, SKU) pair.
    """
    inv = (
        db.query(Inventory)
        .filter(Inventory.location_id == location_id, Inventory.sku == sku)
        .first()
    )
    if not inv:
        return _no_data()

    product = db.query(Product).filter(Product.sku == sku).first()
    lead_days = replenishment_lead_days or (product.replenishment_lead_days if product else 5.0)

    effective_lead = lead_days + supplier_delay_days
    days_cover = inv.on_hand / inv.avg_daily_demand if inv.avg_daily_demand > 0 else 999.0

    # Shortage level
    if days_cover < effective_lead:
        level = "high"
    elif days_cover < effective_lead + INVENTORY_SAFETY_BUFFER_DAYS:
        level = "medium"
    else:
        level = "low"

    # Severity
    denom = effective_lead + INVENTORY_SAFETY_BUFFER_DAYS
    severity = max(0.0, min(1.0 - days_cover / denom, 1.0)) if denom > 0 else 0.0

    # Stockout date
    now = datetime.utcnow()
    stockout_date = (now + timedelta(days=days_cover)).date().isoformat()

    # Units short (assuming we need to cover until new stock arrives)
    demand_until_new_eta = inv.avg_daily_demand * effective_lead
    units_short = max(0.0, demand_until_new_eta - inv.on_hand)

    price = product.price if product else 0.0
    margin = product.margin if product else 0.0

    return {
        "location_id": location_id,
        "sku": sku,
        "on_hand": inv.on_hand,
        "avg_daily_demand": inv.avg_daily_demand,
        "days_cover": round(days_cover, 2),
        "effective_lead_days": round(effective_lead, 2),
        "level": level,
        "severity": round(severity, 4),
        "confidence": INVENTORY_CONFIDENCE,
        "stockout_date": stockout_date,
        "units_short": round(units_short, 1),
        "revenue_at_risk": round(units_short * price, 2),
        "margin_at_risk": round(units_short * price * margin, 2),
    }


def get_all_inventory_statuses(db: Session, supplier_delays: Optional[dict] = None) -> list:
    """Return shortage info for all (location, SKU) pairs."""
    delays = supplier_delays or {}
    results = []
    for inv in db.query(Inventory).all():
        sup_delay = delays.get(inv.location_id, 0.0)
        status = get_inventory_status(db, inv.location_id, inv.sku, sup_delay)
        if status.get("level") != "no_data":
            results.append(status)
    return results


def _no_data() -> dict:
    return {"level": "no_data", "severity": 0.0, "confidence": 0.0}
