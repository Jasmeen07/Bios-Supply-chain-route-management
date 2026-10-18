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

// Canonical Indian logistics network locations
export const NETWORK_LOCATIONS: Record<string, { name: string; lat: number; lng: number; type: string }> = {
  pune: { name: 'Pune Engineering Works', lat: 18.5204, lng: 73.8567, type: 'supplier' },
  delhi: { name: 'Delhi NCR Central Hub', lat: 28.6139, lng: 77.2090, type: 'warehouse' },
  mumbai: { name: 'Mumbai Port & Store', lat: 19.0760, lng: 72.8777, type: 'store' },
  nagpur: { name: 'Nagpur Multi-Modal Hub', lat: 21.1458, lng: 79.0882, type: 'warehouse' },
  hyderabad: { name: 'Hyderabad Store', lat: 17.3850, lng: 78.4867, type: 'store' },
  bengaluru: { name: 'Bengaluru Distribution Center', lat: 12.9716, lng: 77.5946, type: 'warehouse' },
  chennai: { name: 'Chennai Electronics Hub', lat: 13.0827, lng: 80.2707, type: 'supplier' },
  surat: { name: 'Surat Chemical & Pharma', lat: 21.1702, lng: 72.8311, type: 'supplier' },
  ludhiana: { name: 'Ludhiana Textiles & Auto', lat: 30.9010, lng: 75.8573, type: 'supplier' },
  kolkata: { name: 'Kolkata Eastern Gateway', lat: 22.5726, lng: 88.3639, type: 'store' },
  jaipur: { name: 'Jaipur Transit Node', lat: 26.9124, lng: 75.7873, type: 'store' },
  lucknow: { name: 'Lucknow Northern Hub', lat: 26.8467, lng: 80.9462, type: 'store' },
};

