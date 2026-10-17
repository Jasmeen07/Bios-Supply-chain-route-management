'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, CheckCircle2, Clock, DollarSign, ShieldCheck } from 'lucide-react';
import { Recommendation } from '../lib/types';
import { api } from '../lib/api';

interface RecommendedActionsProps {
  actions?: Recommendation[];
  onActionApproved?: (recId: string, beforeRisk: number, afterRisk: number) => void;
}

export default function RecommendedActions({
  actions = [],
  onActionApproved,
}: RecommendedActionsProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedMap, setApprovedMap] = useState<Record<string, boolean>>({});

  const handleApprove = async (e: React.MouseEvent, rec: Recommendation) => {
    e.stopPropagation();
    try {
      setApprovingId(rec.id);
      const res = await api.approveRecommendation(rec.id);
      setApprovedMap((prev) => ({ ...prev, [rec.id]: true }));
      if (onActionApproved) {
        onActionApproved(rec.id, res.before_risk_score, res.after_risk_score);
      }
    } catch (err) {
      console.error('Failed to approve recommendation:', err);
    } finally {
      setApprovingId(null);
    }
  };

  const getRankBadgeStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-[#FEECE8] text-[#E05A47] border-[#FCD6CF]';
      case 2:
        return 'bg-[#FEF6E6] text-[#D97706] border-[#FDE6B8]';
      case 3:
      default:
        return 'bg-[#EDF9F1] text-[#16A34A] border-[#D1F2DD]';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[17px] font-bold text-charcoal-900 tracking-tight">
          Recommended Actions
        </h2>
        <Link
          href="/routes"
          className="text-xs font-medium text-charcoal-600 hover:text-charcoal-900 flex items-center gap-1 transition"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="py-6 text-center text-charcoal-500 text-xs">
            No active recommendation needed. Network operations optimal.
          </div>
        ) : (
          actions.slice(0, 3).map((item, idx) => {
            const isApproved = approvedMap[item.id] || item.status === 'approved';
            const isApproving = approvingId === item.id;
            const rankNum = item.rank || idx + 1;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 ${
                  isApproved
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-[#FCFAF7] border-cream-border hover:border-cream-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Number Badge (1, 2, 3) */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${getRankBadgeStyle(
                      rankNum
                    )}`}
                  >
                    {rankNum}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[13.5px] font-bold text-charcoal-900 leading-snug truncate">
                        {item.title}
                      </h3>
                      <Link
                        href={`/routes?shipment_id=${item.params?.shipment_id || 'S-104'}`}
                        className="text-charcoal-500 hover:text-charcoal-900 shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <p className="text-xs text-charcoal-600 font-normal mt-0.5 leading-relaxed">
                      {item.explanation}
                    </p>

                    {/* Trade-off Metrics Pills */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-medium text-charcoal-600">
                      {item.delay_saved_h > 0 && (
                        <span className="inline-flex items-center gap-1 bg-cream-200/80 px-2 py-0.5 rounded text-charcoal-700">
                          <Clock className="w-3 h-3 text-emerald-700" />
                          Saves {item.delay_saved_h}h
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 bg-cream-200/80 px-2 py-0.5 rounded text-charcoal-700">
                        <DollarSign className="w-3 h-3 text-amber-700" />
                        {item.cost_delta_pct > 0 ? `+${item.cost_delta_pct}%` : `${item.cost_delta_pct}%`} cost
                      </span>
                      <span className="inline-flex items-center gap-1 bg-cream-200/80 px-2 py-0.5 rounded text-charcoal-700">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        -{item.risk_reduction} risk
                      </span>

                      {/* Quick Approve Button */}
                      <button
                        onClick={(e) => handleApprove(e, item)}
                        disabled={isApproved || isApproving}
                        className={`ml-auto px-2.5 py-1 rounded-lg text-[11px] font-semibold transition active:scale-95 flex items-center gap-1 ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-charcoal-900 hover:bg-charcoal-800 text-white shadow-2xs'
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Applied</span>
                          </>
                        ) : isApproving ? (
                          <span>Applying...</span>
                        ) : (
                          <span>Approve</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
