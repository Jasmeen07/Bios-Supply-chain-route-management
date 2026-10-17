'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ActiveRisksByCause } from '../lib/types';

interface RiskDonutProps {
  data?: ActiveRisksByCause;
}

export default function RiskDonut({ data }: RiskDonutProps) {
  const chartData = [
    {
      name: 'Supplier Delay',
      value: data?.supplier_delay ?? 4,
      color: '#DC2626', // Red
    },
    {
      name: 'Weather',
      value: data?.weather ?? 3,
      color: '#EA580C', // Deep Orange
    },
    {
      name: 'Traffic / Port Congestion',
      value: data?.traffic ?? 2,
      color: '#F59E0B', // Amber
    },
    {
      name: 'Inventory Shortage',
      value: data?.inventory_shortage ?? 2,
      color: '#16A34A', // Green
    },
    {
      name: 'Geopolitical',
      value: data?.geopolitical ?? 1,
      color: '#3B82F6', // Blue
    },
  ];

  const totalRisks = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[16px] font-bold text-charcoal-900 tracking-tight">
          Active Risks by Cause
        </h2>
        <span className="text-[11px] font-medium text-charcoal-500 bg-cream-100 px-2 py-0.5 rounded-md border border-cream-border">
          Total: {totalRisks}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 mt-2">
        {/* Donut Chart with center label */}
        <div className="relative w-[150px] h-[150px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Counter */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-charcoal-900 tracking-tight leading-none">
              {totalRisks}
            </span>
            <span className="text-[10px] font-medium text-charcoal-500 mt-0.5">
              Active Risks
            </span>
          </div>
        </div>

        {/* Legend List matching mockup */}
        <div className="flex flex-col gap-2 flex-1 pl-3 text-xs">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-charcoal-700 font-medium truncate text-[12.5px]">
                  {item.name}
                </span>
              </div>
              <span className="font-bold text-charcoal-900 text-xs pl-2">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
