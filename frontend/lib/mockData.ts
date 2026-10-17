import {
  OverviewData,
  NetworkData,
  Disruption,
  DisruptionDetail,
  Shipment,
  Supplier,
  RouteCompareData,
  ApproveResult,
  SimulatorScenario,
  WsAlertEvent,
} from './types';

// Initial data states cloned from contracts fixtures
const initialOverview: OverviewData = {
  kpis: {
    total_active_risks: 12,
    high_severity_count: 4,
    total_shipments_at_risk: 6,
    total_revenue_at_risk: 485000,
    on_time_network_rate: 87.5,
  },
  active_risks_by_cause: {
    supplier_delay: 4,
    weather: 3,
    traffic: 2,
    inventory_shortage: 2,
    geopolitical: 1,
  },
  regional_risk_levels: [
    { region: 'North America', level: 'medium', score: 48 },
    { region: 'Europe', level: 'high', score: 76 },
    { region: 'Asia', level: 'high', score: 84 },
    { region: 'South America', level: 'medium', score: 52 },
    { region: 'Africa', level: 'low', score: 24 },
  ],
  recent_disruptions: [
    {
      id: 'd_101',
      type: 'supplier_delay',
      entity: {
        type: 'supplier',
        id: 'SUP_shenzhen_01',
        name: 'Shenzhen Precision Electronics',
        location_label: 'Shenzhen, China',
      },
      severity: 0.88,
      confidence: 0.82,
      risk_score: 86,
      level: 'high',
      status: 'open',
      detected_at: '2026-10-17T12:30:00Z',
      time_ago: '2 hrs ago',
      issue_title: 'Supplier delay',
      impact_summary: 'Component shortage',
      impact: {
        affected_shipments: ['S-104', 'S-109'],
        extra_delay_h: 48.0,
        stockout_date: '2026-10-21',
        units_short: 420,
        revenue_at_risk: 185000,
      },
      evidence: [
        {
          source: 'supplier-telemetry',
          simulated: true,
          metric: 'lead_time_z_score',
          value: 3.2,
          unit: 'z',
          ts: '2026-10-17T12:25:00Z',
        },
      ],
    },
    {
      id: 'd_102',
      type: 'weather',
      entity: {
        type: 'lane',
        id: 'L_rotterdam_shanghai',
        name: 'Rotterdam Marine & Port Terminal',
        location_label: 'Rotterdam, NL',
      },
      severity: 0.82,
      confidence: 0.90,
      risk_score: 78,
      level: 'high',
      status: 'open',
      detected_at: '2026-10-17T10:30:00Z',
      time_ago: '4 hrs ago',
      issue_title: 'Severe weather',
      impact_summary: 'Port congestion',
      impact: {
        affected_shipments: ['S-101', 'S-105'],
        extra_delay_h: 36.0,
        stockout_date: '2026-10-24',
        units_short: 280,
        revenue_at_risk: 140000,
      },
      evidence: [
        {
          source: 'open-meteo',
          simulated: false,
          metric: 'wind_gust_kmh',
          value: 88.5,
          unit: 'km/h',
          ts: '2026-10-17T10:15:00Z',
        },
      ],
    },
    {
      id: 'd_103',
      type: 'traffic',
      entity: {
        type: 'lane',
        id: 'L_ny_interstate',
        name: 'I-95 Port Corridor New York',
        location_label: 'New York, USA',
      },
      severity: 0.58,
      confidence: 0.75,
      risk_score: 54,
      level: 'medium',
      status: 'open',
      detected_at: '2026-10-17T08:30:00Z',
      time_ago: '6 hrs ago',
      issue_title: 'Traffic disruption',
      impact_summary: 'Delayed delivery',
      impact: {
        affected_shipments: ['S-112'],
        extra_delay_h: 8.5,
        stockout_date: '2026-10-26',
        units_short: 110,
        revenue_at_risk: 52000,
      },
      evidence: [
        {
          source: 'traffic-sensor',
          simulated: true,
          metric: 'duration_ratio',
          value: 1.62,
          unit: 'x',
          ts: '2026-10-17T08:20:00Z',
        },
      ],
    },
    {
      id: 'd_104',
      type: 'traffic',
      entity: {
        type: 'lane',
        id: 'L_santos_dock',
        name: 'Santos Port Gate Terminal',
        location_label: 'Santos, Brazil',
      },
      severity: 0.52,
      confidence: 0.68,
      risk_score: 49,
      level: 'medium',
      status: 'open',
      detected_at: '2026-10-17T05:30:00Z',
      time_ago: '9 hrs ago',
      issue_title: 'Customs delay',
      impact_summary: '1-2 days delay',
      impact: {
        affected_shipments: ['S-115'],
        extra_delay_h: 28.0,
        stockout_date: '2026-10-28',
        units_short: 95,
        revenue_at_risk: 44000,
      },
      evidence: [
        {
          source: 'customs-feed',
          simulated: true,
          metric: 'clearance_backlog_hours',
          value: 31.0,
          unit: 'hours',
          ts: '2026-10-17T05:15:00Z',
        },
      ],
    },
    {
      id: 'd_105',
      type: 'inventory',
      entity: {
        type: 'location_sku',
        id: 'LOC_singapore_SKU04',
        name: 'Singapore Distribution Hub - SKU04',
        location_label: 'Singapore',
      },
      severity: 0.32,
      confidence: 0.94,
      risk_score: 28,
      level: 'low',
      status: 'open',
      detected_at: '2026-10-17T02:30:00Z',
      time_ago: '12 hrs ago',
      issue_title: 'Inventory shortage',
      impact_summary: 'Production at risk',
      impact: {
        affected_shipments: ['S-120'],
        extra_delay_h: 0.0,
        stockout_date: '2026-10-29',
        units_short: 60,
        revenue_at_risk: 24000,
      },
      evidence: [
        {
          source: 'wms-inventory',
          simulated: true,
          metric: 'days_of_cover',
          value: 4.1,
          unit: 'days',
          ts: '2026-10-17T02:15:00Z',
        },
      ],
    },
  ],
  recommended_actions: [
    {
      id: 'r_501',
      disruption_id: 'd_101',
      rank: 1,
      action_type: 'reroute',
      title: 'Reroute via Singapore',
      explanation: 'Avoid congestion at Shenzhen. Estimated delay reduction: 2-3 days.',
      delay_saved_h: 52.0,
      cost_delta_pct: 3.8,
      risk_reduction: 58,
      confidence: 0.84,
      status: 'proposed',
      params: {
        shipment_id: 'S-104',
        new_waypoint: 'Singapore Transshipment Center',
      },
      evidence: [
        {
          source: 'graph-router',
          simulated: true,
          metric: 'delay_reduction_days',
          value: 2.5,
          unit: 'days',
          ts: '2026-10-17T12:31:00Z',
        },
      ],
    },
    {
      id: 'r_502',
      disruption_id: 'd_101',
      rank: 2,
      action_type: 'alternate_supplier',
      title: 'Activate alternate supplier',
      explanation: 'Component stock below threshold. Switch to qualified supplier in Vietnam.',
      delay_saved_h: 40.0,
      cost_delta_pct: 5.2,
      risk_reduction: 44,
      confidence: 0.80,
      status: 'proposed',
      params: {
        new_supplier_id: 'SUP_vietnam_02',
        reallocated_units: 420,
      },
      evidence: [
        {
          source: 'supplier-index',
          simulated: true,
          metric: 'supplier_lead_time_days',
          value: 3.0,
          unit: 'days',
          ts: '2026-10-17T12:31:00Z',
        },
      ],
    },
    {
      id: 'r_503',
      disruption_id: 'd_102',
      rank: 3,
      action_type: 'increase_safety_stock',
      title: 'Increase safety stock',
      explanation: 'Weather disruption may delay replenishment. Increase stock by 2 weeks.',
      delay_saved_h: 0.0,
      cost_delta_pct: 2.1,
      risk_reduction: 36,
      confidence: 0.76,
      status: 'proposed',
      params: {
        target_location: 'Rotterdam Hub',
        additional_buffer_days: 14,
      },
      evidence: [
        {
          source: 'inventory-planner',
          simulated: true,
          metric: 'holding_cost_delta_pct',
          value: 2.1,
          unit: '%',
          ts: '2026-10-17T10:32:00Z',
        },
      ],
    },
  ],
};

