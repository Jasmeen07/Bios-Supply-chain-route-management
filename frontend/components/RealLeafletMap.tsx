'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Disruption, LaneEdge, LocationNode } from '../lib/types';
import {
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  MapPin,
  Truck,
  Ship,
  Plane,
  Eye,
} from 'lucide-react';

interface RealLeafletMapProps {
  disruptions?: Disruption[];
  onSelectDisruption?: (id: string) => void;
}

// Actual highway coordinates for India corridors
const indiaLanesData = [
  {
    id: 'L_mumbai_pune',
    name: 'Mumbai – Pune Corridor (NH 48 / Expressway)',
    from: 'Mumbai',
    to: 'Pune',
    risk: 'high',
    riskScore: 84,
    distanceKm: 148,
    durationH: 4.8,
    baselineH: 2.8,
    disruptionType: 'Severe Monsoon Rain & Waterlogging',
    coords: [
      [18.9388, 72.8354],
      [19.033, 73.0297],
      [18.9894, 73.1175],
      [18.7537, 73.4077],
      [18.7300, 73.4800],
      [18.6517, 73.7686],
      [18.5204, 73.8567],
    ] as [number, number][],
  },
  {
    id: 'L_delhi_jaipur',
    name: 'Delhi NCR – Jaipur Corridor (NH 48)',
    from: 'Delhi NCR',
    to: 'Jaipur',
    risk: 'medium',
    riskScore: 58,
    distanceKm: 275,
    durationH: 6.2,
    baselineH: 4.5,
    disruptionType: 'Peak Traffic Congestion at Gurugram/Bhiwadi',
    coords: [
      [28.6139, 77.209],
      [28.4595, 77.0266],
      [28.212, 76.845],
      [27.8872, 76.2796],
      [27.5312, 76.012],
      [27.3200, 75.9000],
      [26.9124, 75.7873],
    ] as [number, number][],
  },
  {
    id: 'L_delhi_ludhiana',
    name: 'Delhi NCR – Ludhiana Corridor (NH 44 / GT Road)',
    from: 'Delhi NCR',
    to: 'Ludhiana',
    risk: 'low',
    riskScore: 24,
    distanceKm: 312,
    durationH: 5.5,
    baselineH: 5.2,
    disruptionType: 'None (Flow Normal)',
    coords: [
      [28.6139, 77.209],
      [29.1492, 77.0863],
      [29.3909, 76.9635],
      [29.6857, 76.9905],
      [30.129, 76.8783],
      [30.3782, 76.7767],
      [30.6869, 76.398],
      [30.901, 75.8573],
    ] as [number, number][],
  },
  {
    id: 'L_delhi_nagpur',
    name: 'Delhi NCR – Nagpur Central Corridor (NH 44)',
    from: 'Delhi NCR',
    to: 'Nagpur',
    risk: 'low',
    riskScore: 32,
    distanceKm: 1085,
    durationH: 18.5,
    baselineH: 18.0,
    disruptionType: 'None (Normal Long-haul)',
    coords: [
      [28.6139, 77.209],
      [27.8974, 78.088],
      [27.1767, 78.0081],
      [26.7588, 78.0125],
      [26.2183, 78.1828],
      [25.4484, 78.5685],
      [24.6937, 78.4116],
      [23.8388, 78.7378],
      [23.1686, 79.9339],
      [22.0869, 79.5412],
      [21.1458, 79.0882],
    ] as [number, number][],
  },
  {
    id: 'L_nagpur_hyderabad',
    name: 'Nagpur – Hyderabad Transit Corridor (NH 44)',
    from: 'Nagpur',
    to: 'Hyderabad',
    risk: 'high',
    riskScore: 78,
    distanceKm: 502,
    durationH: 11.5,
    baselineH: 8.0,
    disruptionType: 'Roadwork & Single-lane Diversion',
    coords: [
      [21.1458, 79.0882],
      [20.5562, 78.8418],
      [20.1082, 78.5714],
      [19.6641, 78.532],
      [19.0964, 78.3421],
      [18.6725, 78.0941],
      [18.1018, 78.3421],
      [17.385, 78.4867],
    ] as [number, number][],
  },
  {
    id: 'L_hyderabad_bengaluru',
    name: 'Hyderabad – Bengaluru Corridor (NH 44)',
    from: 'Hyderabad',
    to: 'Bengaluru',
    risk: 'low',
    riskScore: 26,
    distanceKm: 569,
    durationH: 9.0,
    baselineH: 8.8,
    disruptionType: 'None (Flow Normal)',
    coords: [
      [17.385, 78.4867],
      [16.7488, 77.9856],
      [15.8281, 78.0373],
      [15.1394, 77.7844],
      [14.6819, 77.6006],
      [13.6288, 77.7289],
      [13.25, 77.7118],
      [12.9716, 77.5946],
    ] as [number, number][],
  },
  {
    id: 'L_bengaluru_chennai',
    name: 'Bengaluru – Chennai Corridor (NH 48)',
    from: 'Bengaluru',
    to: 'Chennai',
    risk: 'medium',
    riskScore: 52,
    distanceKm: 348,
    durationH: 6.8,
    baselineH: 5.5,
    disruptionType: 'Freight Terminal Queue at Chennai Outskirts',
    coords: [
      [12.9716, 77.5946],
      [12.7409, 77.8253],
      [12.5186, 78.2138],
      [12.6782, 78.6835],
      [12.9165, 79.1325],
      [12.9056, 79.5212],
      [12.8342, 79.7036],
      [13.0827, 80.2707],
    ] as [number, number][],
  },
  {
    id: 'L_mumbai_surat_ahmedabad',
    name: 'Mumbai – Surat – Ahmedabad Golden Corridor (NH 48)',
    from: 'Mumbai',
    to: 'Ahmedabad',
    risk: 'medium',
    riskScore: 60,
    distanceKm: 525,
    durationH: 10.2,
    baselineH: 8.5,
    disruptionType: 'Heavy Truck Inflow & Toll Gate Congestion',
    coords: [
      [19.076, 72.8777],
      [19.6967, 72.7699],
      [20.3893, 72.9106],
      [20.8997, 72.9288],
      [21.1702, 72.8311],
      [21.7051, 72.9959],
      [22.3072, 73.1812],
      [22.6916, 72.8634],
      [23.0225, 72.5714],
    ] as [number, number][],
  },
  {
    id: 'L_pune_bengaluru',
    name: 'Pune – Bengaluru South Corridor (NH 48)',
    from: 'Pune',
    to: 'Bengaluru',
    risk: 'low',
    riskScore: 28,
    distanceKm: 840,
    durationH: 14.0,
    baselineH: 13.5,
    disruptionType: 'None (Smooth Flow)',
    coords: [
      [18.5204, 73.8567],
      [17.6805, 74.0183],
      [17.28, 74.19],
      [16.705, 74.2433],
      [16.2, 74.4],
      [15.8497, 74.4977],
      [15.3647, 75.124],
      [14.8, 75.5],
      [14.4644, 75.9218],
      [13.9299, 76.2],
      [13.3409, 77.101],
      [12.9716, 77.5946],
    ] as [number, number][],
  },
  {
    id: 'L_nagpur_kolkata',
    name: 'Nagpur – Kolkata East Corridor (NH 53)',
    from: 'Nagpur',
    to: 'Kolkata',
    risk: 'medium',
    riskScore: 54,
    distanceKm: 998,
    durationH: 19.0,
    baselineH: 17.0,
    disruptionType: 'Localized Rain Storms in Odisha Belt',
    coords: [
      [21.1458, 79.0882],
      [21.08, 80.0],
      [21.18, 81.0],
      [21.2514, 81.6296],
      [21.4669, 83.9812],
      [21.9, 85.5],
      [22.3385, 87.3235],
      [22.5726, 88.3639],
    ] as [number, number][],
  },
];