// Initial data states aligned with contracts fixtures and Indian logistics hubs
const initialOverview: OverviewData = {
  kpis: {
    total_active_risks: 8,
    high_severity_count: 3,
    total_shipments_at_risk: 4,
    total_revenue_at_risk: 345000,
    on_time_network_rate: 89.2,
  },
  active_risks_by_cause: {
    supplier_delay: 3,
    weather: 3,
    traffic: 2,
    inventory_shortage: 1,
    geopolitical: 0,
  },
  regional_risk_levels: [
    { region: 'Western Corridor (MH/GJ)', level: 'high', score: 84 },
    { region: 'Northern Corridor (NCR/PB/UP)', level: 'medium', score: 58 },
    { region: 'Southern Corridor (KA/TN/TS)', level: 'low', score: 32 },
    { region: 'Central Hub (Nagpur)', level: 'medium', score: 62 },
    { region: 'Eastern Gateway (WB)', level: 'low', score: 26 },
  ],
  recent_disruptions: [
    {
      id: 'd_108',
      type: 'weather',
      entity: {
        type: 'lane',
        id: 'L_mumbai_pune',
        name: 'Mumbai to Pune Freight Corridor (NH 48)',
        location_label: 'Khandala Ghat, Maharashtra',
      },
      severity: 0.89,
      confidence: 0.94,
      risk_score: 87,
      level: 'high',
      status: 'open',
      detected_at: '2026-10-18T10:15:00Z',
      time_ago: '1 hr ago',
      issue_title: 'Torrential Rain & Monsoon Mudslide Warning',
      impact_summary: 'Severe traffic standstill along Mumbai-Pune expressway; critical automotive parts delayed',
      impact: {
        affected_shipments: ['S-108'],
        extra_delay_h: 12.0,
        stockout_date: '2026-10-19',
        units_short: 350,
        revenue_at_risk: 125000,
      },
      evidence: [
        {
          source: 'imd-weather-radar',
          simulated: true,
          metric: 'precipitation_mm_hr',
          value: 38.5,
          unit: 'mm/h',
          ts: '2026-10-18T10:10:00Z',
        },
        {
          source: 'nhai-toll-sensors',
          simulated: true,
          metric: 'traffic_congestion_ratio',
          value: 2.4,
          unit: 'x baseline',
          ts: '2026-10-18T10:12:00Z',
        },
      ],
    },
    {
      id: 'd_104',
      type: 'weather',
      entity: {
        type: 'lane',
        id: 'L_pune_delhi',
        name: 'Pune to Delhi NCR Western Freight Corridor',
        location_label: 'Western Corridor (Surat-Vadodara Section)',
      },
      severity: 0.84,
      confidence: 0.88,
      risk_score: 82,
      level: 'high',
      status: 'open',
      detected_at: '2026-10-18T08:30:00Z',
      time_ago: '3 hrs ago',
      issue_title: 'Heavy Thunderstorm & Road Blockage',
      impact_summary: 'Heavy waterlogging along Western Highway; expected delay 16 hours for electronics shipments',
      impact: {
        affected_shipments: ['S-104'],
        extra_delay_h: 16.0,
        stockout_date: '2026-10-21',
        units_short: 420,
        revenue_at_risk: 140000,
      },
      evidence: [
        {
          source: 'traffic-telemetry',
          simulated: true,
          metric: 'speed_reduction_pct',
          value: 65.0,
          unit: '%',
          ts: '2026-10-18T08:25:00Z',
        },
      ],
    },
    {
      id: 'd_102',
      type: 'traffic',
      entity: {
        type: 'lane',
        id: 'L_nagpur_hyderabad',
        name: 'Nagpur to Hyderabad Transit Highway (NH 44)',
        location_label: 'Adilabad Border Section',
      },
      severity: 0.78,
      confidence: 0.85,
      risk_score: 74,
      level: 'high',
      status: 'open',
      detected_at: '2026-10-18T06:00:00Z',
      time_ago: '5 hrs ago',
      issue_title: 'Roadwork & Single-lane Diversion',
      impact_summary: 'Major highway repairs causing 8-hour bottleneck on central north-south link',
      impact: {
        affected_shipments: ['S-102'],
        extra_delay_h: 8.0,
        stockout_date: '2026-10-22',
        units_short: 200,
        revenue_at_risk: 80000,
      },
      evidence: [
        {
          source: 'nhai-sensors',
          simulated: true,
          metric: 'queue_length_km',
          value: 7.2,
          unit: 'km',
          ts: '2026-10-18T05:55:00Z',
        },
      ],
    },
  ],
  recommended_actions: [
    {
      id: 'r_108',
      disruption_id: 'd_108',
      rank: 1,
      action_type: 'reroute',
      title: 'Bypass via Mumbai-Pune Expressway Northern Link',
      explanation: 'Divert around Khandala waterlogged section via Talegaon-Panvel corridor. Saves 9 hours delay.',
      delay_saved_h: 9.0,
      cost_delta_pct: 4.5,
      risk_reduction: 62,
      confidence: 0.91,
      status: 'proposed',
      params: {
        shipment_id: 'S-108',
        new_waypoint: 'Panvel Bypass Link',
      },
      evidence: [
        {
          source: 'graph-router',
          simulated: true,
          metric: 'delay_reduction_hours',
          value: 9.0,
          unit: 'hours',
          ts: '2026-10-18T10:16:00Z',
        },
      ],
    },
    {
      id: 'r_104',
      disruption_id: 'd_104',
      rank: 1,
      action_type: 'reroute',
      title: 'Divert via Central Corridor (Nashik - Indore - Agra)',
      explanation: 'Avoid waterlogged Gujarat highway sector; route via Central India freight highway.',
      delay_saved_h: 12.0,
      cost_delta_pct: 6.2,
      risk_reduction: 56,
      confidence: 0.88,
      status: 'proposed',
      params: {
        shipment_id: 'S-104',
        new_waypoint: 'Indore Central Interchange',
      },
      evidence: [
        {
          source: 'graph-router',
          simulated: true,
          metric: 'delay_reduction_hours',
          value: 12.0,
          unit: 'hours',
          ts: '2026-10-18T08:31:00Z',
        },
      ],
    },
  ],
};