const initialNetwork: NetworkData = {
  locations: [
    { id: 'LOC_rotterdam', name: 'Rotterdam', type: 'hub', lat: 51.9244, lng: 4.4777 },
    { id: 'LOC_new_york', name: 'New York', type: 'hub', lat: 40.7128, lng: -74.0060 },
    { id: 'LOC_shanghai', name: 'Shanghai', type: 'hub', lat: 31.2304, lng: 121.4737 },
    { id: 'LOC_shenzhen', name: 'Shenzhen', type: 'supplier', lat: 22.5431, lng: 114.0579 },
    { id: 'LOC_singapore', name: 'Singapore', type: 'hub', lat: 1.3521, lng: 103.8198 },
    { id: 'LOC_santos', name: 'Santos', type: 'hub', lat: -23.9618, lng: -46.3322 },
    { id: 'LOC_mumbai', name: 'Mumbai', type: 'store', lat: 19.0760, lng: 72.8777 },
    { id: 'LOC_delhi', name: 'Delhi NCR', type: 'warehouse', lat: 28.6139, lng: 77.2090 },
    { id: 'LOC_bengaluru', name: 'Bengaluru', type: 'warehouse', lat: 12.9716, lng: 77.5946 },
    { id: 'LOC_pune', name: 'Pune', type: 'supplier', lat: 18.5204, lng: 73.8567 },
    { id: 'LOC_nagpur', name: 'Nagpur', type: 'warehouse', lat: 21.1458, lng: 79.0882 },
  ],
  lanes: [
    {
      id: 'L_ny_rotterdam',
      from_id: 'LOC_new_york',
      to_id: 'LOC_rotterdam',
      from_name: 'New York',
      to_name: 'Rotterdam',
      distance_km: 5860,
      baseline_duration_s: 864000,
      current_duration_s: 950400,
      cost: 18500,
      risk_score: 22,
      level: 'low',
      geometry: {
        type: 'LineString',
        coordinates: [[-74.0060, 40.7128], [-40.0, 48.0], [4.4777, 51.9244]],
      },
    },
    {
      id: 'L_rotterdam_shanghai',
      from_id: 'LOC_rotterdam',
      to_id: 'LOC_shanghai',
      from_name: 'Rotterdam',
      to_name: 'Shanghai',
      distance_km: 19200,
      baseline_duration_s: 2419200,
      current_duration_s: 3024000,
      cost: 34000,
      risk_score: 82,
      level: 'high',
      geometry: {
        type: 'LineString',
        coordinates: [[4.4777, 51.9244], [35.0, 30.0], [70.0, 20.0], [121.4737, 31.2304]],
      },
    },
    {
      id: 'L_shanghai_shenzhen',
      from_id: 'LOC_shanghai',
      to_id: 'LOC_shenzhen',
      from_name: 'Shanghai',
      to_name: 'Shenzhen',
      distance_km: 1210,
      baseline_duration_s: 86400,
      current_duration_s: 129600,
      cost: 2400,
      risk_score: 68,
      level: 'medium',
      geometry: {
        type: 'LineString',
        coordinates: [[121.4737, 31.2304], [118.0, 26.0], [114.0579, 22.5431]],
      },
    },
    {
      id: 'L_shenzhen_singapore',
      from_id: 'LOC_shenzhen',
      to_id: 'LOC_singapore',
      from_name: 'Shenzhen',
      to_name: 'Singapore',
      distance_km: 2600,
      baseline_duration_s: 259200,
      current_duration_s: 388800,
      cost: 5200,
      risk_score: 86,
      level: 'high',
      geometry: {
        type: 'LineString',
        coordinates: [[114.0579, 22.5431], [108.0, 12.0], [103.8198, 1.3521]],
      },
    },
    {
      id: 'L_singapore_santos',
      from_id: 'LOC_singapore',
      to_id: 'LOC_santos',
      from_name: 'Singapore',
      to_name: 'Santos',
      distance_km: 15900,
      baseline_duration_s: 2160000,
      current_duration_s: 2246400,
      cost: 28000,
      risk_score: 18,
      level: 'low',
      geometry: {
        type: 'LineString',
        coordinates: [[103.8198, 1.3521], [60.0, -15.0], [20.0, -32.0], [-46.3322, -23.9618]],
      },
    },
    {
      id: 'L_santos_new_york',
      from_id: 'LOC_santos',
      to_id: 'LOC_new_york',
      from_name: 'Santos',
      to_name: 'New York',
      distance_km: 7680,
      baseline_duration_s: 1036800,
      current_duration_s: 1209600,
      cost: 16400,
      risk_score: 52,
      level: 'medium',
      geometry: {
        type: 'LineString',
        coordinates: [[-46.3322, -23.9618], [-55.0, 5.0], [-74.0060, 40.7128]],
      },
    },
  ],
};