// City hubs in India network
const indiaCities = [
  { name: 'Delhi NCR', type: 'Central Warehouse Hub', lat: 28.6139, lng: 77.209, risk: 'low' },
  { name: 'Mumbai', type: 'Port & Distribution Depot', lat: 19.076, lng: 72.8777, risk: 'high' },
  { name: 'Pune', type: 'Precision Parts Supplier', lat: 18.5204, lng: 73.8567, risk: 'high' },
  { name: 'Bengaluru', type: 'Tech & Cold Chain Warehouse', lat: 12.9716, lng: 77.5946, risk: 'low' },
  { name: 'Nagpur', type: 'Multimodal Central Freight Hub', lat: 21.1458, lng: 79.0882, risk: 'high' },
  { name: 'Hyderabad', type: 'Regional Distribution Center', lat: 17.385, lng: 78.4867, risk: 'medium' },
  { name: 'Chennai', type: 'Electronics & Auto Supplier', lat: 13.0827, lng: 80.2707, risk: 'medium' },
  { name: 'Ahmedabad', type: 'Consumer Goods Distribution', lat: 23.0225, lng: 72.5714, risk: 'low' },
  { name: 'Surat', type: 'Textile & Components Supplier', lat: 21.1702, lng: 72.8311, risk: 'low' },
  { name: 'Jaipur', type: 'Regional Retail Store Node', lat: 26.9124, lng: 75.7873, risk: 'medium' },
  { name: 'Ludhiana', type: 'Industrial Hardware Supplier', lat: 30.901, lng: 75.8573, risk: 'low' },
  { name: 'Kolkata', type: 'Eastern Logistics Gateway', lat: 22.5726, lng: 88.3639, risk: 'medium' },
];

