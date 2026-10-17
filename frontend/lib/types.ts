export type DisruptionType = 'weather' | 'traffic' | 'supplier_delay' | 'inventory';
export type RiskLevel = 'low' | 'medium' | 'high';
export type DisruptionStatus = 'open' | 'resolved';

export interface EvidenceItem {
  source: string;
  simulated: boolean;
  metric: string;
  value: number;
  unit?: string;
  ts: string;
}

export interface DisruptionEntity {
  type: 'lane' | 'supplier' | 'location_sku';
  id: string;
  name: string;
  location_label?: string;
}

export interface DisruptionImpact {
  affected_shipments: string[];
  extra_delay_h: number;
  stockout_date: string;
  units_short: number;
  revenue_at_risk: number;
}

export interface Disruption {
  id: string;
  type: DisruptionType;
  entity: DisruptionEntity;
  severity: number;
  confidence: number;
  risk_score: number;
  level: RiskLevel;
  status: DisruptionStatus;
  detected_at: string;
  resolved_at?: string | null;
  time_ago?: string;
  issue_title: string;
  impact_summary: string;
  impact: DisruptionImpact;
  evidence: EvidenceItem[];
}

export interface Recommendation {
  id: string;
  disruption_id: string;
  rank: number;
  action_type: 'reroute' | 'alternate_supplier' | 'expedite' | 'rebalance' | 'increase_safety_stock' | 'monitor';
  title: string;
  explanation: string;
  delay_saved_h: number;
  cost_delta_pct: number;
  risk_reduction: number;
  confidence: number;
  status: 'proposed' | 'approved' | 'rejected';
  params?: Record<string, any>;
  evidence?: EvidenceItem[];
}

export interface DisruptionDetail extends Disruption {
  recommendations: Recommendation[];
  history: Array<{
    ts: string;
    event: string;
    description: string;
  }>;
}

export interface RegionalRisk {
  region: string;
  level: RiskLevel;
  score: number;
}

export interface OverviewKPIs {
  total_active_risks: number;
  high_severity_count: number;
  total_shipments_at_risk: number;
  total_revenue_at_risk: number;
  on_time_network_rate: number;
}

export interface ActiveRisksByCause {
  supplier_delay: number;
  weather: number;
  traffic: number;
  inventory_shortage: number;
  geopolitical: number;
}

export interface OverviewData {
  kpis: OverviewKPIs;
  active_risks_by_cause: ActiveRisksByCause;
  regional_risk_levels: RegionalRisk[];
  recent_disruptions: Disruption[];
  recommended_actions: Recommendation[];
}

export interface LocationNode {
  id: string;
  name: string;
  type: 'hub' | 'warehouse' | 'supplier' | 'store';
  lat: number;
  lng: number;
}

export interface LaneEdge {
  id: string;
  from_id: string;
  to_id: string;
  from_name: string;
  to_name: string;
  distance_km: number;
  baseline_duration_s: number;
  current_duration_s: number;
  cost: number;
  risk_score: number;
  level: RiskLevel;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
}

export interface NetworkData {
  locations: LocationNode[];
  lanes: LaneEdge[];
}

export interface Shipment {
  id: string;
  supplier_id: string;
  supplier_name: string;
  origin_id: string;
  origin_name: string;
  destination_id: string;
  destination_name: string;
  sku: string;
  sku_name: string;
  qty: number;
  status: 'in_transit' | 'delivered' | 'delayed' | 'rerouted';
  planned_eta: string;
  current_eta: string;
  delay_h: number;
  risk_level: RiskLevel;
  route_lane_ids: string[];
}

export interface Supplier {
  id: string;
  name: string;
  location_id: string;
  location_name: string;
  base_lead_time_days: number;
  current_delay_days: number;
  on_time_rate: number;
  reliability_score: number;
  active_disruptions_count: number;
}

export interface RouteOption {
  route_id: string;
  route_name: string;
  lane_ids: string[];
  distance_km: number;
  duration_h: number;
  cost: number;
  risk_score: number;
  level: RiskLevel;
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
}

export interface RouteAlternative extends RouteOption {
  rank: number;
  utility: number;
  delta: {
    duration_h: number;
    cost_pct: number;
    risk: number;
  };
}

export interface RouteCompareData {
  shipment_id: string;
  priority: 'fastest' | 'balanced' | 'cheapest' | 'safest';
  current: RouteOption;
  alternatives: RouteAlternative[];
}

export interface ApproveResult {
  success: boolean;
  recommendation_id: string;
  action_type: string;
  before_risk_score: number;
  after_risk_score: number;
  message: string;
  applied_at: string;
}

export interface SimulatorScenario {
  id: string;
  name: string;
  description: string;
  type: string;
  expected?: {
    disruption_type: string;
    min_level: string;
    acceptable_actions: string[];
  };
}

export interface WsAlertEvent {
  event: 'disruption_created' | 'disruption_updated' | 'disruption_resolved' | 'recommendation_ready' | 'plan_applied';
  ts: string;
  data: any;
}
