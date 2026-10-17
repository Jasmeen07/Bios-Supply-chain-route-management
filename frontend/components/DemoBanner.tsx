'use client';

import React from 'react';
import { Info } from 'lucide-react';

export default function DemoBanner() {
  return (
    <div className="bg-[#FAF4EB] border border-[#E8DEC8] text-charcoal-700 px-3.5 py-1.5 rounded-xl text-xs flex items-center justify-between mb-5 shadow-2xs">
      <div className="flex items-center gap-2">
        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span className="font-semibold text-charcoal-900">Prototype Demo Mode:</span>
        <span className="text-charcoal-600 hidden sm:inline">
          Live Open-Meteo weather • Simulated traffic delays • Fixed-seed supplier/inventory telemetry.
        </span>
      </div>
      <span className="text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200/50">
        Deterministic seed: 42
      </span>
    </div>
  );
}