const initialShipments: Shipment[] = [
  {
    id: 'S-101',
    supplier_id: 'SUP_rotterdam_01',
    supplier_name: 'EuroTrans Logistics BV',
    origin_id: 'LOC_rotterdam',
    origin_name: 'Rotterdam',
    destination_id: 'LOC_shanghai',
    destination_name: 'Shanghai East Port',
    sku: 'SKU-02',
    sku_name: 'Precision Hydraulic Valves',
    qty: 850,
    status: 'delayed',
    planned_eta: '2026-10-24T18:00:00Z',
    current_eta: '2026-10-26T06:00:00Z',
    delay_h: 36.0,
    risk_level: 'high',
    route_lane_ids: ['L_rotterdam_shanghai'],
  },
  {
    id: 'S-104',
    supplier_id: 'SUP_shenzhen_01',
    supplier_name: 'Shenzhen Precision Electronics',
    origin_id: 'LOC_shenzhen',
    origin_name: 'Shenzhen',
    destination_id: 'LOC_delhi',
    destination_name: 'Delhi NCR Hub',
    sku: 'SKU-01',
    sku_name: 'Industrial Electronic Controller',
    qty: 420,
    status: 'delayed',
    planned_eta: '2026-10-19T14:00:00Z',
    current_eta: '2026-10-21T14:00:00Z',
    delay_h: 48.0,
    risk_level: 'high',
    route_lane_ids: ['L_shenzhen_singapore', 'L_singapore_santos'],
  },
  {
    id: 'S-105',
    supplier_id: 'SUP_rotterdam_01',
    supplier_name: 'EuroTrans Logistics BV',
    origin_id: 'LOC_rotterdam',
    origin_name: 'Rotterdam',
    destination_id: 'LOC_new_york',
    destination_name: 'New York Terminal',
    sku: 'SKU-03',
    sku_name: 'Heavy Machinery Bearings',
    qty: 300,
    status: 'in_transit',
    planned_eta: '2026-10-22T08:00:00Z',
    current_eta: '2026-10-22T10:30:00Z',
    delay_h: 2.5,
    risk_level: 'low',
    route_lane_ids: ['L_ny_rotterdam'],
  },
  {
    id: 'S-108',
    supplier_id: 'SUP_pune_01',
    supplier_name: 'Maharashtra Precision Components',
    origin_id: 'LOC_pune',
    origin_name: 'Pune',
    destination_id: 'LOC_mumbai',
    destination_name: 'Mumbai Store',
    sku: 'SKU-04',
    sku_name: 'Automotive Sensors',
    qty: 1200,
    status: 'in_transit',
    planned_eta: '2026-10-18T10:00:00Z',
    current_eta: '2026-10-18T14:00:00Z',
    delay_h: 4.0,
    risk_level: 'medium',
    route_lane_ids: ['L_mumbai_pune'],
  },
  {
    id: 'S-112',
    supplier_id: 'SUP_new_york_01',
    supplier_name: 'Atlantic Cargo Corp',
    origin_id: 'LOC_new_york',
    origin_name: 'New York',
    destination_id: 'LOC_santos',
    destination_name: 'Santos Depot',
    sku: 'SKU-06',
    sku_name: 'Specialty Polymer Compound',
    qty: 650,
    status: 'in_transit',
    planned_eta: '2026-10-25T16:00:00Z',
    current_eta: '2026-10-26T00:30:00Z',
    delay_h: 8.5,
    risk_level: 'medium',
    route_lane_ids: ['L_santos_new_york'],
  },
  {
    id: 'S-115',
    supplier_id: 'SUP_santos_01',
    supplier_name: 'Brazil Agro-Industrial Ltd',
    origin_id: 'LOC_santos',
    origin_name: 'Santos',
    destination_id: 'LOC_singapore',
    destination_name: 'Singapore Transshipment Center',
    sku: 'SKU-07',
    sku_name: 'Raw Cellulose Fibers',
    qty: 2000,
    status: 'delayed',
    planned_eta: '2026-10-27T12:00:00Z',
    current_eta: '2026-10-28T16:00:00Z',
    delay_h: 28.0,
    risk_level: 'medium',
    route_lane_ids: ['L_singapore_santos'],
  },
];

