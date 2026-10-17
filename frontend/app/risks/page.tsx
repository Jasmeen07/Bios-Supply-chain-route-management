'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import Header from '../../components/Header';
import DemoBanner from '../../components/DemoBanner';
import { api } from '../../lib/api';
import { Disruption, DisruptionDetail, DisruptionType, RiskLevel, DisruptionStatus } from '../../lib/types';
import { AlertTriangle, Filter, Clock, ShieldAlert, CheckCircle2, ChevronRight, Activity, ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RiskMonitorContent() {
  const searchParams = useSearchParams();
  const selectedIdFromQuery = searchParams.get('id');

  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [selectedDisruption, setSelectedDisruption] = useState<DisruptionDetail | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await api.getDisruptions();
        setDisruptions(list);

        const initialTargetId = selectedIdFromQuery || (list.length > 0 ? list[0].id : null);
        if (initialTargetId) {
          const detail = await api.getDisruptionDetail(initialTargetId);
          setSelectedDisruption(detail);
        }
      } catch (err) {
        console.error('Error loading disruptions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [selectedIdFromQuery]);

  const handleSelectDisruption = async (id: string) => {
    try {
      const detail = await api.getDisruptionDetail(id);
      setSelectedDisruption(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDisruptions = useMemo(() => {
    return disruptions.filter((d) => {
      if (typeFilter !== 'all' && d.type !== typeFilter) return false;
      if (levelFilter !== 'all' && d.level !== levelFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      return true;
    });
  }, [disruptions, typeFilter, levelFilter, statusFilter]);

  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
            Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0]">
            Low
          </span>
        );
    }
  };

  return (
    <main className="flex-1 p-5 md:p-7 max-w-[1600px] w-full mx-auto flex flex-col justify-between">
      <Header />
      <DemoBanner />

      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Risk Monitor & Evidence Inspector
          </h2>
          <p className="text-xs text-charcoal-500">
            Real-time multi-signal disruption detection, severity telemetry, and root-cause evidence.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-white border border-cream-border rounded-xl px-3 py-1.5 text-charcoal-800 font-medium focus:outline-none focus:ring-1 focus:ring-cream-500"
          >
            <option value="all">All Causes</option>
            <option value="weather">Weather</option>
            <option value="traffic">Traffic</option>
            <option value="supplier_delay">Supplier Delay</option>
            <option value="inventory">Inventory</option>
          </select>

          {/* Severity Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs bg-white border border-cream-border rounded-xl px-3 py-1.5 text-charcoal-800 font-medium focus:outline-none focus:ring-1 focus:ring-cream-500"
          >
            <option value="all">All Severities</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-cream-border rounded-xl px-3 py-1.5 text-charcoal-800 font-medium focus:outline-none focus:ring-1 focus:ring-cream-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Main Split: Disruption List (Left) & Deep Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Disruption List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-cream-border p-4 shadow-soft">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border mb-3">
            <span className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">
              Disruptions ({filteredDisruptions.length})
            </span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredDisruptions.map((item) => {
              const isSelected = selectedDisruption?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectDisruption(item.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cream-100 border-cream-400 shadow-xs ring-1 ring-cream-300'
                      : 'bg-cream-50/50 border-cream-border hover:bg-cream-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-charcoal-900 truncate">
                      {item.issue_title}
                    </span>
                    {getRiskBadge(item.level)}
                  </div>

                  <p className="text-xs text-charcoal-600 line-clamp-1">
                    {item.entity.location_label || item.entity.name}
                  </p>

                  <div className="flex items-center justify-between mt-3 text-[11px] text-charcoal-500 pt-2 border-t border-cream-border/50">
                    <span>Score: <strong className="text-charcoal-800">{item.risk_score}</strong></span>
                    <span>Confidence: <strong className="text-charcoal-800">{Math.round(item.confidence * 100)}%</strong></span>
                    <span className="capitalize text-charcoal-700 font-medium">{item.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deep Detail Inspector */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-cream-border p-6 shadow-soft space-y-6">
          {!selectedDisruption ? (
            <div className="text-center py-12 text-charcoal-500 text-xs">
              Select a disruption from the left list to view detailed evidence and impact analytics.
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-cream-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono bg-cream-200 px-2 py-0.5 rounded text-charcoal-700 font-bold">
                      {selectedDisruption.id}
                    </span>
                    <span className="text-xs uppercase font-bold text-charcoal-500">
                      {selectedDisruption.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-charcoal-400">•</span>
                    <span className="text-xs text-charcoal-500">
                      {selectedDisruption.time_ago || 'Recent'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-charcoal-900">
                    {selectedDisruption.issue_title}
                  </h3>
                  <p className="text-xs text-charcoal-600 font-medium mt-0.5">
                    Entity: {selectedDisruption.entity.name} ({selectedDisruption.entity.location_label || selectedDisruption.entity.id})
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {getRiskBadge(selectedDisruption.level)}
                  <span className="text-xs text-charcoal-500 font-medium">
                    Risk Score: <strong className="text-charcoal-900 text-sm">{selectedDisruption.risk_score}/100</strong>
                  </span>
                </div>
              </div>

              {/* Severity & Confidence Telemetry Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-cream-50 rounded-xl border border-cream-border">
                  <span className="text-[11px] font-medium text-charcoal-500">Severity</span>
                  <div className="text-lg font-bold text-charcoal-900 mt-0.5">
                    {Math.round(selectedDisruption.severity * 100)}%
                  </div>
                </div>
                <div className="p-3 bg-cream-50 rounded-xl border border-cream-border">
                  <span className="text-[11px] font-medium text-charcoal-500">Confidence</span>
                  <div className="text-lg font-bold text-charcoal-900 mt-0.5">
                    {Math.round(selectedDisruption.confidence * 100)}%
                  </div>
                </div>
                <div className="p-3 bg-cream-50 rounded-xl border border-cream-border">
                  <span className="text-[11px] font-medium text-charcoal-500">Delay Impact</span>
                  <div className="text-lg font-bold text-amber-700 mt-0.5">
                    +{selectedDisruption.impact.extra_delay_h}h
                  </div>
                </div>
                <div className="p-3 bg-cream-50 rounded-xl border border-cream-border">
                  <span className="text-[11px] font-medium text-charcoal-500">Revenue at Risk</span>
                  <div className="text-lg font-bold text-red-700 mt-0.5">
                    ${selectedDisruption.impact.revenue_at_risk.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Impact Analysis Breakdown */}
              <div className="p-4 rounded-xl bg-cream-100/60 border border-cream-border text-xs space-y-2">
                <h4 className="font-bold text-charcoal-800 text-[13px]">
                  Impact Analysis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-charcoal-700">
                  <div>
                    <strong>Affected Shipments: </strong>
                    {selectedDisruption.impact.affected_shipments.join(', ') || 'None directly assigned'}
                  </div>
                  <div>
                    <strong>Projected Stockout Date: </strong>
                    {selectedDisruption.impact.stockout_date}
                  </div>
                  <div>
                    <strong>Units Short: </strong>
                    {selectedDisruption.impact.units_short} units
                  </div>
                  <div>
                    <strong>Impact Summary: </strong>
                    {selectedDisruption.impact_summary}
                  </div>
                </div>
              </div>

              {/* Evidence Table (Section 7, 8 & 11) */}
              <div>
                <h4 className="font-bold text-charcoal-900 text-sm mb-2.5 flex items-center justify-between">
                  <span>Detection Evidence & Sensor Readings</span>
                  <span className="text-xs font-normal text-charcoal-500">
                    Source transparency guaranteed
                  </span>
                </h4>
                <div className="overflow-x-auto border border-cream-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cream-100 border-b border-cream-border text-charcoal-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Source</th>
                        <th className="py-2.5 px-3">Telemetry Metric</th>
                        <th className="py-2.5 px-3">Value</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-border/60">
                      {selectedDisruption.evidence.map((ev, index) => (
                        <tr key={index} className="hover:bg-cream-50">
                          <td className="py-2 px-3 font-semibold text-charcoal-900">
                            {ev.source}
                          </td>
                          <td className="py-2 px-3 text-charcoal-700 font-mono">
                            {ev.metric}
                          </td>
                          <td className="py-2 px-3 font-bold text-charcoal-900">
                            {ev.value} {ev.unit || ''}
                          </td>
                          <td className="py-2 px-3">
                            {ev.simulated ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                Simulated
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Live Verified
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-charcoal-500 font-mono text-[11px]">
                            {new Date(ev.ts).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Linked Candidate Recommendations */}
              {selectedDisruption.recommendations && selectedDisruption.recommendations.length > 0 && (
                <div>
                  <h4 className="font-bold text-charcoal-900 text-sm mb-2.5">
                    Proposed Mitigations & Recommendations
                  </h4>
                  <div className="space-y-2">
                    {selectedDisruption.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 bg-cream-50 rounded-xl border border-cream-border flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-charcoal-900">
                              {rec.title}
                            </span>
                            <span className="text-[10px] font-bold uppercase bg-cream-200 px-1.5 py-0.5 rounded text-charcoal-600">
                              {rec.action_type}
                            </span>
                          </div>
                          <p className="text-xs text-charcoal-600 mt-1">
                            {rec.explanation}
                          </p>
                        </div>
                        <Link
                          href={`/routes?shipment_id=${rec.params?.shipment_id || 'S-104'}`}
                          className="px-3 py-1.5 bg-charcoal-900 text-white rounded-lg text-xs font-semibold hover:bg-charcoal-800 transition shrink-0"
                        >
                          Plan Route
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RiskMonitorPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-xs text-charcoal-500">
        Loading Risk Monitor...
      </div>
    }>
      <RiskMonitorContent />
    </Suspense>
  );
}
