"""
engine.py – Detection engine: orchestrates all four detection rules.
Runs on a schedule and on demand.
"""
import json
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.config import (
    DISRUPTION_CLEAR_RUNS, DISRUPTION_CORROBORATION_BONUS, DISRUPTION_CONFIDENCE_CAP,
    WEATHER_SEVERITY_MEDIUM, WEATHER_SEVERITY_HIGH,
    TRAFFIC_RATIO_MEDIUM, TRAFFIC_RATIO_HIGH,
    SUPPLIER_Z_MEDIUM, SUPPLIER_Z_HIGH,
)
from backend.app.models import Disruption, Lane, Location, Supplier, Inventory
from backend.app.providers.traffic import traffic_provider, ratio_to_severity
from backend.app.providers.suppliers import get_supplier_metrics
from backend.app.providers.inventory import get_inventory_status
from backend.app.routing.graph import load_network
from backend.app.analysis.impact import compute_impact
from backend.app.analysis.scoring import compute_risk_score
from backend.app.response.generator import generate_recommendations
from backend.app import ws


async def run_detection(db: Session, forced_signals: Optional[list] = None):
    """
    Main detection loop. Called by scheduler and /detect/run endpoint.
    Returns list of disruption IDs that were created or updated.
    """
    network = load_network()
    lane_map = {l["id"]: l for l in network["lanes"]}
    loc_map = {l["id"]: l for l in network["locations"]}

    created_ids = []
    updated_ids = []

    # Collect all existing open disruptions for de-duplication
    open_disruptions = {
        (d.type, d.entity_type, d.entity_id): d
        for d in db.query(Disruption).filter(Disruption.status == "open").all()
    }

    # Track which (type, entity) combos were hit this run
    hit_this_run = set()

    # ── 1. Traffic disruptions per lane ───────────────────────────────────────
    for lane in network["lanes"]:
        lid = lane["id"]
        ratio = traffic_provider.get_ratio(lid)
        if ratio < TRAFFIC_RATIO_MEDIUM:
            continue

        severity = ratio_to_severity(ratio)
        confidence = 0.60  # simulated
        level = "high" if ratio >= TRAFFIC_RATIO_HIGH else "medium"

        from_name = loc_map.get(lane["from_id"], {}).get("name", lane["from_id"])
        to_name = loc_map.get(lane["to_id"], {}).get("name", lane["to_id"])
        entity_name = f"{from_name} to {to_name}"

        evidence = [
            {
                "source": "simulated-traffic",
                "simulated": True,
                "metric": "traffic_ratio",
                "value": round(ratio, 3),
                "ts": datetime.utcnow().isoformat() + "Z",
            }
        ]

        d = _upsert_disruption(
            db, open_disruptions, "traffic", "lane", lid, entity_name,
            severity, confidence, level, evidence, hit_this_run,
            created_ids, updated_ids
        )

    # ── 2. Weather disruptions per lane (async, skip in sync context) ─────────
    # Weather is fetched asynchronously; forced_signals may carry pre-fetched results
    if forced_signals:
        for sig in forced_signals:
            if sig["kind"] != "weather":
                continue
            lid = sig["entity_id"]
            lane = lane_map.get(lid)
            if not lane:
                continue

            severity = sig.get("severity", 0.0)
            if severity < WEATHER_SEVERITY_MEDIUM:
                continue

            confidence = sig.get("confidence", 0.7)
            level = "high" if severity >= WEATHER_SEVERITY_HIGH else "medium"
            from_name = loc_map.get(lane["from_id"], {}).get("name", lane["from_id"])
            to_name = loc_map.get(lane["to_id"], {}).get("name", lane["to_id"])
            entity_name = f"{from_name} to {to_name}"
            evidence = sig.get("evidence", [])

            _upsert_disruption(
                db, open_disruptions, "weather", "lane", lid, entity_name,
                severity, confidence, level, evidence, hit_this_run,
                created_ids, updated_ids
            )

    # ── 3. Supplier disruptions ────────────────────────────────────────────────
    suppliers = db.query(Supplier).all()
    for sup in suppliers:
        metrics = get_supplier_metrics(db, sup.id)
        if metrics["level"] == "low" or metrics["severity"] == 0.0:
            continue

        severity = metrics["severity"]
        confidence = metrics["confidence"]
        level = metrics["level"]

        evidence = [
            {"source": "supplier-history", "simulated": False,
             "metric": "z_score", "value": metrics["z_score"],
             "ts": datetime.utcnow().isoformat() + "Z"},
            {"source": "supplier-history", "simulated": False,
             "metric": "on_time_rate", "value": metrics["on_time_rate"],
             "ts": datetime.utcnow().isoformat() + "Z"},
        ]

        _upsert_disruption(
            db, open_disruptions, "supplier_delay", "supplier", sup.id, sup.name,
            severity, confidence, level, evidence, hit_this_run,
            created_ids, updated_ids
        )

    # ── 4. Inventory shortage disruptions ─────────────────────────────────────
    inventories = db.query(Inventory).all()
    for inv in inventories:
        loc = db.query(Location).filter(Location.id == inv.location_id).first()
        if not loc:
            continue
        status = get_inventory_status(db, inv.location_id, inv.sku)
        if status.get("level") in ("low", "no_data"):
            continue

        entity_id = f"{inv.location_id}::{inv.sku}"
        entity_name = f"{loc.name} – {inv.sku}"
        severity = status["severity"]
        confidence = status["confidence"]
        level = status["level"]

        evidence = [
            {"source": "inventory-db", "simulated": False,
             "metric": "days_of_cover", "value": status["days_cover"],
             "ts": datetime.utcnow().isoformat() + "Z"},
            {"source": "inventory-db", "simulated": False,
             "metric": "effective_lead_days", "value": status["effective_lead_days"],
             "ts": datetime.utcnow().isoformat() + "Z"},
        ]

        _upsert_disruption(
            db, open_disruptions, "inventory", "location_sku", entity_id, entity_name,
            severity, confidence, level, evidence, hit_this_run,
            created_ids, updated_ids
        )

    # ── 5. Corroboration: if two signals hit same lane or location ─────────────
    _apply_corroboration(db, open_disruptions)

    # ── 6. Resolution: mark disruptions clear for 3+ consecutive runs ─────────
    for key, d in open_disruptions.items():
        if key in hit_this_run:
            d.clear_run_count = 0
        else:
            d.clear_run_count = (d.clear_run_count or 0) + 1
            if d.clear_run_count >= DISRUPTION_CLEAR_RUNS:
                d.status = "resolved"
                d.resolved_at = datetime.utcnow()
                db.add(d)
                await ws.broadcast({
                    "event": "disruption_resolved",
                    "ts": datetime.utcnow().isoformat() + "Z",
                    "data": {"id": d.id},
                })

    db.commit()

    # ── 7. Compute impact + recommendations for new/updated disruptions ────────
    for did in created_ids + updated_ids:
        disruption = db.query(Disruption).filter(Disruption.id == did).first()
        if disruption:
            compute_impact(db, disruption)
            generate_recommendations(db, disruption)

    db.commit()

    # ── 8. Broadcast WebSocket events ─────────────────────────────────────────
    for did in created_ids:
        d = db.query(Disruption).filter(Disruption.id == did).first()
        if d:
            await ws.broadcast({
                "event": "disruption_created",
                "ts": datetime.utcnow().isoformat() + "Z",
                "data": _disruption_summary(d),
            })

    for did in updated_ids:
        d = db.query(Disruption).filter(Disruption.id == did).first()
        if d:
            await ws.broadcast({
                "event": "disruption_updated",
                "ts": datetime.utcnow().isoformat() + "Z",
                "data": _disruption_summary(d),
            })

    return created_ids + updated_ids


