'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Disruption, RiskLevel } from '../lib/types';

interface RecentDisruptionsProps {
  disruptions?: Disruption[];
  onSelect?: (disruption: Disruption) => void;
}

export default function RecentDisruptions({ disruptions = [], onSelect }: RecentDisruptionsProps) {
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
            Low
          </span>
        );
    }
  };

  const getStatusDot = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>;
      case 'medium':
        return <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>;
      case 'low':
      default:
        return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[17px] font-bold text-charcoal-900 tracking-tight">
          Recent Disruptions
        </h2>
        <Link
          href="/risks"
          className="text-xs font-medium text-charcoal-600 hover:text-charcoal-900 flex items-center gap-1 transition"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-cream-border/70 text-charcoal-500 font-medium">
              <th className="pb-2.5 pl-1 w-28">Time</th>
              <th className="pb-2.5 px-3">Location</th>
              <th className="pb-2.5 px-3">Issue</th>
              <th className="pb-2.5 px-3">Impact</th>
              <th className="pb-2.5 pr-1 text-right">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-border/50">
            {disruptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-charcoal-500">
                  No active disruptions detected. Network is stable.
                </td>
              </tr>
            ) : (
              disruptions.slice(0, 5).map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelect && onSelect(item)}
                  className="hover:bg-cream-50 cursor-pointer transition-colors group"
                >
                  {/* Time with status dot */}
                  <td className="py-3 pl-1 flex items-center gap-2 whitespace-nowrap text-charcoal-600 font-medium">
                    {getStatusDot(item.level)}
                    <span>{item.time_ago || 'Recent'}</span>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-3 font-semibold text-charcoal-900 whitespace-nowrap">
                    {item.entity.location_label || item.entity.name}
                  </td>

                  {/* Issue */}
                  <td className="py-3 px-3 text-charcoal-700 whitespace-nowrap">
                    {item.issue_title}
                  </td>

                  {/* Impact */}
                  <td className="py-3 px-3 text-charcoal-600 whitespace-nowrap">
                    {item.impact_summary}
                  </td>

                  {/* Risk Badge */}
                  <td className="py-3 pr-1 text-right whitespace-nowrap">
                    {getRiskBadge(item.level)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