const initialSuppliers: Supplier[] = [
  {
    id: 'SUP_shenzhen_01',
    name: 'Shenzhen Precision Electronics',
    location_id: 'LOC_shenzhen',
    location_name: 'Shenzhen, China',
    base_lead_time_days: 5.0,
    current_delay_days: 2.0,
    on_time_rate: 62.4,
    reliability_score: 0.65,
    active_disruptions_count: 1,
  },
  {
    id: 'SUP_rotterdam_01',
    name: 'EuroTrans Logistics BV',
    location_id: 'LOC_rotterdam',
    location_name: 'Rotterdam, NL',
    base_lead_time_days: 3.0,
    current_delay_days: 1.5,
    on_time_rate: 81.0,
    reliability_score: 0.79,
    active_disruptions_count: 1,
  },
  {
    id: 'SUP_pune_01',
    name: 'Maharashtra Precision Components',
    location_id: 'LOC_pune',
    location_name: 'Pune, India',
    base_lead_time_days: 4.5,
    current_delay_days: 0.0,
    on_time_rate: 93.5,
    reliability_score: 0.94,
    active_disruptions_count: 0,
  },
  {
    id: 'SUP_new_york_01',
    name: 'Atlantic Cargo Corp',
    location_id: 'LOC_new_york',
    location_name: 'New York, USA',
    base_lead_time_days: 2.0,
    current_delay_days: 0.5,
    on_time_rate: 89.0,
    reliability_score: 0.88,
    active_disruptions_count: 1,
  },
  {
    id: 'SUP_santos_01',
    name: 'Brazil Agro-Industrial Ltd',
    location_id: 'LOC_santos',
    location_name: 'Santos, Brazil',
    base_lead_time_days: 7.0,
    current_delay_days: 1.2,
    on_time_rate: 78.5,
    reliability_score: 0.75,
    active_disruptions_count: 1,
  },
];

