"""
routes_suppliers.py – GET /api/suppliers
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Supplier, Location, Disruption
from backend.app.schemas import SupplierOut
from backend.app.providers.suppliers import get_supplier_metrics

router = APIRouter()


@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).all()
    loc_map = {l.id: l.name for l in db.query(Location).all()}

    open_disruptions = db.query(Disruption).filter(
        Disruption.status == "open", Disruption.entity_type == "supplier"
    ).all()
    disruption_map = {d.entity_id: d for d in open_disruptions}

    result = []
    for sup in suppliers:
        metrics = get_supplier_metrics(db, sup.id)
        d = disruption_map.get(sup.id)
        risk_score = d.risk_score if d else (1.0 - sup.reliability) * 40.0

        status = "normal"
        if metrics["level"] == "high" or (d and d.level == "high"):
            status = "critical"
        elif metrics["level"] == "medium" or (d and d.level == "medium"):
            status = "delayed"

        result.append(SupplierOut(
            id=sup.id,
            name=sup.name,
            location_id=sup.location_id,
            location_name=loc_map.get(sup.location_id, sup.location_id),
            base_lead_time_days=sup.base_lead_time_days,
            reliability=round(sup.reliability, 3),
            reliability_score=round(sup.reliability, 3),
            active_disruptions_count=1 if d else 0,
            current_delay_days=round(metrics.get("mean_delay_days", 0.0), 1),
            on_time_rate=round(metrics.get("on_time_rate", sup.reliability), 3),
            status=status,
            risk_score=round(risk_score, 1),
            tier=1 if sup.reliability >= 0.9 else (2 if sup.reliability >= 0.8 else 3),
        ))

    return result
