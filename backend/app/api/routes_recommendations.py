"""
routes_recommendations.py – GET /api/recommendations and POST /api/recommendations/{id}/approve
"""
import json
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Recommendation, Disruption, Shipment, Inventory, AuditLog
from backend.app.schemas import RecommendationOut, ApproveResult
from backend.app.api.routes_overview import _rec_to_out
from backend.app.analysis.scoring import risk_level
from backend.app import ws

router = APIRouter()


@router.get("/recommendations", response_model=List[RecommendationOut])
def list_recommendations(
    disruption_id: Optional[str] = Query(None, description="Filter by disruption ID"),
    db: Session = Depends(get_db),
):
    query = db.query(Recommendation)
    if disruption_id:
        query = query.filter(Recommendation.disruption_id == disruption_id)
    recs = query.order_by(Recommendation.rank.asc()).all()
    return [_rec_to_out(r) for r in recs]


@router.post("/recommendations/{recommendation_id}/approve", response_model=ApproveResult)
async def approve_recommendation(recommendation_id: str, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recommendation {recommendation_id} not found")

    disruption = db.query(Disruption).filter(Disruption.id == rec.disruption_id).first()
    if not disruption:
        raise HTTPException(status_code=404, detail=f"Disruption {rec.disruption_id} not found")

    # Idempotent check: if already approved, return result without error
    if rec.status == "approved":
        return ApproveResult(
            recommendation_id=rec.id,
            disruption_id=rec.disruption_id,
            action_type=rec.action_type,
            before_risk_score=disruption.risk_score,
            after_risk_score=disruption.risk_score,
            message="Recommendation was already approved earlier (idempotent).",
            applied=True,
        )

    before_score = disruption.risk_score
    try:
        params = json.loads(rec.params_json or "{}")
    except Exception:
        params = {}

    # Apply the action
    action = rec.action_type.lower()
    if action == "reroute":
        shipment_id = params.get("shipment_id")
        new_lanes = params.get("new_route_lane_ids", [])
        if shipment_id and new_lanes:
            shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
            if shipment:
                shipment.route_lane_ids_json = json.dumps(new_lanes)
                if rec.delay_saved_h > 0:
                    shipment.current_eta = max(
                        shipment.planned_eta,
                        shipment.current_eta - timedelta(hours=rec.delay_saved_h)
                    )
                db.add(shipment)

    elif action == "alternate_supplier":
        shipment_id = params.get("shipment_id")
        new_supplier_id = params.get("new_supplier_id")
        if shipment_id and new_supplier_id:
            shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
            if shipment:
                shipment.supplier_id = new_supplier_id
                db.add(shipment)

    elif action == "expedite":
        shipment_id = params.get("shipment_id")
        if shipment_id:
            shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
            if shipment and rec.delay_saved_h > 0:
                shipment.current_eta = max(
                    shipment.planned_eta,
                    shipment.current_eta - timedelta(hours=rec.delay_saved_h)
                )
                db.add(shipment)

    elif action == "rebalance":
        from_loc = params.get("from_location_id")
        to_loc = params.get("to_location_id")
        sku = params.get("sku")
        qty = params.get("qty", 0)
        if from_loc and to_loc and sku and qty:
            inv_from = db.query(Inventory).filter(
                Inventory.location_id == from_loc, Inventory.sku == sku
            ).first()
            inv_to = db.query(Inventory).filter(
                Inventory.location_id == to_loc, Inventory.sku == sku
            ).first()
            if inv_from and inv_to and inv_from.on_hand >= qty:
                inv_from.on_hand -= qty
                inv_to.on_hand += qty
                db.add(inv_from)
                db.add(inv_to)

    elif action == "increase_safety_stock":
        loc_id = params.get("location_id")
        sku = params.get("sku")
        units = params.get("units", 0)
        if loc_id and sku and units:
            inv = db.query(Inventory).filter(
                Inventory.location_id == loc_id, Inventory.sku == sku
            ).first()
            if inv:
                inv.on_hand += units
                db.add(inv)

    # Calculate after risk score
    after_score = max(0.0, round(before_score - rec.risk_reduction, 1))
    disruption.risk_score = after_score
    disruption.level = risk_level(after_score)
    if after_score < 25.0:
        disruption.status = "resolved"
        disruption.resolved_at = datetime.utcnow()

    # Mark recommendation approved
    rec.status = "approved"
    db.add(rec)
    db.add(disruption)

    # Log to audit_log
    audit = AuditLog(
        event="plan_applied",
        payload_json=json.dumps({
            "recommendation_id": rec.id,
            "disruption_id": disruption.id,
            "action_type": rec.action_type,
            "before_risk_score": before_score,
            "after_risk_score": after_score,
            "params": params,
        })
    )
    db.add(audit)
    db.commit()

    # Broadcast websocket event
    await ws.broadcast({
        "event": "plan_applied",
        "ts": datetime.utcnow().isoformat() + "Z",
        "data": {
            "recommendation_id": rec.id,
            "disruption_id": disruption.id,
            "action_type": rec.action_type,
            "before_risk_score": before_score,
            "after_risk_score": after_score,
        }
    })

    return ApproveResult(
        success=True,
        recommendation_id=rec.id,
        disruption_id=disruption.id,
        action_type=rec.action_type,
        before_risk_score=before_score,
        after_risk_score=after_score,
        message=f"Action '{rec.title}' applied successfully. Risk score dropped from {before_score} to {after_score}.",
        applied_at=datetime.utcnow().isoformat() + "Z",
        applied=True,
    )