export const scenariosList: SimulatorScenario[] = [
  {
    id: 'sc_01',
    name: 'Heavy rain on Mumbai-Pune corridor',
    description: 'Monsoon storm with heavy precipitation (>25mm/h) and high winds.',
    type: 'weather',
  },
  {
    id: 'sc_02',
    name: 'Highway closure Nagpur-Hyderabad',
    description: 'Major highway blockage causing traffic multiplier > 2.2x on corridor.',
    type: 'traffic',
  },
  {
    id: 'sc_03',
    name: 'Severe congestion Delhi-Jaipur',
    description: 'Peak rush hour gridlock exceeding 1.7x baseline duration.',
    type: 'traffic',
  },
  {
    id: 'sc_04',
    name: 'Pune supplier delayed 48 hours',
    description: 'Core manufacturing supplier experiencing breakdown causing 48h delay.',
    type: 'supplier_delay',
  },
  {
    id: 'sc_06',
    name: 'Delhi warehouse inventory stockout',
    description: 'Stock for high-velocity SKU falls below 2 days cover against 6-day lead time.',
    type: 'inventory',
  },
  {
    id: 'sc_16',
    name: 'Normal baseline operations (Negative)',
    description: 'All signals within nominal historical boundaries across the network.',
    type: 'baseline',
  },
];

// Active state
let overviewState: OverviewData = JSON.parse(JSON.stringify(initialOverview));
let networkState: NetworkData = JSON.parse(JSON.stringify(initialNetwork));
let shipmentsState: Shipment[] = JSON.parse(JSON.stringify(initialShipments));
let suppliersState: Supplier[] = JSON.parse(JSON.stringify(initialSuppliers));

type Listener = (event: WsAlertEvent) => void;
const listeners: Set<Listener> = new Set();

export function subscribeAlerts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function broadcast(event: WsAlertEvent) {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      console.error(e);
    }
  });
}