const initialShipments: Shipment[] = [
  {
    id: 'S-108',
    supplier_id: 'SUP-PUNE',
    supplier_name: 'Pune Engineering Works Ltd',
    origin_id: 'pune',
    origin_name: 'Pune',
    destination_id: 'mumbai',
    destination_name: 'Mumbai Port & Store',
    sku: 'SKU-AUTO',
    sku_name: 'Precision Automotive Sensors',
    qty: 1200,
    status: 'delayed',
    planned_eta: '2026-10-18T14:00:00Z',
    current_eta: '2026-10-19T02:00:00Z',
    delay_h: 12.0,
    risk_level: 'high',
    route_lane_ids: ['L_mumbai_pune'],
  },
  {
    id: 'S-104',
    supplier_id: 'SUP-PUNE',
    supplier_name: 'Pune Engineering Works Ltd',
    origin_id: 'pune',
    origin_name: 'Pune',
    destination_id: 'delhi',
    destination_name: 'Delhi NCR Central Hub',
    sku: 'SKU-ELEC',
    sku_name: 'Industrial Electronic Controllers',
    qty: 450,
    status: 'delayed',
    planned_eta: '2026-10-19T10:00:00Z',
    current_eta: '2026-10-20T02:00:00Z',
    delay_h: 16.0,
    risk_level: 'high',
    route_lane_ids: ['L_pune_delhi'],
  },
  {
    id: 'S-102',
    supplier_id: 'SUP-NAGPUR',
    supplier_name: 'Nagpur Multi-Modal Corp',
    origin_id: 'nagpur',
    origin_name: 'Nagpur',
    destination_id: 'hyderabad',
    destination_name: 'Hyderabad Store',
    sku: 'SKU-AUTO',
    sku_name: 'Hydraulic Transit Valves',
    qty: 600,
    status: 'delayed',
    planned_eta: '2026-10-19T18:00:00Z',
    current_eta: '2026-10-20T02:00:00Z',
    delay_h: 8.0,
    risk_level: 'high',
    route_lane_ids: ['L_nagpur_hyderabad'],
  },
  {
    id: 'S-103',
    supplier_id: 'SUP-DELHI',
    supplier_name: 'Delhi NCR Central Logistics',
    origin_id: 'delhi',
    origin_name: 'Delhi NCR',
    destination_id: 'jaipur',
    destination_name: 'Jaipur Transit Node',
    sku: 'SKU-CONS',
    sku_name: 'Fast-Moving Consumer Goods',
    qty: 850,
    status: 'in_transit',
    planned_eta: '2026-10-18T20:00:00Z',
    current_eta: '2026-10-18T21:30:00Z',
    delay_h: 1.5,
    risk_level: 'low',
    route_lane_ids: ['L_delhi_jaipur'],
  },
  {
    id: 'S-101',
    supplier_id: 'SUP-LUDHIANA',
    supplier_name: 'Ludhiana Textiles & Auto Pvt Ltd',
    origin_id: 'ludhiana',
    origin_name: 'Ludhiana',
    destination_id: 'delhi',
    destination_name: 'Delhi NCR Central Hub',
    sku: 'SKU-FASH',
    sku_name: 'Apparel & Garment Cargo',
    qty: 900,
    status: 'in_transit',
    planned_eta: '2026-10-19T06:00:00Z',
    current_eta: '2026-10-19T07:00:00Z',
    delay_h: 1.0,
    risk_level: 'low',
    route_lane_ids: ['L_ludhiana_delhi'],
  },
  {
    id: 'S-105',
    supplier_id: 'SUP-SURAT',
    supplier_name: 'Surat Chemical & Pharma Co',
    origin_id: 'surat',
    origin_name: 'Surat',
    destination_id: 'delhi',
    destination_name: 'Delhi NCR Central Hub',
    sku: 'SKU-CHEM',
    sku_name: 'Pharmaceutical Grade Polymers',
    qty: 400,
    status: 'in_transit',
    planned_eta: '2026-10-20T12:00:00Z',
    current_eta: '2026-10-20T13:30:00Z',
    delay_h: 1.5,
    risk_level: 'low',
    route_lane_ids: ['L_surat_delhi'],
  },
  {
    id: 'S-106',
    supplier_id: 'SUP-CHENNAI',
    supplier_name: 'Chennai Electronics Hub Ltd',
    origin_id: 'chennai',
    origin_name: 'Chennai',
    destination_id: 'bengaluru',
    destination_name: 'Bengaluru Distribution Center',
    sku: 'SKU-ELEC',
    sku_name: 'Semi-conductor Sub-assemblies',
    qty: 750,
    status: 'in_transit',
    planned_eta: '2026-10-19T14:00:00Z',
    current_eta: '2026-10-19T15:00:00Z',
    delay_h: 1.0,
    risk_level: 'low',
    route_lane_ids: ['L_bengaluru_chennai'],
  },
];

