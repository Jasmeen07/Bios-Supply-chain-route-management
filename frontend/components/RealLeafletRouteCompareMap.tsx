'use client';

import React, { useEffect, useRef } from 'react';
import { RouteCompareData } from '../lib/types';

interface RealLeafletRouteCompareMapProps {
  routeData: RouteCompareData | null;
  selectedAltIndex: number;
  originCity?: string;
  destinationCity?: string;
}

// Concrete geographic coordinates for common test routes
const routeCorridors: Record<string, { current: [number, number][]; alt1: [number, number][]; alt2: [number, number][] }> = {
  default: {
    // Pune to Delhi NCR route comparison
    current: [
      // Standard NH 48 (blocked via Mumbai-Surat monsoon zone)
      [18.5204, 73.8567],
      [18.7537, 73.4077],
      [19.0760, 72.8777],
      [20.3893, 72.9106],
      [21.1702, 72.8311],
      [22.3072, 73.1812],
      [23.0225, 72.5714],
      [24.5854, 73.7125],
      [26.9124, 75.7873],
      [28.6139, 77.2090],
    ],
    alt1: [
      // Recommended Bypass via Central Corridor (Nashik - Indore - Gwalior - Agra)
      [18.5204, 73.8567],
      [19.9975, 73.7898],
      [21.1458, 79.0882],
      [22.7196, 75.8577],
      [24.0000, 76.8000],
      [25.4484, 78.5685],
      [26.2183, 78.1828],
      [27.1767, 78.0081],
      [28.6139, 77.2090],
    ],
    alt2: [
      // Expedited Air / Direct Corridor
      [18.5204, 73.8567],
      [21.0000, 75.5000],
      [24.0000, 76.5000],
      [28.6139, 77.2090],
    ],
  },
};

