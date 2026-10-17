"""
routes_disruptions.py – GET /api/disruptions and GET /api/disruptions/{id}
"""
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Disruption, Recommendation
from backend.app.schemas import (
    DisruptionOut, EntityRef, ImpactOut, EvidenceItem, RecommendationOut
)
from backend.app.api.routes_overview import _disruption_to_out, _rec_to_out

router = APIRouter()


@router.get("/disruptions", response_model=List[DisruptionOut])
def list_disruptions(
    status: Optional[str] = Query(None, description="Filter by status (open, resolved)"),
    type: Optional[str] = Query(None, description="Filter by type (weather, traffic, supplier_delay, inventory)"),
    level: Optional[str] = Query(None, description="Filter by risk level (low, medium, high)"),
    db: Session = Depends(get_db),
):
    query = db.query(Disruption)
    if status:
        query = query.filter(Disruption.status == status)
    if type:
        query = query.filter(Disruption.type == type)
    if level:
        query = query.filter(Disruption.level == level)

    disruptions = query.order_by(Disruption.detected_at.desc()).all()
    
    result = []
    for d in disruptions:
        out = _disruption_to_out(d)
        # Attach recommendations for this disruption if available
        recs = (
            db.query(Recommendation)
            .filter(Recommendation.disruption_id == d.id)
            .order_by(Recommendation.rank.asc())
            .all()
        )
        out.recommendations = [_rec_to_out(r) for r in recs]
        result.append(out)

    return result


@router.get("/disruptions/{disruption_id}", response_model=DisruptionOut)
def get_disruption(disruption_id: str, db: Session = Depends(get_db)):
    d = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    if not d:
        raise HTTPException(status_code=404, detail=f"Disruption {disruption_id} not found")

    out = _disruption_to_out(d)
    recs = (
        db.query(Recommendation)
        .filter(Recommendation.disruption_id == d.id)
        .order_by(Recommendation.rank.asc())
        .all()
    )
    out.recommendations = [_rec_to_out(r) for r in recs]
    out.history = [
        {"ts": out.time_ago or "Recently", "event": "Detection", "description": f"{out.issue_title or 'Disruption'} triggered risk threshold"},
        {"ts": out.time_ago or "Recently", "event": "Impact Computed", "description": out.impact_summary or "Supply chain impact assessed"},
    ]
    if recs:
        out.history.append({
            "ts": out.time_ago or "Recently",
            "event": "Recommendation",
            "description": f"Generated mitigation plan: {recs[0].title}"
        })
    return out
