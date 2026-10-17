"""
schemas.py – Pydantic v2 request and response models.
These are the canonical contract shapes; the openapi.yaml is generated from them.
"""
from __future__ import annotations
from typing import Any, Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ── Shared primitives ──────────────────────────────────────────────────────────

class EntityRef(BaseModel):
    type: str   # lane | supplier | location_sku
    id: str
    name: str


class EvidenceItem(BaseModel):
    source: str
    simulated: bool
    metric: str
    value: Any
    ts: str


# ── Network ────────────────────────────────────────────────────────────────────

class LocationOut(BaseModel):
    id: str
    name: str
    type: str
    lat: float
    lng: float

    model_config = {"from_attributes": True}


class LaneOut(BaseModel):
    id: str
    from_id: str
    to_id: str
    from_name: Optional[str] = None
    to_name: Optional[str] = None
    distance_km: float
    baseline_duration_s: float
    cost: float
    geometry: dict
    approximate: bool = False
    risk_score: float = 0.0
    risk_level: str = "low"
    level: Optional[str] = "low"
    current_duration_s: float = 0.0

    model_config = {"from_attributes": True}


class NetworkOut(BaseModel):
    locations: List[LocationOut]
    lanes: List[LaneOut]


# ── Disruptions ────────────────────────────────────────────────────────────────

class ImpactOut(BaseModel):
    affected_shipments: List[str]
    extra_delay_h: float
    stockout_date: Optional[str]
    units_short: float
    revenue_at_risk: float
    margin_at_risk: float = 0.0


class DisruptionOut(BaseModel):
    id: str
    type: str
    entity: EntityRef
    severity: float
    confidence: float
    risk_score: float
    level: str
    status: str
    detected_at: str
    resolved_at: Optional[str] = None
    impact: Optional[ImpactOut] = None
    evidence: List[EvidenceItem] = []
    recommendations: List[RecommendationOut] = []
    issue_title: Optional[str] = None
    impact_summary: Optional[str] = None
    time_ago: Optional[str] = None
    history: List[dict] = []

    model_config = {"from_attributes": True}


class DisruptionListOut(BaseModel):
    disruptions: List[DisruptionOut]
    total: int


# ── Recommendations ────────────────────────────────────────────────────────────

class RecommendationOut(BaseModel):
    id: str
    disruption_id: str
    rank: int
    action_type: str
    title: str
    explanation: str
    delay_saved_h: float
    cost_delta: float
    cost_delta_pct: float
    risk_reduction: float
    confidence: float
    status: str
    params: dict = {}
    evidence: List[EvidenceItem] = []
    feasible: bool = True

    model_config = {"from_attributes": True}


# ── Shipments ─────────────────────────────────────────────────────────────────

class ShipmentOut(BaseModel):
    id: str
    supplier_id: str
    origin_id: str
    destination_id: str
    sku: str
    qty: float
    route_lane_ids: List[str]
    status: str
    planned_eta: str
    current_eta: str
    origin_name: str = ""
    destination_name: str = ""
    supplier_name: str = ""
    sku_name: str = ""
    risk_score: float = 0.0
    risk_level: str = "low"
    delay_hours: float = 0.0
    delay_h: float = 0.0

    model_config = {"from_attributes": True}


# ── Suppliers ─────────────────────────────────────────────────────────────────

class SupplierOut(BaseModel):
    id: str
    name: str
    location_id: str
    location_name: str = ""
    base_lead_time_days: float
    reliability: float
    reliability_score: float = 0.0
    active_disruptions_count: int = 0
    current_delay_days: float = 0.0
    on_time_rate: float = 1.0
    status: str = "normal"   # normal | delayed | critical
    risk_score: float = 0.0
    tier: int = 1

    model_config = {"from_attributes": True}


# ── Overview ──────────────────────────────────────────────────────────────────

class KpiCards(BaseModel):
    active_disruptions: int = 0
    high_risk_shipments: int = 0
    revenue_at_risk: float = 0.0
    avg_delay_h: float = 0.0
    total_active_risks: Optional[int] = None
    high_severity_count: Optional[int] = None
    total_shipments_at_risk: Optional[int] = None
    total_revenue_at_risk: Optional[float] = None
    on_time_network_rate: Optional[float] = None


class RiskByCause(BaseModel):
    weather: int = 0
    traffic: int = 0
    supplier_delay: int = 0
    inventory: int = 0
    inventory_shortage: Optional[int] = None
    geopolitical: int = 0


class RiskyLane(BaseModel):
    lane_id: str
    name: str
    risk_score: float
    level: str


class OverviewOut(BaseModel):
    kpis: KpiCards
    risk_by_cause: RiskByCause
    active_risks_by_cause: Optional[dict] = None
    top_risky_lanes: List[RiskyLane] = []
    regional_risk_levels: Optional[List[dict]] = None
    recent_disruptions: List[DisruptionOut] = []
    top_recommendations: List[RecommendationOut] = []
    recommended_actions: Optional[List[RecommendationOut]] = None
    network_status: str = "operational"



# ── Route compare ─────────────────────────────────────────────────────────────

class RouteDelta(BaseModel):
    duration_h: float
    cost_pct: float
    risk: float


class RouteOption(BaseModel):
    route_id: str = "current_route"
    route_name: str = "Current Route"
    lane_ids: List[str]
    distance_km: float = 0.0
    duration_h: float
    cost: float
    risk_score: float
    level: str = "low"
    geometry: dict
    delta: Optional[RouteDelta] = None
    rank: Optional[int] = None
    label: str = ""
    utility: Optional[float] = None


class RouteCompareOut(BaseModel):
    shipment_id: str
    priority: str
    current: RouteOption
    alternatives: List[RouteOption]


# ── Approve ────────────────────────────────────────────────────────────────────

class ApproveResult(BaseModel):
    success: bool = True
    recommendation_id: str
    disruption_id: str
    action_type: str
    before_risk_score: float
    after_risk_score: float
    message: str
    applied_at: str = ""
    applied: bool = True


# ── Simulate ──────────────────────────────────────────────────────────────────

class SimulateRequest(BaseModel):
    scenario_id: Optional[str] = None
    custom: Optional[dict] = None


class SimulateResult(BaseModel):
    success: bool = True
    scenario_id: str
    description: str
    disruptions_created: int
    disruption_ids: List[str]
    injected_disruption_id: str = ""
    status: str = "active"
    message: str


# ── WebSocket events ──────────────────────────────────────────────────────────

class WsEvent(BaseModel):
    event: str   # disruption_created | disruption_updated | disruption_resolved | recommendation_ready | plan_applied
    ts: str
    data: dict


# ── Health ────────────────────────────────────────────────────────────────────

class HealthOut(BaseModel):
    status: str
    db: str
    seed: int
    version: str = "1.0.0"
