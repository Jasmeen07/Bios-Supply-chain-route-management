"""
models.py – SQLAlchemy ORM models for all tables.
"""
import json
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import relationship

from backend.app.db import Base


class Location(Base):
    __tablename__ = "locations"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)   # supplier | warehouse | store
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)


class Lane(Base):
    __tablename__ = "lanes"
    id = Column(String, primary_key=True)
    from_id = Column(String, ForeignKey("locations.id"), nullable=False)
    to_id = Column(String, ForeignKey("locations.id"), nullable=False)
    distance_km = Column(Float, nullable=False)
    baseline_duration_s = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    geometry_json = Column(Text, nullable=False)   # GeoJSON LineString as string
    approximate = Column(Boolean, default=False)


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    location_id = Column(String, ForeignKey("locations.id"), nullable=False)
    base_lead_time_days = Column(Float, nullable=False)
    reliability = Column(Float, nullable=False)   # 0-1


class Product(Base):
    __tablename__ = "products"
    sku = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    margin = Column(Float, nullable=False)
    replenishment_lead_days = Column(Float, nullable=False)


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=False)
    sku = Column(String, ForeignKey("products.sku"), nullable=False)
    on_hand = Column(Float, nullable=False)
    avg_daily_demand = Column(Float, nullable=False)


class Shipment(Base):
    __tablename__ = "shipments"
    id = Column(String, primary_key=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    origin_id = Column(String, ForeignKey("locations.id"), nullable=False)
    destination_id = Column(String, ForeignKey("locations.id"), nullable=False)
    sku = Column(String, ForeignKey("products.sku"), nullable=False)
    qty = Column(Float, nullable=False)
    route_lane_ids_json = Column(Text, nullable=False)   # JSON list of lane IDs
    status = Column(String, default="in_transit")        # in_transit | delivered | delayed
    planned_eta = Column(DateTime, nullable=False)
    current_eta = Column(DateTime, nullable=False)

    @property
    def route_lane_ids(self) -> list:
        return json.loads(self.route_lane_ids_json)

    @route_lane_ids.setter
    def route_lane_ids(self, value: list):
        self.route_lane_ids_json = json.dumps(value)


class SupplierDelivery(Base):
    __tablename__ = "supplier_deliveries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=False)
    promised_at = Column(DateTime, nullable=False)
    delivered_at = Column(DateTime, nullable=False)
    delay_hours = Column(Float, nullable=False)


class Signal(Base):
    __tablename__ = "signals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, default=datetime.utcnow, nullable=False)
    source = Column(String, nullable=False)
    kind = Column(String, nullable=False)        # weather | traffic | supplier | inventory
    entity_type = Column(String, nullable=False) # lane | supplier | location_sku
    entity_id = Column(String, nullable=False)
    value_json = Column(Text, nullable=False)
    simulated = Column(Boolean, default=False)


class Disruption(Base):
    __tablename__ = "disruptions"
    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)        # weather | traffic | supplier_delay | inventory
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    entity_name = Column(String, nullable=False)
    severity = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    level = Column(String, nullable=False)       # low | medium | high
    status = Column(String, default="open")      # open | resolved
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    evidence_json = Column(Text, default="[]")
    clear_run_count = Column(Integer, default=0) # for de-duplication resolution logic

    impacts = relationship("Impact", back_populates="disruption", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="disruption", cascade="all, delete-orphan")


class Impact(Base):
    __tablename__ = "impacts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    disruption_id = Column(String, ForeignKey("disruptions.id"), nullable=False)
    affected_shipments_json = Column(Text, default="[]")
    extra_delay_h = Column(Float, default=0.0)
    stockout_date = Column(String, nullable=True)
    units_short = Column(Float, default=0.0)
    revenue_at_risk = Column(Float, default=0.0)
    margin_at_risk = Column(Float, default=0.0)

    disruption = relationship("Disruption", back_populates="impacts")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(String, primary_key=True)
    disruption_id = Column(String, ForeignKey("disruptions.id"), nullable=False)
    action_type = Column(String, nullable=False)  # reroute | alternate_supplier | ...
    params_json = Column(Text, default="{}")
    delay_saved_h = Column(Float, default=0.0)
    cost_delta = Column(Float, default=0.0)       # absolute ₹ delta
    cost_delta_pct = Column(Float, default=0.0)   # %
    risk_reduction = Column(Float, default=0.0)
    utility = Column(Float, default=0.0)
    rank = Column(Integer, default=99)
    title = Column(String, nullable=False)
    explanation = Column(Text, nullable=False)
    evidence_json = Column(Text, default="[]")
    status = Column(String, default="proposed")   # proposed | approved
    feasible = Column(Boolean, default=True)
    confidence = Column(Float, default=0.5)

    disruption = relationship("Disruption", back_populates="recommendations")


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    ts = Column(DateTime, default=datetime.utcnow)
    event = Column(String, nullable=False)
    payload_json = Column(Text, default="{}")
