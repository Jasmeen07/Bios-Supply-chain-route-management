'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Disruption, LaneEdge, LocationNode } from '../lib/types';

interface GlobalMapProps {
  locations?: LocationNode[];
  lanes?: LaneEdge[];
  disruptions?: Disruption[];
  onSelectDisruption?: (id: string) => void;
}

// Dynamically import the real Leaflet map with ssr: false
const RealLeafletMap = dynamic(() => import('./RealLeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft h-[480px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-7 h-7 border-3 border-cream-400 border-t-charcoal-900 rounded-full animate-spin"></div>
        <span className="text-xs text-charcoal-500 font-medium">
          Loading GIS Corridor Map...
        </span>
      </div>
    </div>
  ),
});

export default function GlobalMap(props: GlobalMapProps) {
  return <RealLeafletMap {...props} />;
}