const initialSuppliers: Supplier[] = [
  {
    id: 'SUP-PUNE',
    name: 'Pune Engineering Works Ltd',
    location_id: 'pune',
    location_name: 'Pune, Maharashtra',
    location: 'Pune, Maharashtra',
    base_lead_time_days: 4.5,
    current_delay_days: 1.8,
    on_time_rate: 78.5,
    reliability_score: 78,
    reliability: 0.78,
    active_shipments_count: 3,
    active_disruptions_count: 1,
    avg_delay_days: 1.8,
    risk_score: 82,
    status: 'flagged',
  },
  {
    id: 'SUP-SURAT',
    name: 'Surat Chemical & Pharma Co',
    location_id: 'surat',
    location_name: 'Surat, Gujarat',
    location: 'Surat, Gujarat',
    base_lead_time_days: 3.0,
    current_delay_days: 0.3,
    on_time_rate: 95.0,
    reliability_score: 95,
    reliability: 0.95,
    active_shipments_count: 2,
    active_disruptions_count: 0,
    avg_delay_days: 0.3,
    risk_score: 18,
    status: 'active',
  },
  {
    id: 'SUP-LUDHIANA',
    name: 'Ludhiana Textiles & Auto Pvt Ltd',
    location_id: 'ludhiana',
    location_name: 'Ludhiana, Punjab',
    location: 'Ludhiana, Punjab',
    base_lead_time_days: 5.0,
    current_delay_days: 0.5,
    on_time_rate: 92.0,
    reliability_score: 92,
    reliability: 0.92,
    active_shipments_count: 2,
    active_disruptions_count: 0,
    avg_delay_days: 0.5,
    risk_score: 24,
    status: 'active',
  },
  {
    id: 'SUP-CHENNAI',
    name: 'Chennai Electronics Hub Ltd',
    location_id: 'chennai',
    location_name: 'Chennai, Tamil Nadu',
    location: 'Chennai, Tamil Nadu',
    base_lead_time_days: 3.5,
    current_delay_days: 0.8,
    on_time_rate: 88.0,
    reliability_score: 88,
    reliability: 0.88,
    active_shipments_count: 2,
    active_disruptions_count: 0,
    avg_delay_days: 0.8,
    risk_score: 35,
    status: 'active',
  },
];

// Presets matching contracts/scenarios.yaml
export const scenariosList: SimulatorScenario[] = [
  {
    id: 'SCN_01',
    name: 'Heavy Rain on Pune-Delhi Corridor',
    description: 'Heavy rain & thunderstorm forecast along the Pune to Delhi freight corridor (NH 48).',
    type: 'weather',
    target_corridor: 'L_pune_delhi',
    affected_shipment_id: 'S-104',
  },
  {
    id: 'SCN_02',
    name: 'Highway Closure: Nagpur to Hyderabad',
    description: 'Major highway disruption and blockage between Nagpur and Hyderabad (NH 44).',
    type: 'traffic',
    target_corridor: 'L_nagpur_hyderabad',
    affected_shipment_id: 'S-102',
  },
  {
    id: 'SCN_03',
    name: 'Severe Congestion: Delhi to Jaipur',
    description: 'Gridlock and heavy peak hour traffic delay along NH 48 Delhi NCR to Jaipur.',
    type: 'traffic',
    target_corridor: 'L_delhi_jaipur',
    affected_shipment_id: 'S-103',
  },
  {
    id: 'SCN_04',
    name: 'Pune Supplier 48h Equipment Breakdown',
    description: 'Pune component manufacturing hub reports factory equipment breakdown and delivery delay.',
    type: 'supplier',
    target_corridor: 'SUP-PUNE',
    affected_shipment_id: 'S-108',
  },
  {
    id: 'SCN_08',
    name: 'Storm & Traffic on Surat-Delhi Corridor',
    description: 'Torrential downpour and accident hit Surat to Delhi corridor simultaneously.',
    type: 'weather',
    target_corridor: 'L_surat_delhi',
    affected_shipment_id: 'S-105',
  },
  {
    id: 'SCN_10',
    name: 'Traffic Gridlock: Bengaluru to Chennai',
    description: 'Industrial transit bottleneck and bridge repair on Bengaluru to Chennai corridor.',
    type: 'traffic',
    target_corridor: 'L_bengaluru_chennai',
    affected_shipment_id: 'S-106',
  },
  {
    id: 'SCN_13',
    name: 'Torrential Rain on Mumbai-Pune Corridor',
    description: 'Monsoon landslide warning and road inundation on Khandala Ghat section.',
    type: 'weather',
    target_corridor: 'L_mumbai_pune',
    affected_shipment_id: 'S-108',
  },
];