export const mockStore = {
  getOverview: (): OverviewData => {
    return JSON.parse(JSON.stringify(overviewState));
  },

  getNetwork: (): NetworkData => {
    return JSON.parse(JSON.stringify(networkState));
  },

  getDisruptions: (status?: string, type?: string, level?: string): Disruption[] => {
    let list = overviewState.recent_disruptions;
    if (status && status !== 'all') {
      list = list.filter((d) => d.status === status);
    }
    if (type) {
      list = list.filter((d) => d.type === type);
    }
    if (level) {
      list = list.filter((d) => d.level === level);
    }
    return JSON.parse(JSON.stringify(list));
  },

  getDisruptionDetail: (id: string): DisruptionDetail | null => {
    const d = overviewState.recent_disruptions.find((item) => item.id === id);
    if (!d) return null;
    const recs = overviewState.recommended_actions.filter((r) => r.disruption_id === id);
    return {
      ...JSON.parse(JSON.stringify(d)),
      recommendations: recs,
      history: [
        {
          ts: d.detected_at,
          event: 'disruption_detected',
          description: `Disruption ${d.issue_title} detected on ${d.entity.name}. Calculated initial risk: ${d.risk_score} (${d.level}).`,
        },
        {
          ts: '2026-10-17T12:31:00Z',
          event: 'recommendations_generated',
          description: `Generated ${recs.length} candidate action plans.`,
        },
      ],
    };
  },

  getShipments: (): Shipment[] => {
    return JSON.parse(JSON.stringify(shipmentsState));
  },

  getSuppliers: (): Supplier[] => {
    return JSON.parse(JSON.stringify(suppliersState));
  },

  getRouteCompare: (shipmentId: string, priority = 'balanced'): RouteCompareData => {
    const shipment = shipmentsState.find((s) => s.id === shipmentId) || shipmentsState[1];
    return {
      shipment_id: shipment.id,
      priority: priority as any,
      current: {
        route_id: 'route_curr_104',
        route_name: `Standard Route (${shipment.origin_name} to ${shipment.destination_name})`,
        lane_ids: shipment.route_lane_ids,
        distance_km: 18500,
        duration_h: 224.0,
        cost: 33200,
        risk_score: shipment.risk_level === 'high' ? 86 : 52,
        level: shipment.risk_level,
        geometry: {
          type: 'LineString',
          coordinates: [[114.0579, 22.5431], [103.8198, 1.3521], [-46.3322, -23.9618]],
        },
      },
      alternatives: [
        {
          route_id: 'route_alt_1',
          route_name: 'Optimized Bypass via Singapore Deep Hub',
          lane_ids: ['L_shenzhen_singapore_bypass', 'L_singapore_santos_express'],
          distance_km: 18950,
          duration_h: 172.0,
          cost: 34450,
          risk_score: 28,
          level: 'low',
          geometry: {
            type: 'LineString',
            coordinates: [[114.0579, 22.5431], [108.0, 10.0], [103.8198, 1.3521], [60.0, -10.0], [-46.3322, -23.9618]],
          },
          rank: priority === 'cheapest' ? 2 : 1,
          utility: priority === 'cheapest' ? 0.72 : 0.88,
          delta: {
            duration_h: -52.0,
            cost_pct: 3.8,
            risk: -58,
          },
        },
        {
          route_id: 'route_alt_2',
          route_name: 'Northern Maritime Hub via Rotterdam',
          lane_ids: ['L_shenzhen_shanghai', 'L_shanghai_rotterdam'],
          distance_km: 26270,
          duration_h: 190.0,
          cost: 36100,
          risk_score: 38,
          level: 'medium',
          geometry: {
            type: 'LineString',
            coordinates: [[114.0579, 22.5431], [121.4737, 31.2304], [4.4777, 51.9244]],
          },
          rank: priority === 'cheapest' ? 3 : 2,
          utility: 0.74,
          delta: {
            duration_h: -34.0,
            cost_pct: 8.7,
            risk: -48,
          },
        },
        {
          route_id: 'route_alt_3',
          route_name: 'Direct Air Cargo Express',
          lane_ids: ['L_air_shenzhen_delhi'],
          distance_km: 3750,
          duration_h: 36.0,
          cost: 58000,
          risk_score: 15,
          level: 'low',
          geometry: {
            type: 'LineString',
            coordinates: [[114.0579, 22.5431], [90.0, 25.0], [77.2090, 28.6139]],
          },
          rank: priority === 'fastest' ? 1 : 3,
          utility: priority === 'fastest' ? 0.95 : 0.58,
          delta: {
            duration_h: -188.0,
            cost_pct: 74.7,
            risk: -71,
          },
        },
      ],
    };
  },

  approveRecommendation: (id: string): ApproveResult => {
    const rec = overviewState.recommended_actions.find((r) => r.id === id);
    if (rec) {
      rec.status = 'approved';
    }

    // Lower the corresponding disruption risk
    const disruption = overviewState.recent_disruptions.find((d) => d.id === (rec?.disruption_id || 'd_101'));
    const beforeRisk = disruption ? disruption.risk_score : 86;
    const afterRisk = Math.max(18, beforeRisk - (rec ? rec.risk_reduction : 58));

    if (disruption) {
      disruption.risk_score = afterRisk;
      disruption.level = afterRisk > 65 ? 'high' : afterRisk > 35 ? 'medium' : 'low';
      disruption.status = 'resolved';
      disruption.resolved_at = new Date().toISOString();
    }

    // Update KPI numbers
    overviewState.kpis.total_active_risks = Math.max(0, overviewState.kpis.total_active_risks - 1);
    overviewState.kpis.high_severity_count = Math.max(0, overviewState.kpis.high_severity_count - 1);
    overviewState.kpis.total_revenue_at_risk = Math.max(0, overviewState.kpis.total_revenue_at_risk - 185000);

    // Update affected shipment
    const shipment = shipmentsState.find((s) => s.id === 'S-104');
    if (shipment) {
      shipment.status = 'rerouted';
      shipment.risk_level = 'low';
      shipment.delay_h = 4.0;
    }

    const result: ApproveResult = {
      success: true,
      recommendation_id: id,
      action_type: rec ? rec.action_type : 'reroute',
      before_risk_score: beforeRisk,
      after_risk_score: afterRisk,
      message: `Recommendation ${id} successfully approved. Action applied to network.`,
      applied_at: new Date().toISOString(),
    };

    broadcast({
      event: 'plan_applied',
      ts: new Date().toISOString(),
      data: result,
    });

    return result;
  },

  injectScenario: (scenarioId: string) => {
    const sc = scenariosList.find((s) => s.id === scenarioId) || scenariosList[0];

    const newDisruption: Disruption = {
      id: `d_sim_${Date.now()}`,
      type: (sc.type as any) || 'weather',
      entity: {
        type: 'lane',
        id: 'L_mumbai_pune',
        name: 'Mumbai to Pune Corridor',
        location_label: 'Mumbai-Pune, India',
      },
      severity: 0.89,
      confidence: 0.92,
      risk_score: 87,
      level: 'high',
      status: 'open',
      detected_at: new Date().toISOString(),
      time_ago: 'Just now',
      issue_title: sc.name,
      impact_summary: sc.description,
      impact: {
        affected_shipments: ['S-108'],
        extra_delay_h: 12.0,
        stockout_date: '2026-10-20',
        units_short: 310,
        revenue_at_risk: 115000,
      },
      evidence: [
        {
          source: 'simulator-engine',
          simulated: true,
          metric: 'scenario_injection',
          value: 1.0,
          unit: 'active',
          ts: new Date().toISOString(),
        },
      ],
    };

    overviewState.recent_disruptions.unshift(newDisruption);
    overviewState.kpis.total_active_risks += 1;
    overviewState.kpis.high_severity_count += 1;
    overviewState.kpis.total_revenue_at_risk += 115000;

    broadcast({
      event: 'disruption_created',
      ts: new Date().toISOString(),
      data: { disruption: newDisruption },
    });

    return {
      success: true,
      scenario_id: scenarioId,
      injected_disruption_id: newDisruption.id,
      description: `Injected scenario: ${sc.name}`,
      status: 'active',
    };
  },

  resetSimulation: () => {
    overviewState = JSON.parse(JSON.stringify(initialOverview));
    networkState = JSON.parse(JSON.stringify(initialNetwork));
    shipmentsState = JSON.parse(JSON.stringify(initialShipments));
    suppliersState = JSON.parse(JSON.stringify(initialSuppliers));

    broadcast({
      event: 'disruption_resolved',
      ts: new Date().toISOString(),
      data: { message: 'Simulation reset to baseline' },
    });

    return {
      success: true,
      message: 'Simulation network reset to seeded pristine state.',
      restored_seed: 42,
    };
  },
};