def _upsert_disruption(
    db, open_disruptions, d_type, entity_type, entity_id, entity_name,
    severity, confidence, level, evidence, hit_this_run, created_ids, updated_ids
):
    key = (d_type, entity_type, entity_id)
    hit_this_run.add(key)

    risk_score = compute_risk_score(severity, 0.0)  # exposure updated in impact step

    if key in open_disruptions:
        d = open_disruptions[key]
        d.severity = severity
        d.confidence = confidence
        d.risk_score = risk_score
        d.level = level
        d.evidence_json = json.dumps(evidence)
        db.add(d)
        updated_ids.append(d.id)
        return d
    else:
        did = f"d_{uuid.uuid4().hex[:8]}"
        d = Disruption(
            id=did,
            type=d_type,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            severity=severity,
            confidence=confidence,
            risk_score=risk_score,
            level=level,
            status="open",
            detected_at=datetime.utcnow(),
            evidence_json=json.dumps(evidence),
            clear_run_count=0,
        )
        db.add(d)
        open_disruptions[key] = d
        created_ids.append(did)
        return d


def _apply_corroboration(db, open_disruptions):
    """Boost confidence when two independent signals hit the same lane/location."""
    # Group by entity_id
    by_entity: dict[str, list] = {}
    for (d_type, entity_type, entity_id), d in open_disruptions.items():
        by_entity.setdefault(entity_id, []).append(d)

    for entity_id, disruptions in by_entity.items():
        if len(disruptions) >= 2:
            for d in disruptions:
                new_conf = min(d.confidence + DISRUPTION_CORROBORATION_BONUS, DISRUPTION_CONFIDENCE_CAP)
                if new_conf != d.confidence:
                    d.confidence = new_conf
                    db.add(d)


def _disruption_summary(d: Disruption) -> dict:
    return {
        "id": d.id,
        "type": d.type,
        "entity_id": d.entity_id,
        "entity_name": d.entity_name,
        "severity": d.severity,
        "risk_score": d.risk_score,
        "level": d.level,
        "status": d.status,
    }