// Global Corridors coordinates (Maritime, Air, Global Ports)
const globalLanesData = [
  {
    id: 'G_rotterdam_shanghai',
    name: 'Rotterdam – Shanghai Maritime Lane (via Suez)',
    from: 'Rotterdam',
    to: 'Shanghai',
    risk: 'high',
    riskScore: 82,
    distanceKm: 19200,
    durationH: 520,
    baselineH: 420,
    disruptionType: 'Severe Gale Force Wind & Port Congestion',
    coords: [
      [51.9244, 4.4777],
      [50.0, -1.0],
      [43.0, -9.5],
      [36.0, -5.5],
      [37.0, 10.0],
      [33.0, 25.0],
      [31.2, 32.3],
      [27.8, 34.3],
      [12.6, 43.3],
      [12.0, 52.0],
      [8.0, 76.0],
      [5.5, 95.0],
      [1.3521, 103.8198],
      [10.0, 109.0],
      [22.5431, 114.0579],
      [31.2304, 121.4737],
    ] as [number, number][],
  },
  {
    id: 'G_shenzhen_singapore',
    name: 'Shenzhen – Singapore Deep Maritime Lane',
    from: 'Shenzhen',
    to: 'Singapore',
    risk: 'high',
    riskScore: 86,
    distanceKm: 2600,
    durationH: 96,
    baselineH: 64,
    disruptionType: 'Supplier Delay & Berth Berth Congestion',
    coords: [
      [22.5431, 114.0579],
      [19.0, 113.0],
      [13.0, 110.0],
      [7.0, 106.0],
      [2.0, 104.5],
      [1.3521, 103.8198],
    ] as [number, number][],
  },
  {
    id: 'G_singapore_santos',
    name: 'Singapore – Santos Maritime Passage',
    from: 'Singapore',
    to: 'Santos',
    risk: 'low',
    riskScore: 18,
    distanceKm: 15900,
    durationH: 540,
    baselineH: 530,
    disruptionType: 'None (Clear Open Sea Passage)',
    coords: [
      [1.3521, 103.8198],
      [-6.0, 105.0],
      [-15.0, 90.0],
      [-25.0, 70.0],
      [-34.0, 45.0],
      [-35.0, 20.0],
      [-34.0, 0.0],
      [-28.0, -30.0],
      [-23.9618, -46.3322],
    ] as [number, number][],
  },
  {
    id: 'G_santos_newyork',
    name: 'Santos – New York Atlantic Corridor',
    from: 'Santos',
    to: 'New York',
    risk: 'medium',
    riskScore: 52,
    distanceKm: 7680,
    durationH: 280,
    baselineH: 260,
    disruptionType: 'Customs Delay & Terminal Backlog',
    coords: [
      [-23.9618, -46.3322],
      [-15.0, -38.0],
      [-5.0, -35.0],
      [10.0, -50.0],
      [25.0, -65.0],
      [35.0, -72.0],
      [40.7128, -74.006],
    ] as [number, number][],
  },
  {
    id: 'G_newyork_rotterdam',
    name: 'New York – Rotterdam Transatlantic Corridor',
    from: 'New York',
    to: 'Rotterdam',
    risk: 'low',
    riskScore: 22,
    distanceKm: 5860,
    durationH: 210,
    baselineH: 205,
    disruptionType: 'None (Optimal Maritime Transit)',
    coords: [
      [40.7128, -74.006],
      [42.0, -60.0],
      [46.0, -40.0],
      [49.0, -20.0],
      [50.0, -5.0],
      [51.9244, 4.4777],
    ] as [number, number][],
  },
];