// Reactive in-memory state
let overviewState = JSON.parse(JSON.stringify(initialOverview));
let shipmentsState: Shipment[] = JSON.parse(JSON.stringify(initialShipments));
let suppliersState: Supplier[] = JSON.parse(JSON.stringify(initialSuppliers));
let subscribers: ((event: WsAlertEvent) => void)[] = [];

function broadcast(event: WsAlertEvent) {
  subscribers.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      console.error('Subscriber notification failed', e);
    }
  });
}

// Concrete geographic waypoints for realistic route alternatives
function generateRealisticCorridor(originId: string, destId: string, priority: string) {
  const o = NETWORK_LOCATIONS[originId] || NETWORK_LOCATIONS.pune;
  const d = NETWORK_LOCATIONS[destId] || NETWORK_LOCATIONS.delhi;

  // Specific high-fidelity paths for major lanes:
  if (originId === 'pune' && destId === 'mumbai') {
    return {
      current: [
        [18.5204, 73.8567], // Pune
        [18.7537, 73.4077], // Lonavala / Khandala Ghat (Blocked)
        [18.9894, 73.1175], // Panvel
        [19.0760, 72.8777], // Mumbai
      ],
      alt1: [
        [18.5204, 73.8567], // Pune
        [18.7300, 73.6800], // Talegaon Industrial Express
        [18.9200, 73.2500], // Khalapur Expressway Bypass
        [19.0200, 73.0200], // Navi Mumbai Northern Spine
        [19.0760, 72.8777], // Mumbai Port
      ],
      alt2: [
        [18.5204, 73.8567], // Pune Cargo Hub
        [18.5800, 73.9200], // Pune Airport (Air Corridor)
        [19.0900, 72.8600], // Mumbai BOM Air Freight
        [19.0760, 72.8777], // Mumbai Store
      ],
      alt1Name: 'Expressway Northern Bypass via Talegaon-Navi Mumbai',
      alt2Name: 'Expedited Air/Direct Transit Link',
      currDist: 152,
      currDur: 5.5,
      currCost: 3800,
      alt1Dist: 168,
      alt1Dur: 3.2,
      alt1Cost: 4200,
      alt2Dist: 150,
      alt2Dur: 1.8,
      alt2Cost: 7500,
    };
  }

  if (originId === 'pune' && destId === 'delhi') {
    return {
      current: [
        [18.5204, 73.8567], // Pune
        [19.0760, 72.8777], // Mumbai
        [21.1702, 72.8311], // Surat (Monsoon zone)
        [22.3072, 73.1812], // Vadodara
        [23.0225, 72.5714], // Ahmedabad
        [24.5854, 73.7125], // Udaipur
        [26.9124, 75.7873], // Jaipur
        [28.6139, 77.2090], // Delhi NCR
      ],
      alt1: [
        [18.5204, 73.8567], // Pune
        [19.9975, 73.7898], // Nashik
        [21.1458, 79.0882], // Nagpur Central Bypass
        [22.7196, 75.8577], // Indore
        [25.4484, 78.5685], // Jhansi
        [26.2183, 78.1828], // Gwalior
        [27.1767, 78.0081], // Agra
        [28.6139, 77.2090], // Delhi NCR
      ],
      alt2: [
        [18.5204, 73.8567], // Pune
        [20.5000, 74.8000], // Dedicated Freight Rail Corridor
        [23.5000, 76.5000], // Rail Transshipment Node
        [28.6139, 77.2090], // Delhi NCR ICD
      ],
      alt1Name: 'Central Freight Highway Bypass (Nashik-Indore-Gwalior)',
      alt2Name: 'Western Dedicated Freight Rail Corridor (WDFC)',
      currDist: 1420,
      currDur: 32.0,
      currCost: 18500,
      alt1Dist: 1490,
      alt1Dur: 26.5,
      alt1Cost: 19800,
      alt2Dist: 1380,
      alt2Dur: 18.0,
      alt2Cost: 24500,
    };
  }

  if (originId === 'nagpur' && destId === 'hyderabad') {
    return {
      current: [
        [21.1458, 79.0882], // Nagpur
        [20.1082, 78.5714], // Hinganghat
        [19.6641, 78.5320], // Adilabad (Repair Diversion)
        [18.6725, 78.0941], // Nizamabad
        [17.3850, 78.4867], // Hyderabad
      ],
      alt1: [
        [21.1458, 79.0882], // Nagpur
        [19.9500, 79.3000], // Chandrapur Eastern Bypass
        [18.8000, 79.5000], // Ramagundam Highway
        [17.9600, 79.6000], // Warangal Node
        [17.3850, 78.4867], // Hyderabad
      ],
      alt2: [
        [21.1458, 79.0882], // Nagpur
        [19.5000, 78.8000], // Expedited Rail Line
        [17.3850, 78.4867], // Hyderabad
      ],
      alt1Name: 'Eastern Arterial Corridor via Chandrapur-Warangal',
      alt2Name: 'South Central Rail Express Link',
      currDist: 502,
      currDur: 11.5,
      currCost: 7200,
      alt1Dist: 535,
      alt1Dur: 8.5,
      alt1Cost: 7800,
      alt2Dist: 495,
      alt2Dur: 6.0,
      alt2Cost: 11200,
    };
  }

  // Generic realistic interpolation between any two hubs:
  const midLat = (o.lat + d.lat) / 2;
  const midLng = (o.lng + d.lng) / 2;
  return {
    current: [
      [o.lat, o.lng],
      [midLat + 0.15, midLng - 0.25],
      [d.lat, d.lng],
    ],
    alt1: [
      [o.lat, o.lng],
      [midLat - 0.25, midLng + 0.35],
      [d.lat, d.lng],
    ],
    alt2: [
      [o.lat, o.lng],
      [midLat, midLng],
      [d.lat, d.lng],
    ],
    alt1Name: `Optimized Highway Bypass (${o.name} to ${d.name})`,
    alt2Name: `Direct Inter-State Expressway Link`,
    currDist: 650,
    currDur: 14.0,
    currCost: 9500,
    alt1Dist: 680,
    alt1Dur: 10.5,
    alt1Cost: 10200,
    alt2Dist: 640,
    alt2Dur: 8.0,
    alt2Cost: 14000,
  };
}

