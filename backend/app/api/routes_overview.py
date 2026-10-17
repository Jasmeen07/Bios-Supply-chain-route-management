"""
routes_overview.py – GET /api/health and GET /api/overview
"""
import json
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Disruption, Recommendation, Impact, Location, Lane
from backend.app.schemas import (
    HealthOut, OverviewOut, KpiCards, RiskByCause, RiskyLane,
    DisruptionOut, RecommendationOut, EntityRef, ImpactOut, EvidenceItem
)
from backend.app.config import SEED
from backend.app.routing.graph import load_network

router = APIRouter()


@router.get("/health", response_model=HealthOut)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {e}"
    return HealthOut(status="ok", db=db_status, seed=SEED)


@router.get("/overview", response_model=OverviewOut)
def overview(db: Session = Depends(get_db)):
    open_disruptions = db.query(Disruption).filter(Disruption.status == "open").all()

    # KPIs
    high_risk = [d for d in open_disruptions if d.level == "high"]
    all_impacts = db.query(Impact).all()
    total_revenue = sum(i.revenue_at_risk for i in all_impacts)
    all_delays = [i.extra_delay_h for i in all_impacts if i.extra_delay_h > 0]
    avg_delay = sum(all_delays) / len(all_delays) if all_delays else 0.0

    # Affected shipments (unique count)
    affected_ship_ids = set()
    for imp in all_impacts:
        try:
            ids = json.loads(imp.affected_shipments_json or "[]")
            affected_ship_ids.update(ids)
        except Exception:
            pass

    # On-time delivery rate estimate from deliveries table
    from backend.app.models import SupplierDelivery
    deliveries = db.query(SupplierDelivery).all()
    on_time_count = sum(1 for d in deliveries if d.delay_hours <= 0)
    on_time_rate = round((on_time_count / len(deliveries) * 100), 1) if deliveries else 91.5

    kpis = KpiCards(
        active_disruptions=len(open_disruptions),
        high_risk_shipments=len(affected_ship_ids),
        revenue_at_risk=round(total_revenue, 2),
        avg_delay_h=round(avg_delay, 1),
        total_active_risks=len(open_disruptions),
        high_severity_count=len(high_risk),
        total_shipments_at_risk=len(affected_ship_ids),
        total_revenue_at_risk=round(total_revenue, 2),
        on_time_network_rate=on_time_rate,
    )

    # Risk by cause
    cause_counts = {"weather": 0, "traffic": 0, "supplier_delay": 0, "inventory": 0}
    for d in open_disruptions:
        if d.type in cause_counts:
            cause_counts[d.type] += 1
    risk_by_cause = RiskByCause(
        weather=cause_counts["weather"],
        traffic=cause_counts["traffic"],
        supplier_delay=cause_counts["supplier_delay"],
        inventory=cause_counts["inventory"],
        inventory_shortage=cause_counts["inventory"],
    )
    active_risks_by_cause = {
        "weather": cause_counts["weather"],
        "traffic": cause_counts["traffic"],
        "supplier_delay": cause_counts["supplier_delay"],
        "inventory_shortage": cause_counts["inventory"],
        "geopolitical": 0,
    }

    # Top risky lanes
    network = load_network()
    lane_map = {l["id"]: l for l in network["lanes"]}
    loc_map = {l["id"]: l for l in network["locations"]}

    lane_risks: dict[str, float] = {}
    for d in open_disruptions:
        if d.entity_type == "lane":
            lane_risks[d.entity_id] = d.risk_score

    risky_lanes = []
    for lid, score in sorted(lane_risks.items(), key=lambda x: -x[1])[:5]:
        lane = lane_map.get(lid)
        if lane:
            from_name = loc_map.get(lane["from_id"], {}).get("name", lane["from_id"])
            to_name = loc_map.get(lane["to_id"], {}).get("name", lane["to_id"])
            level = "high" if score > 65 else ("medium" if score > 35 else "low")
            risky_lanes.append(RiskyLane(
                lane_id=lid,
                name=f"{from_name} → {to_name}",
                risk_score=round(score, 1),
                level=level,
            ))

    # Regional risk levels
    regional_risk = [
        {"region": "North India", "level": "medium", "score": 45},
        {"region": "West India", "level": "high" if any("mumbai" in str(d.entity_id).lower() or "pune" in str(d.entity_id).lower() for d in open_disruptions) else "medium", "score": 68},
        {"region": "South India", "level": "medium", "score": 38},
        {"region": "Central India", "level": "low", "score": 25},
    ]

    # Recent disruptions (last 5)
    recent = sorted(open_disruptions, key=lambda d: d.detected_at, reverse=True)[:5]
    recent_out = [_disruption_to_out(d) for d in recent]

    # Top recommendations
    top_recs = (
        db.query(Recommendation)
        .filter(Recommendation.status == "proposed", Recommendation.feasible == True)
        .order_by(Recommendation.utility.desc())
        .limit(3)
        .all()
    )
    recs_out = [_rec_to_out(r) for r in top_recs]

    return OverviewOut(
        kpis=kpis,
        risk_by_cause=risk_by_cause,
        active_risks_by_cause=active_risks_by_cause,
        top_risky_lanes=risky_lanes,
        regional_risk_levels=regional_risk,
        recent_disruptions=recent_out,
        top_recommendations=recs_out,
        recommended_actions=recs_out,
        network_status="operational" if len(high_risk) == 0 else "disrupted",
    )