const globalCities = [
  { name: 'Rotterdam', type: 'European Hub & Seaport', lat: 51.9244, lng: 4.4777, risk: 'high' },
  { name: 'New York', type: 'North American Gateway', lat: 40.7128, lng: -74.006, risk: 'medium' },
  { name: 'Shanghai', type: 'Mega Seaport Hub', lat: 31.2304, lng: 121.4737, risk: 'medium' },
  { name: 'Shenzhen', type: 'Primary Electronics Supplier', lat: 22.5431, lng: 114.0579, risk: 'high' },
  { name: 'Singapore', type: 'Global Transshipment Hub', lat: 1.3521, lng: 103.8198, risk: 'low' },
  { name: 'Santos', type: 'South American Port Hub', lat: -23.9618, lng: -46.3322, risk: 'medium' },
];

export default function RealLeafletMap({
  disruptions = [],
  onSelectDisruption,
}: RealLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapMode, setMapMode] = useState<'regional' | 'global'>('regional');
  const [activeLaneInfo, setActiveLaneInfo] = useState<any>(null);
  const [selectedDisruptionId, setSelectedDisruptionId] = useState<string | null>(null);

  // Initialize and render Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      const L = (await import('leaflet')).default;

      // Clean up previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!isMounted || !mapContainerRef.current) return;

      // Determine initial center & zoom based on selected mode
      const isRegional = mapMode === 'regional';
      const initialCenter: [number, number] = isRegional ? [21.8, 79.5] : [20.0, 20.0];
      const initialZoom = isRegional ? 5 : 2;

      // Create Leaflet Map Instance
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
        minZoom: 2,
        maxZoom: 14,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Free Clean GIS Canvas tiles (NO API key required, NO watermarks)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '© Esri, OpenStreetMap',
        }
      ).addTo(map);

      // Boundary and city label overlay (no watermarks)
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
        }
      ).addTo(map);

      // Select active data set
      const lanes = isRegional ? indiaLanesData : globalLanesData;
      const cities = isRegional ? indiaCities : globalCities;

      // 1. Draw Highway & Maritime Corridors
      lanes.forEach((lane) => {
        const isHighRisk = lane.risk === 'high';
        const isMedRisk = lane.risk === 'medium';
        const color = isHighRisk ? '#DC2626' : isMedRisk ? '#D97706' : '#16A34A';

        // Outer glow polyline
        L.polyline(lane.coords, {
          color: color,
          weight: isHighRisk ? 9 : 6,
          opacity: isHighRisk ? 0.35 : 0.2,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Core polyline
        const polyline = L.polyline(lane.coords, {
          color: color,
          weight: isHighRisk ? 4.5 : 3.5,
          opacity: 0.95,
          dashArray: isHighRisk ? '8, 8' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);

        // Interactive Popup on lane click
        polyline.on('click', () => {
          setActiveLaneInfo(lane);
        });

        polyline.on('mouseover', () => {
          polyline.setStyle({ weight: 6, opacity: 1 });
        });
        polyline.on('mouseout', () => {
          polyline.setStyle({ weight: isHighRisk ? 4.5 : 3.5, opacity: 0.95 });
        });
      });

      // 2. Draw Hub City Markers with Custom HTML Badges
      cities.forEach((city) => {
        const pinColor =
          city.risk === 'high' ? '#DC2626' : city.risk === 'medium' ? '#D97706' : '#16A34A';
        const ringColor =
          city.risk === 'high'
            ? 'rgba(220, 38, 38, 0.25)'
            : city.risk === 'medium'
            ? 'rgba(217, 119, 6, 0.25)'
            : 'rgba(22, 163, 74, 0.25)';

        const cityHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="width: 22px; height: 22px; border-radius: 50%; background: ${ringColor}; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: ${pinColor}; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 5px rgba(0,0,0,0.25);"></div>
            </div>
            <div style="position: absolute; top: -18px; left: 16px; background: rgba(255, 255, 255, 0.96); padding: 2px 7px; border-radius: 6px; border: 1px solid #E8E2D6; box-shadow: 0 2px 6px rgba(0,0,0,0.06); white-space: nowrap; font-family: Inter, sans-serif; font-weight: 700; font-size: 11px; color: #191816; pointer-events: none;">
              ${city.name}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: cityHtml,
          className: 'custom-city-marker',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const marker = L.marker([city.lat, city.lng], { icon }).addTo(map);

        marker.on('click', () => {
          map.flyTo([city.lat, city.lng], isRegional ? 7 : 4, { duration: 1.2 });
        });
      });

      // 3. Draw Disruption Callout Floating Badges (Matching mockup layout)
      if (isRegional) {
        // Disruption Badge: Mumbai - Pune
        const calloutHtml = `
          <div style="background: #FDEBEB; border: 1.5px solid #F8B4B4; border-radius: 10px; padding: 5px 10px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); display: flex; align-items: center; gap: 8px; font-family: Inter, sans-serif; cursor: pointer; transform: translate(-50%, -120%); min-width: 150px;">
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #DC2626; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 11px; font-weight: bold;">
              ⚠
            </div>
            <div style="line-height: 1.2;">
              <div style="font-size: 11px; font-weight: 800; color: #991B1B;">Severe weather</div>
              <div style="font-size: 10px; font-weight: 600; color: #B91C1C;">Mumbai – Pune Expressway</div>
            </div>
          </div>
        `;

        const calloutIcon = L.divIcon({
          html: calloutHtml,
          className: 'disruption-callout',
          iconSize: [160, 40],
          iconAnchor: [80, 40],
        });

        const calloutMarker = L.marker([18.78, 73.35], { icon: calloutIcon }).addTo(map);
        calloutMarker.on('click', () => {
          setSelectedDisruptionId('d_102');
          if (onSelectDisruption) onSelectDisruption('d_102');
        });
      } else {
        // Disruption Badge: Rotterdam
        const rotterdamHtml = `
          <div style="background: #FDEBEB; border: 1.5px solid #F8B4B4; border-radius: 10px; padding: 5px 10px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); display: flex; align-items: center; gap: 8px; font-family: Inter, sans-serif; cursor: pointer; transform: translate(-50%, -120%); min-width: 140px;">
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #DC2626; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 11px; font-weight: bold;">
              ⚠
            </div>
            <div style="line-height: 1.2;">
              <div style="font-size: 11px; font-weight: 800; color: #991B1B;">Severe weather</div>
              <div style="font-size: 10px; font-weight: 600; color: #B91C1C;">Rotterdam Port</div>
            </div>
          </div>
        `;
        const rotterdamMarker = L.marker([51.9244, 4.4777], {
          icon: L.divIcon({ html: rotterdamHtml, className: 'callout-rotterdam', iconSize: [140, 40], iconAnchor: [70, 40] }),
        }).addTo(map);
        rotterdamMarker.on('click', () => {
          if (onSelectDisruption) onSelectDisruption('d_102');
        });

        // Disruption Badge: Shenzhen
        const shenzhenHtml = `
          <div style="background: #FDEBEB; border: 1.5px solid #F8B4B4; border-radius: 10px; padding: 5px 10px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); display: flex; align-items: center; gap: 8px; font-family: Inter, sans-serif; cursor: pointer; transform: translate(-50%, -120%); min-width: 140px;">
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #DC2626; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; font-size: 11px; font-weight: bold;">
              ⚠
            </div>
            <div style="line-height: 1.2;">
              <div style="font-size: 11px; font-weight: 800; color: #991B1B;">Supplier delay</div>
              <div style="font-size: 10px; font-weight: 600; color: #B91C1C;">Shenzhen Hub</div>
            </div>
          </div>
        `;
        const shenzhenMarker = L.marker([22.5431, 114.0579], {
          icon: L.divIcon({ html: shenzhenHtml, className: 'callout-shenzhen', iconSize: [140, 40], iconAnchor: [70, 40] }),
        }).addTo(map);
        shenzhenMarker.on('click', () => {
          if (onSelectDisruption) onSelectDisruption('d_101');
        });
      }

      // 4. Transport Mode Icons on Real Routes (Vehicles, ships, flights)
      if (isRegional) {
        // Truck on Delhi - Jaipur Highway
        const truckHtml = `
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #FFFFFF; border: 1px solid #E8E2D6; box-shadow: 0 2px 6px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 14px;">🚚</span>
          </div>
        `;
        L.marker([27.7, 76.2], {
          icon: L.divIcon({ html: truckHtml, className: 'mode-truck', iconSize: [28, 28], iconAnchor: [14, 14] }),
        }).addTo(map);

        // Express Truck on Mumbai - Ahmedabad
        L.marker([21.4, 72.95], {
          icon: L.divIcon({ html: truckHtml, className: 'mode-truck-2', iconSize: [28, 28], iconAnchor: [14, 14] }),
        }).addTo(map);
      } else {
        // Cargo Ship between Rotterdam & Shanghai in Indian Ocean
        const shipHtml = `
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #FFFFFF; border: 1px solid #E8E2D6; box-shadow: 0 2px 6px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 14px;">🚢</span>
          </div>
        `;
        L.marker([6.0, 80.0], {
          icon: L.divIcon({ html: shipHtml, className: 'mode-ship', iconSize: [28, 28], iconAnchor: [14, 14] }),
        }).addTo(map);

        // Plane between Singapore & Europe
        const planeHtml = `
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #FFFFFF; border: 1px solid #E8E2D6; box-shadow: 0 2px 6px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 14px;">✈️</span>
          </div>
        `;
        L.marker([25.0, 55.0], {
          icon: L.divIcon({ html: planeHtml, className: 'mode-plane', iconSize: [28, 28], iconAnchor: [14, 14] }),
        }).addTo(map);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore unmount transition race condition
        }
        mapInstanceRef.current = null;
      }
    };
  }, [mapMode]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleReset = () => {
    if (mapInstanceRef.current) {
      if (mapMode === 'regional') {
        mapInstanceRef.current.flyTo([21.8, 79.5], 5, { duration: 1.0 });
      } else {
        mapInstanceRef.current.flyTo([20.0, 20.0], 2, { duration: 1.0 });
      }
    }
  };

  const handleFocusDisruption = () => {
    if (mapInstanceRef.current) {
      if (mapMode === 'regional') {
        mapInstanceRef.current.flyTo([18.78, 73.35], 8, { duration: 1.2 });
      } else {
        mapInstanceRef.current.flyTo([51.9244, 4.4777], 5, { duration: 1.2 });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft relative overflow-hidden flex flex-col">
      {/* Map Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-bold text-charcoal-900 tracking-tight">
              {mapMode === 'regional' ? 'India Regional Road Network' : 'Global Supply Chain Map'}
            </h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              Live GIS Corridors
            </span>
          </div>
          <p className="text-xs text-charcoal-500 mt-0.5">
            {mapMode === 'regional'
              ? 'Real national highway paths, telemetry stations, and real-time weather corridors'
              : 'Multi-modal international shipping lanes, transshipment hubs & air corridors'}
          </p>
        </div>

        {/* View Toggle (Country / Global) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-cream-100 p-0.5 rounded-xl border border-cream-border text-xs font-semibold">
            <button
              onClick={() => setMapMode('regional')}
              className={`px-3 py-1.5 rounded-lg transition ${
                mapMode === 'regional'
                  ? 'bg-cream-pill text-charcoal-900 font-bold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              Regional (India)
            </button>
            <button
              onClick={() => setMapMode('global')}
              className={`px-3 py-1.5 rounded-lg transition ${
                mapMode === 'global'
                  ? 'bg-cream-pill text-charcoal-900 font-bold shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              Global Network
            </button>
          </div>

          <button
            onClick={handleFocusDisruption}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-bold transition"
            title="Focus on Active Disruption"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>Focus Incident</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[400px] rounded-xl border border-cream-border overflow-hidden">
        {/* Real Leaflet Map DOM Root */}
        <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#F4EFE6]" />

        {/* Floating Controls Overlay (Bottom Left) */}
        <div className="absolute left-4 bottom-4 flex flex-col bg-white/95 backdrop-blur-xs rounded-xl border border-cream-border shadow-soft overflow-hidden z-20">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-cream-100 text-charcoal-700 border-b border-cream-border transition"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-cream-100 text-charcoal-700 border-b border-cream-border transition"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 hover:bg-cream-100 text-charcoal-500 transition"
            title="Reset View"
            aria-label="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Legend Overlay (Top Right of Map) */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-cream-border shadow-soft z-20 flex items-center gap-3 text-[11px] text-charcoal-700 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>High Risk</span>
          </div>
        </div>

        {/* Selected Lane Info Drawer Popup */}
        {activeLaneInfo && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-cream-border shadow-lg z-20 max-w-sm text-xs text-charcoal-800 animate-fade-in space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-charcoal-900 text-[13px] leading-tight">
                {activeLaneInfo.name}
              </span>
              <button
                onClick={() => setActiveLaneInfo(null)}
                className="text-charcoal-400 hover:text-charcoal-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="text-charcoal-600 text-[11.5px]">
              Distance: <strong>{activeLaneInfo.distanceKm} km</strong> • Baseline: <strong>{activeLaneInfo.baselineH}h</strong> • Current: <strong className="text-amber-800">{activeLaneInfo.durationH}h</strong>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-cream-border text-[11px]">
              <span className="font-semibold text-charcoal-700">Condition:</span>
              <span className={`font-bold ${activeLaneInfo.risk === 'high' ? 'text-red-700' : activeLaneInfo.risk === 'medium' ? 'text-amber-700' : 'text-emerald-700'}`}>
                {activeLaneInfo.disruptionType}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