export const mockData = {
  subscribeAlerts: (callback: (event: WsAlertEvent) => void) => {
    subscribers.push(callback);
    return () => {
      subscribers = subscribers.filter((fn) => fn !== callback);
    };
  },

  getOverview: (): OverviewData => {
    return JSON.parse(JSON.stringify(overviewState));
  },

  getDisruptions: (statusFilter?: string, typeFilter?: string, levelFilter?: string): Disruption[] => {
    let list = overviewState.recent_disruptions;
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((d: Disruption) => d.status === statusFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
      list = list.filter((d: Disruption) => d.type === typeFilter);
    }
    if (levelFilter && levelFilter !== 'all') {
      list = list.filter((d: Disruption) => d.level === levelFilter);
    }
    return JSON.parse(JSON.stringify(list));
  },

  getDisruptionDetail: (id: string): DisruptionDetail | null => {
    const d = overviewState.recent_disruptions.find((item: Disruption) => item.id === id);
    if (!d) return null;
    const recs = overviewState.recommended_actions.filter((r: any) => r.disruption_id === id);
    return {
      ...JSON.parse(JSON.stringify(d)),
      recommendations: recs,
      history: [
        {
          ts: d.detected_at,
          event: 'disruption_detected',
          description: `Disruption ${d.issue_title} active on ${d.entity.name}. Calculated initial risk: ${d.risk_score} (${d.level}).`,
        },
        {
          ts: '2026-10-18T10:16:00Z',
          event: 'recommendations_generated',
          description: `Generated ${recs.length} alternative mitigation pathways.`,
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
    const shipment = shipmentsState.find((s) => s.id === shipmentId) || shipmentsState[0];
    const corridor = generateRealisticCorridor(shipment.origin_id, shipment.destination_id, priority);

    const isHighRisk = shipment.risk_level === 'high' || shipment.status === 'delayed';
    const currRisk = isHighRisk ? 87 : 24;

    return {
      shipment_id: shipment.id,
      priority: priority as any,
      current: {
        route_id: `route_curr_${shipment.id}`,
        route_name: `Primary Planned Corridor (${shipment.origin_name} to ${shipment.destination_name})`,
        lane_ids: shipment.route_lane_ids,
        distance_km: corridor.currDist,
        duration_h: corridor.currDur,
        cost: corridor.currCost,
        risk_score: currRisk,
        level: isHighRisk ? 'high' : 'low',
        geometry: {
          type: 'LineString',
          coordinates: corridor.current.map((pt) => [pt[1], pt[0]]), // GeoJSON is [lng, lat]
        },
      },
      alternatives: [
        {
          route_id: `route_alt_1_${shipment.id}`,
          route_name: corridor.alt1Name,
          lane_ids: ['L_bypass_corridor_1'],
          distance_km: corridor.alt1Dist,
          duration_h: corridor.alt1Dur,
          cost: corridor.alt1Cost,
          risk_score: 28,
          level: 'low',
          geometry: {
            type: 'LineString',
            coordinates: corridor.alt1.map((pt) => [pt[1], pt[0]]),
          },
          rank: priority === 'cheapest' ? 2 : 1,
          utility: priority === 'cheapest' ? 0.74 : 0.89,
          delta: {
            duration_h: -(corridor.currDur - corridor.alt1Dur),
            cost_pct: Math.round(((corridor.alt1Cost - corridor.currCost) / corridor.currCost) * 100),
            risk: -(currRisk - 28),
          },
        },
        {
          route_id: `route_alt_2_${shipment.id}`,
          route_name: corridor.alt2Name,
          lane_ids: ['L_express_link_2'],
          distance_km: corridor.alt2Dist,
          duration_h: corridor.alt2Dur,
          cost: corridor.alt2Cost,
          risk_score: 18,
          level: 'low',
          geometry: {
            type: 'LineString',
            coordinates: corridor.alt2.map((pt) => [pt[1], pt[0]]),
          },
          rank: priority === 'fastest' ? 1 : 2,
          utility: priority === 'fastest' ? 0.94 : 0.76,
          delta: {
            duration_h: -(corridor.currDur - corridor.alt2Dur),
            cost_pct: Math.round(((corridor.alt2Cost - corridor.currCost) / corridor.currCost) * 100),
            risk: -(currRisk - 18),
          },
        },
      ],
    };
  },

  approveRecommendation: (id: string): ApproveResult => {
    const rec = overviewState.recommended_actions.find((r: any) => r.id === id) || overviewState.recommended_actions[0];
    if (rec) {
      rec.status = 'approved';
    }

    const disruption = overviewState.recent_disruptions.find((d: Disruption) => d.id === (rec?.disruption_id || 'd_108'));
    const beforeRisk = disruption ? disruption.risk_score : 87;
    const afterRisk = Math.max(18, beforeRisk - (rec ? rec.risk_reduction : 58));

    if (disruption) {
      disruption.risk_score = afterRisk;
      disruption.level = afterRisk > 65 ? 'high' : afterRisk > 35 ? 'medium' : 'low';
      disruption.status = 'resolved';
      disruption.resolved_at = new Date().toISOString();
    }

    overviewState.kpis.total_active_risks = Math.max(0, overviewState.kpis.total_active_risks - 1);
    overviewState.kpis.high_severity_count = Math.max(0, overviewState.kpis.high_severity_count - 1);
    overviewState.kpis.total_revenue_at_risk = Math.max(0, overviewState.kpis.total_revenue_at_risk - 125000);

    const targetShipmentId = rec?.params?.shipment_id || (disruption?.impact?.affected_shipments?.[0]) || 'S-108';
    const shipment = shipmentsState.find((s) => s.id === targetShipmentId);
    if (shipment) {
      shipment.status = 'rerouted';
      shipment.risk_level = 'low';
      shipment.delay_h = 2.0;
    }

    const result: ApproveResult = {
      success: true,
      recommendation_id: id,
      action_type: rec ? rec.action_type : 'reroute',
      before_risk_score: beforeRisk,
      after_risk_score: afterRisk,
      message: `Alternative bypass route approved. Dispatch order sent to fleet.`,
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
    const targetShipment = shipmentsState.find((s) => s.id === sc.affected_shipment_id) || shipmentsState[0];

    // Mark the targeted shipment as delayed & high risk
    targetShipment.status = 'delayed';
    targetShipment.risk_level = 'high';
    targetShipment.delay_h = 14.0;

    const newDisruption: Disruption = {
      id: `d_sim_${Date.now()}`,
      type: (sc.type as any) || 'weather',
      entity: {
        type: sc.type === 'supplier' ? 'supplier' : 'lane',
        id: sc.target_corridor || 'L_mumbai_pune',
        name: sc.name,
        location_label: `${targetShipment.origin_name} to ${targetShipment.destination_name} Corridor`,
      },
      severity: 0.91,
      confidence: 0.95,
      risk_score: 89,
      level: 'high',
      status: 'open',
      detected_at: new Date().toISOString(),
      time_ago: 'Just now',
      issue_title: sc.name,
      impact_summary: sc.description,
      impact: {
        affected_shipments: [targetShipment.id],
        extra_delay_h: 14.0,
        stockout_date: '2026-10-20',
        units_short: 380,
        revenue_at_risk: 135000,
      },
      evidence: [
        {
          source: 'sensor-telemetry-engine',
          simulated: true,
          metric: 'anomaly_severity_score',
          value: 0.91,
          unit: 'score',
          ts: new Date().toISOString(),
        },
        {
          source: 'corridor-flow-radar',
          simulated: true,
          metric: 'transit_delay_hours',
          value: 14.0,
          unit: 'hours',
          ts: new Date().toISOString(),
        },
      ],
    };

    // Prepend new disruption
    overviewState.recent_disruptions.unshift(newDisruption);
    overviewState.kpis.total_active_risks += 1;
    overviewState.kpis.high_severity_count += 1;
    overviewState.kpis.total_revenue_at_risk += 135000;

    // Create matching proposed action
    const newRec = {
      id: `r_sim_${Date.now()}`,
      disruption_id: newDisruption.id,
      rank: 1,
      action_type: 'reroute',
      title: `Optimized bypass for Shipment ${targetShipment.id}`,
      explanation: `Automated dynamic route recalculation avoiding blockage on ${newDisruption.entity.name}.`,
      delay_saved_h: 10.5,
      cost_delta_pct: 4.8,
      risk_reduction: 61,
      confidence: 0.92,
      status: 'proposed',
      params: {
        shipment_id: targetShipment.id,
        new_waypoint: 'Dedicated Freight Highway Bypass',
      },
      evidence: [
        {
          source: 'graph-router',
          simulated: true,
          metric: 'delay_reduction_hours',
          value: 10.5,
          unit: 'hours',
          ts: new Date().toISOString(),
        },
      ],
    };
    overviewState.recommended_actions.unshift(newRec as any);

    broadcast({
      event: 'disruption_created',
      ts: new Date().toISOString(),
      data: { disruption: newDisruption },
    });

    return {
      success: true,
      scenario_id: sc.id,
      disruption_id: newDisruption.id,
      affected_shipment_id: targetShipment.id,
      shipment_summary: `${targetShipment.id}: ${targetShipment.origin_name} → ${targetShipment.destination_name}`,
      created_disruptions: [newDisruption],
      impact: newDisruption.impact,
    };
  },

  getNetwork: (): NetworkData => {
    return {
      locations: Object.entries(NETWORK_LOCATIONS).map(([id, l]) => ({
        id,
        name: l.name,
        type: l.type as any,
        lat: l.lat,
        lng: l.lng,
      })),
      lanes: [],
    };
  },

  resetSimulation: () => {
    overviewState = JSON.parse(JSON.stringify(initialOverview));
    shipmentsState = JSON.parse(JSON.stringify(initialShipments));
    suppliersState = JSON.parse(JSON.stringify(initialSuppliers));
    return { success: true, message: 'Simulation reset to baseline' };
  },
};

export const mockStore = mockData;
export const subscribeAlerts = mockData.subscribeAlerts;
