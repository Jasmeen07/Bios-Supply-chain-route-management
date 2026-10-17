"""
routes_shipments.py – GET /api/shipments
"""
import json
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Shipment, Location, Supplier, Product, Disruption
from backend.app.schemas import ShipmentOut
from backend.app.analysis.scoring import risk_level

router = APIRouter()


@router.get("/shipments", response_model=List[ShipmentOut])
def list_shipments(db: Session = Depends(get_db)):
    shipments = db.query(Shipment).all()

    loc_map = {l.id: l.name for l in db.query(Location).all()}
    sup_map = {s.id: s.name for s in db.query(Supplier).all()}
    prod_map = {p.sku: p.name for p in db.query(Product).all()}

    # Build active lane & supplier risk scores
    open_disruptions = db.query(Disruption).filter(Disruption.status == "open").all()
    lane_risks = {d.entity_id: d.risk_score for d in open_disruptions if d.entity_type == "lane"}
    sup_risks = {d.entity_id: d.risk_score for d in open_disruptions if d.entity_type == "supplier"}

    result = []
    for s in shipments:
        try:
            lanes = json.loads(s.route_lane_ids_json or "[]")
        except Exception:
            lanes = []

        # Shipment risk is max of risks on its route lanes and supplier
        lane_scores = [lane_risks.get(lid, 0.0) for lid in lanes]
        sup_score = sup_risks.get(s.supplier_id, 0.0)
        max_risk = max([sup_score] + lane_scores) if (lane_scores or sup_score) else 0.0
        
        # Calculate delay hours between planned and current ETA
        delay_h = max(0.0, (s.current_eta - s.planned_eta).total_seconds() / 3600.0)

        result.append(ShipmentOut(
            id=s.id,
            supplier_id=s.supplier_id,
            origin_id=s.origin_id,
            destination_id=s.destination_id,
            sku=s.sku,
            qty=s.qty,
            route_lane_ids=lanes,
            status=s.status,
            planned_eta=s.planned_eta.isoformat() + "Z",
            current_eta=s.current_eta.isoformat() + "Z",
            origin_name=loc_map.get(s.origin_id, s.origin_id),
            destination_name=loc_map.get(s.destination_id, s.destination_id),
            supplier_name=sup_map.get(s.supplier_id, s.supplier_id),
            sku_name=prod_map.get(s.sku, s.sku),
            risk_score=round(max_risk, 1),
            risk_level=risk_level(max_risk),
            delay_hours=round(delay_h, 1),
            delay_h=round(delay_h, 1),
        ))

    return result
