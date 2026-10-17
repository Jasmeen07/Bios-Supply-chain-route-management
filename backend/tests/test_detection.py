"""
test_detection.py – Unit and integration tests for detection rules, de-duplication, and resolution.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db import Base
from backend.app.models import Disruption, Lane, Location, Supplier, Inventory, Product
from backend.app.config import (
    TRAFFIC_RATIO_MEDIUM, TRAFFIC_RATIO_HIGH,
    WEATHER_SEVERITY_MEDIUM, WEATHER_SEVERITY_HIGH,
    SUPPLIER_Z_MEDIUM, SUPPLIER_Z_HIGH,
    DISRUPTION_CLEAR_RUNS,
)
from backend.app.providers.traffic import ratio_to_severity, traffic_provider
from backend.app.providers.inventory import get_inventory_status
from backend.app.detection.engine import run_detection
from scripts.seed import seed_all


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    seed_all(reset=False, db_session=db)
    yield db
    db.close()


def test_traffic_thresholds():
    # Below medium threshold -> severity 0 or below medium
    sev_below = ratio_to_severity(1.10)
    assert sev_below < 0.25

    # At medium threshold
    sev_med = ratio_to_severity(TRAFFIC_RATIO_MEDIUM)
    assert 0.30 <= sev_med <= 0.40

    # At high threshold
    sev_high = ratio_to_severity(TRAFFIC_RATIO_HIGH)
    assert sev_high >= 0.60


def test_inventory_thresholds(test_db):
    # Test healthy inventory has level == "low" (no disruption)
    healthy = get_inventory_status(test_db, "delhi", "SKU-ELEC")
    assert healthy["level"] == "low"
    assert healthy["severity"] == 0.0

    # Lower stock to simulate shortage
    inv = test_db.query(Inventory).filter(
        Inventory.location_id == "delhi", Inventory.sku == "SKU-ELEC"
    ).first()
    original_on_hand = inv.on_hand
    try:
        inv.on_hand = 10.0  # severely depleted
        test_db.commit()

        short = get_inventory_status(test_db, "delhi", "SKU-ELEC")
        assert short["level"] in ("medium", "high")
        assert short["severity"] > 0.5
        assert short["units_short"] > 0
    finally:
        inv.on_hand = original_on_hand
        test_db.commit()


@pytest.mark.asyncio
async def test_deduplication_and_resolution(test_db):
    traffic_provider.clear_all_incidents()
    # Inject an incident on a lane
    lane_id = "L_delhi_jaipur"
    traffic_provider.inject_incident(lane_id, 0.8)

    # First detection creates the disruption
    res1 = await run_detection(test_db)
    d1 = test_db.query(Disruption).filter(
        Disruption.entity_id == lane_id, Disruption.status == "open"
    ).first()
    assert d1 is not None
    orig_id = d1.id

    # Second detection run updates the existing disruption instead of creating duplicate
    res2 = await run_detection(test_db)
    all_d = test_db.query(Disruption).filter(
        Disruption.entity_id == lane_id, Disruption.status == "open"
    ).all()
    assert len(all_d) == 1
    assert all_d[0].id == orig_id

    # Clear incident and run 3 detection cycles to test automatic resolution
    traffic_provider.clear_incident(lane_id)
    for _ in range(DISRUPTION_CLEAR_RUNS):
        await run_detection(test_db)

    # Disruption should now be marked resolved
    resolved = test_db.query(Disruption).filter(Disruption.id == orig_id).first()
    assert resolved.status == "resolved"
    assert resolved.resolved_at is not None