export default function RealLeafletRouteCompareMap({
  routeData,
  selectedAltIndex,
  originCity = 'Pune',
  destinationCity = 'Delhi NCR Hub',
}: RealLeafletRouteCompareMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);
  const leafletLibRef = useRef<any>(null);

  // 1. Initialize Map once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    let isMounted = true;

    async function init() {
      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      leafletLibRef.current = L;

      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore teardown race condition
        }
        mapInstanceRef.current = null;
      }

      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [23.5, 76.0],
        zoom: 5.5,
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // Clean GIS Canvas tiles
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
          attribution: '© Esri, OpenStreetMap',
        }
      ).addTo(map);

      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 16,
        }
      ).addTo(map);

      // Create a persistent layerGroup for routes and markers
      layersGroupRef.current = L.layerGroup().addTo(map);

      // Render initial routes
      renderRoutes();
    }

    init();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapInstanceRef.current = null;
        layersGroupRef.current = null;
      }
    };
  }, []);

  // 2. Re-render polylines and markers when selection changes (without destroying the map!)
  const renderRoutes = () => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    const L = leafletLibRef.current;

    if (!map || !group || !L) return;

    group.clearLayers();

    const paths = routeCorridors.default;

    // 1. Current Impaired Route (Red, dashed, warning)
    L.polyline(paths.current, {
      color: '#DC2626',
      weight: 7,
      opacity: 0.25,
      lineCap: 'round',
    }).addTo(group);

    const currentPolyline = L.polyline(paths.current, {
      color: '#DC2626',
      weight: 4,
      opacity: 0.9,
      dashArray: '8, 8',
      lineCap: 'round',
    }).addTo(group);

    currentPolyline.bindPopup(`
      <div style="font-family: Inter, sans-serif; padding: 4px;">
        <div style="font-weight: 800; color: #991B1B; font-size: 12px;">Current Impaired Path</div>
        <div style="color: #423E3A; font-size: 11px; margin-top: 2px;">Via NH 48 Coastal Belt • Heavy Delay (+6h)</div>
        <div style="font-weight: 700; color: #DC2626; font-size: 11px; margin-top: 4px;">Risk: 86 / 100 (High)</div>
      </div>
    `);

    // 2. Alternative 1 (Recommended Bypass - Emerald)
    const isAlt1Selected = selectedAltIndex === 0;
    L.polyline(paths.alt1, {
      color: '#16A34A',
      weight: isAlt1Selected ? 8 : 4,
      opacity: isAlt1Selected ? 0.35 : 0.15,
      lineCap: 'round',
    }).addTo(group);

    const alt1Polyline = L.polyline(paths.alt1, {
      color: '#16A34A',
      weight: isAlt1Selected ? 5 : 3,
      opacity: isAlt1Selected ? 1 : 0.6,
      lineCap: 'round',
    }).addTo(group);

    alt1Polyline.bindPopup(`
      <div style="font-family: Inter, sans-serif; padding: 4px;">
        <div style="font-weight: 800; color: #166534; font-size: 12px;">Candidate 1: Central Bypass Corridor</div>
        <div style="color: #423E3A; font-size: 11px; margin-top: 2px;">Avoids flood zone • Saves 52h • +3.8% cost</div>
        <div style="font-weight: 700; color: #16A34A; font-size: 11px; margin-top: 4px;">Risk: 28 / 100 (Optimal)</div>
      </div>
    `);

    // 3. Alternative 2 (Expedited Route - Amber)
    const isAlt2Selected = selectedAltIndex === 1;
    L.polyline(paths.alt2, {
      color: '#D97706',
      weight: isAlt2Selected ? 8 : 4,
      opacity: isAlt2Selected ? 0.35 : 0.15,
      lineCap: 'round',
    }).addTo(group);

    const alt2Polyline = L.polyline(paths.alt2, {
      color: '#D97706',
      weight: isAlt2Selected ? 5 : 3,
      opacity: isAlt2Selected ? 1 : 0.6,
      lineCap: 'round',
    }).addTo(group);

    alt2Polyline.bindPopup(`
      <div style="font-family: Inter, sans-serif; padding: 4px;">
        <div style="font-weight: 800; color: #B45309; font-size: 12px;">Candidate 2: Direct Corridor</div>
        <div style="color: #423E3A; font-size: 11px; margin-top: 2px;">Fastest transit • Higher toll rates (+8.2%)</div>
        <div style="font-weight: 700; color: #D97706; font-size: 11px; margin-top: 4px;">Risk: 34 / 100</div>
      </div>
    `);

    // Origin Pin
    const originCoord = paths.current[0];
    const destCoord = paths.current[paths.current.length - 1];

    const originHtml = `
      <div style="display: flex; align-items: center; justify-content: center;">
        <div style="width: 18px; height: 18px; border-radius: 50%; background: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
        <div style="position: absolute; top: -20px; left: 16px; background: #FFFFFF; padding: 2px 7px; border-radius: 6px; border: 1px solid #E8E2D6; box-shadow: 0 2px 5px rgba(0,0,0,0.08); font-family: Inter, sans-serif; font-weight: bold; font-size: 11px; color: #191816; white-space: nowrap;">
          Origin: ${originCity}
        </div>
      </div>
    `;
    L.marker(originCoord, {
      icon: L.divIcon({ html: originHtml, className: 'origin-marker', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(group);

    // Destination Pin
    const destHtml = `
      <div style="display: flex; align-items: center; justify-content: center;">
        <div style="width: 18px; height: 18px; border-radius: 50%; background: #16A34A; border: 3px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
        <div style="position: absolute; top: -20px; left: 16px; background: #FFFFFF; padding: 2px 7px; border-radius: 6px; border: 1px solid #E8E2D6; box-shadow: 0 2px 5px rgba(0,0,0,0.08); font-family: Inter, sans-serif; font-weight: bold; font-size: 11px; color: #191816; white-space: nowrap;">
          Destination: ${destinationCity}
        </div>
      </div>
    `;
    L.marker(destCoord, {
      icon: L.divIcon({ html: destHtml, className: 'dest-marker', iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(group);

    // Warning Badge on blocked lane
    const warningHtml = `
      <div style="background: #FDEBEB; border: 1px solid #F8B4B4; border-radius: 8px; padding: 3px 8px; box-shadow: 0 2px 8px rgba(220,38,38,0.25); display: flex; align-items: center; gap: 5px; font-family: Inter, sans-serif; font-size: 10px; font-weight: bold; color: #991B1B;">
        <span>⚠ Blocked Lane</span>
      </div>
    `;
    L.marker([20.4, 72.9], {
      icon: L.divIcon({ html: warningHtml, className: 'blocked-warning', iconSize: [100, 24], iconAnchor: [50, 12] }),
    }).addTo(group);

    // Fit bounds with animate: false to completely avoid zoom transition race condition
    try {
      const bounds = L.latLngBounds([...paths.current, ...paths.alt1]);
      map.fitBounds(bounds, { padding: [40, 40], animate: false });
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    renderRoutes();
  }, [selectedAltIndex, originCity, destinationCity]);

  return (
    <div className="w-full h-[340px] bg-[#FAF8F5] rounded-xl border border-cream-border overflow-hidden relative">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Path Legend Overlay */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-cream-border text-[11px] space-y-1 shadow-soft z-10">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-red-600 rounded"></span>
          <span className="font-semibold text-charcoal-800">Current Route (Blocked via NH 48 Coast)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-emerald-600 rounded"></span>
          <span className="font-semibold text-charcoal-800">Alternative 1 (Recommended Central Bypass)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-amber-500 rounded"></span>
          <span className="font-semibold text-charcoal-800">Alternative 2 (Direct Fast Corridor)</span>
        </div>
      </div>
    </div>
  );
}