def _disruption_to_out(d: Disruption) -> DisruptionOut:
    impact = None
    impact_summary = "Normal operations"
    if d.impacts:
        imp = d.impacts[0]
        try:
            aff = json.loads(imp.affected_shipments_json or "[]")
        except Exception:
            aff = []
        impact = ImpactOut(
            affected_shipments=aff,
            extra_delay_h=imp.extra_delay_h,
            stockout_date=imp.stockout_date,
            units_short=imp.units_short,
            revenue_at_risk=imp.revenue_at_risk,
            margin_at_risk=imp.margin_at_risk,
        )
        impact_summary = f"{len(aff)} shipments affected, +{imp.extra_delay_h}h delay, ₹{int(imp.revenue_at_risk):,} at risk"

    try:
        ev_list = json.loads(d.evidence_json or "[]")
    except Exception:
        ev_list = []

    # Calculate human readable time ago
    mins = int((datetime.utcnow() - d.detected_at).total_seconds() / 60)
    time_ago = f"{mins}m ago" if mins < 60 else f"{mins // 60}h ago"

    issue_title = f"{d.type.replace('_', ' ').title()} - {d.entity_name}"

    recs = []
    if hasattr(d, "recommendations") and d.recommendations:
        recs = [_rec_to_out(r) for r in d.recommendations]

    return DisruptionOut(
        id=d.id,
        type=d.type,
        entity=EntityRef(type=d.entity_type, id=d.entity_id, name=d.entity_name),
        severity=d.severity,
        confidence=d.confidence,
        risk_score=d.risk_score,
        level=d.level,
        status=d.status,
        detected_at=d.detected_at.isoformat() + "Z",
        resolved_at=d.resolved_at.isoformat() + "Z" if d.resolved_at else None,
        impact=impact,
        evidence=[EvidenceItem(**e) for e in ev_list if isinstance(e, dict) and "source" in e],
        recommendations=recs,
        issue_title=issue_title,
        impact_summary=impact_summary,
        time_ago=time_ago,
    )



def _rec_to_out(r: Recommendation) -> RecommendationOut:
    try:
        params = json.loads(r.params_json or "{}")
    except Exception:
        params = {}
    try:
        ev = json.loads(r.evidence_json or "[]")
    except Exception:
        ev = []
    return RecommendationOut(
        id=r.id,
        disruption_id=r.disruption_id,
        rank=r.rank,
        action_type=r.action_type,
        title=r.title,
        explanation=r.explanation,
        delay_saved_h=r.delay_saved_h,
        cost_delta=r.cost_delta,
        cost_delta_pct=r.cost_delta_pct,
        risk_reduction=r.risk_reduction,
        confidence=r.confidence,
        status=r.status,
        params=params,
        evidence=[EvidenceItem(**e) for e in ev if isinstance(e, dict) and "source" in e],
        feasible=r.feasible,
    )
