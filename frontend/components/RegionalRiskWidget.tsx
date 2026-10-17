'use client';

import React from 'react';
import { RegionalRisk, RiskLevel } from '../lib/types';

interface RegionalRiskWidgetProps {
  levels?: RegionalRisk[];
}

export default function RegionalRiskWidget({ levels }: RegionalRiskWidgetProps) {
  const defaultRegions: RegionalRisk[] = [
    { region: 'North America', level: 'medium', score: 48 },
    { region: 'Europe', level: 'high', score: 76 },
    { region: 'Asia', level: 'high', score: 84 },
    { region: 'South America', level: 'medium', score: 52 },
    { region: 'Africa', level: 'low', score: 24 },
  ];

  const regions = levels && levels.length > 0 ? levels : defaultRegions;

  const renderSegmentedBar = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return (
          <div className="flex h-3 w-32 rounded-full overflow-hidden bg-cream-200">
            <div className="w-1/3 bg-red-500 rounded-l-full"></div>
            <div className="w-1/3 bg-amber-500"></div>
            <div className="w-1/3 bg-emerald-400 rounded-r-full opacity-60"></div>
          </div>
        );
      case 'medium':
        return (
          <div className="flex h-3 w-32 rounded-full overflow-hidden bg-cream-200">
            <div className="w-1/2 bg-amber-500 rounded-l-full"></div>
            <div className="w-1/4 bg-amber-300"></div>
            <div className="w-1/4 bg-emerald-400 rounded-r-full opacity-60"></div>
          </div>
        );
      case 'low':
      default:
        return (
          <div className="flex h-3 w-32 rounded-full overflow-hidden bg-cream-200">
            <div className="w-1/3 bg-emerald-500 rounded-l-full"></div>
            <div className="w-1/3 bg-amber-200 opacity-60"></div>
            <div className="w-1/3 bg-cream-300 rounded-r-full"></div>
          </div>
        );
    }
  };

  const getLevelLabelColor = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return 'text-red-600 font-semibold';
      case 'medium':
        return 'text-amber-600 font-semibold';
      case 'low':
      default:
        return 'text-emerald-600 font-semibold';
    }
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-bold text-charcoal-900 tracking-tight">
          Regional Risk Level
        </h2>
        <span className="text-[11px] text-charcoal-500">5 monitored regions</span>
      </div>

      <div className="space-y-3 mt-1">
        {regions.map((item) => (
          <div key={item.region} className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-charcoal-700 w-28 truncate">
              {item.region}
            </span>

            <div className="flex-1 flex justify-center">
              {renderSegmentedBar(item.level)}
            </div>

            <span className={`text-[12.5px] w-16 text-right ${getLevelLabelColor(item.level)}`}>
              {capitalize(item.level)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
