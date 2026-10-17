"""
inject.py – Implements scenario injection and simulation reset.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.models import (
    SupplierDelivery, Inventory, Disruption, Recommendation, Impact, AuditLog
)
from backend.app.providers.traffic import traffic_provider
from backend.app.detection.engine import run_detection
from backend.app.simulator.scenarios import get_scenario, load_all_scenarios
from backend.app import ws


async def inject_scenario(
    db: Session,
    scenario_id: Optional[str] = None,
    custom: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Applies the scenario mutations to DB / in-memory providers,
    then runs the detection engine and returns the created disruptions.
    """
    if scenario_id:
        scenario = get_scenario(scenario_id)
        if not scenario:
            # Fallback lookup in all scenarios
            all_s = load_all_scenarios()
            scenario = next((s for s in all_s if s["id"] == scenario_id), None)
            if not scenario:
                raise ValueError(f"Unknown scenario ID: {scenario_id}")
        inject_data = scenario.get("inject", {})
        description = scenario.get("description", scenario.get("name", scenario_id))
    elif custom:
        inject_data = custom
        scenario_id = custom.get("id", "CUSTOM")
        description = custom.get("description", "Custom injected scenario")
    else:
        raise ValueError("Either scenario_id or custom payload must be provided")

    kind = inject_data.get("kind", "")
    forced_signals = []

    # Entity Normalization Maps
    SKU_MAP = {
        "SKU-101": "SKU-ELEC",
        "SKU-102": "SKU-FASH",
        "SKU-103": "SKU-PHMA",
        "SKU-104": "SKU-AUTO",
    }
    LANE_MAP = {
        "L_pune_mumbai": "L_pune_delhi",
        "L_surat_mumbai": "L_surat_delhi",
    }

    # 1. Traffic injection
    if kind in ("traffic", "compound_weather_traffic"):
        raw_lane_id = inject_data.get("lane_id", "")
        lane_id = LANE_MAP.get(raw_lane_id, raw_lane_id)
        ratio = inject_data.get("ratio", 1.8)
        severity = max(0.1, min(1.0, (ratio - 1.0) / 1.5))
        if lane_id:
            traffic_provider.inject_incident(lane_id, severity)

    # 2. Weather injection
    if kind in ("weather", "compound_weather_traffic"):
        raw_lane_id = inject_data.get("lane_id", "")
        lane_id = LANE_MAP.get(raw_lane_id, raw_lane_id)
        precip = inject_data.get("precip_mm", 30.0)
        gust = inject_data.get("gust_kmh", 80.0)
        code = inject_data.get("weather_code", 95)
        precip_score = min(precip / 20.0, 1.0)
        wind_score = min(gust / 90.0, 1.0)
        storm_score = 1.0 if 95 <= code <= 99 else 0.0
        severity = max(precip_score, wind_score, storm_score)

        if lane_id:
            forced_signals.append({
                "kind": "weather",
                "entity_type": "lane",
                "entity_id": lane_id,
                "severity": round(severity, 3),
                "confidence": 0.75,
                "evidence": [
                    {
                        "source": "simulated-open-meteo",
                        "simulated": True,
                        "metric": "precip_mm_per_h",
                        "value": precip,
                        "ts": datetime.utcnow().isoformat() + "Z",
                    },
                    {
                        "source": "simulated-open-meteo",
                        "simulated": True,
                        "metric": "wind_gust_kmh",
                        "value": gust,
                        "ts": datetime.utcnow().isoformat() + "Z",
                    },
                    {
                        "source": "simulated-open-meteo",
                        "simulated": True,
                        "metric": "weather_code",
                        "value": code,
                        "ts": datetime.utcnow().isoformat() + "Z",
                    },
                ]
            })

    # 3. Supplier delay injection
    if kind in ("supplier", "compound_supplier_inventory"):
        raw_sup_id = inject_data.get("supplier_id", "")
        norm_sup_id = raw_sup_id.upper().replace("_", "-")
        # Check actual supplier in DB
        from backend.app.models import Supplier
        sup = db.query(Supplier).filter((Supplier.id == raw_sup_id) | (Supplier.id == norm_sup_id)).first()
        supplier_id = sup.id if sup else norm_sup_id
        delay_hours = inject_data.get("added_delay_hours", 48.0)

        if supplier_id:
            now = datetime.utcnow()
            for i in range(5):
                deliv = SupplierDelivery(
                    supplier_id=supplier_id,
                    promised_at=now - timedelta(days=i + 1),
                    delivered_at=now - timedelta(days=i + 1) + timedelta(hours=delay_hours),
                    delay_hours=delay_hours,
                )
                db.add(deliv)
            db.commit()

    # 4. Inventory shortage injection
    if kind in ("inventory", "compound_supplier_inventory"):
        raw_loc = inject_data.get("location_id", "")
        location_id = raw_loc.lower().replace("wh_", "").replace("st_", "")
        raw_sku = inject_data.get("sku", "")
        sku = SKU_MAP.get(raw_sku, raw_sku)
        on_hand = inject_data.get("on_hand", 10.0)

        if location_id and sku:
            inv = db.query(Inventory).filter(
                Inventory.location_id == location_id,
                Inventory.sku == sku
            ).first()
            if inv:
                inv.on_hand = on_hand
                db.add(inv)
                db.commit()


    # Log simulation injection in audit_log
    audit = AuditLog(
        event="simulation_injected",
        payload_json=f'{{"scenario_id": "{scenario_id}", "kind": "{kind}"}}'
    )
    db.add(audit)
    db.commit()

    # Run detection engine with forced signals
    detect_res = await run_detection(db, forced_signals=forced_signals)
    created_ids = detect_res.get("created", []) if isinstance(detect_res, dict) else []

    # Get all open disruption IDs matching this scenario's entity if available
    open_disruptions = db.query(Disruption).filter(Disruption.status == "open").all()
    all_open_ids = [d.id for d in open_disruptions]

    return {
        "scenario_id": scenario_id,
        "description": description,
        "disruptions_created": len(created_ids),
        "disruption_ids": created_ids if created_ids else all_open_ids,
        "message": f"Scenario '{scenario_id}' injected successfully. {len(created_ids)} new disruptions detected.",
    }


async def reset_simulation(db: Session) -> Dict[str, Any]:
    """
    Clears all active incidents, re-runs seed state or restores baseline values,
    resolves disruptions, and re-runs detection to return network to healthy state.
    """
    # 1. Clear traffic incidents
    traffic_provider.clear_all_incidents()

    # 2. Clear all disruptions, recommendations, and impacts
    db.query(Recommendation).delete()
    db.query(Impact).delete()
    db.query(Disruption).delete()
    db.commit()

    # 3. Re-run seed on clean baseline with fixed seed
    from scripts.seed import seed_all
    seed_all(reset=True, db_session=db)

    # 4. Log reset
    audit = AuditLog(
        event="simulation_reset",
        payload_json='{"status": "reset_to_seed"}'
    )
    db.add(audit)
    db.commit()

    # 5. Run detection to synchronize healthy state
    await run_detection(db)


    # 5. Broadcast reset event
    await ws.broadcast({
        "event": "simulation_reset",
        "ts": datetime.utcnow().isoformat() + "Z",
        "data": {"message": "Network reset to baseline state."},
    })

    return {
        "status": "success",
        "message": "Simulation reset successfully. Network restored to baseline seed state.",
    }
