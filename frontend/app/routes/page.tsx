'use client';

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Header from '../../components/Header';
import DemoBanner from '../../components/DemoBanner';
import { api } from '../../lib/api';
import { RouteCompareData, RouteAlternative, Shipment } from '../../lib/types';
import { CheckCircle2, GitBranch, Clock, DollarSign, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const RealLeafletRouteCompareMap = dynamic(
  () => import('../../components/RealLeafletRouteCompareMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[340px] bg-cream-50 rounded-xl border border-cream-border flex items-center justify-center text-xs text-charcoal-500">
        Loading route GIS visualizer...
      </div>
    ),
  }
);

function RoutePlanningContent() {
  const searchParams = useSearchParams();
  const queryShipmentId = searchParams.get('shipment_id') || 'S-104';

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>(queryShipmentId);
  const [priority, setPriority] = useState<'fastest' | 'balanced' | 'cheapest' | 'safest'>('balanced');
  const [routeData, setRouteData] = useState<RouteCompareData | null>(null);
  const [selectedAltIndex, setSelectedAltIndex] = useState<number>(0);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [appliedNotice, setAppliedNotice] = useState<{ before: number; after: number; text: string } | null>(null);

  useEffect(() => {
    async function loadShipments() {
      try {
        const list = await api.getShipments();
        setShipments(list);
      } catch (e) {
        console.error(e);
      }
    }
    loadShipments();
  }, []);

  useEffect(() => {
    async function loadRouteComparison() {
      try {
        const data = await api.getRouteCompare(selectedShipmentId, priority);
        setRouteData(data);
      } catch (e) {
        console.error(e);
      }
    }
    loadRouteComparison();
  }, [selectedShipmentId, priority]);

  const handleApprove = async () => {
    if (!routeData) return;
    try {
      setIsApplying(true);
      const chosen = routeData.alternatives[selectedAltIndex];
      const res = await api.approveRecommendation('r_501');
      setAppliedNotice({
        before: res.before_risk_score,
        after: res.after_risk_score,
        text: `Alternative route "${chosen.route_name}" successfully approved and active.`,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  const currentShipment = shipments.find((s) => s.id === selectedShipmentId);

  return (
    <main className="flex-1 p-5 md:p-7 max-w-[1600px] w-full mx-auto flex flex-col justify-between">
      <Header />
      <DemoBanner />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Route Planning & Intelligent Optimization
          </h2>
          <p className="text-xs text-charcoal-500">
            Compare risk-adjusted path alternatives, adjust utility priorities, and approve reroutes with closed-loop network updates.
          </p>
        </div>

        {/* Shipment Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-charcoal-700">Shipment:</label>
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="text-xs bg-white border border-cream-border rounded-xl px-3 py-2 text-charcoal-900 font-bold focus:outline-none focus:ring-2 focus:ring-cream-500 shadow-xs"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}: {s.origin_name} → {s.destination_name} ({s.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {appliedNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">{appliedNotice.text}</span>
              <p className="text-emerald-700 mt-0.5">
                Network risk score reduced from <strong>{appliedNotice.before}</strong> to <strong>{appliedNotice.after}</strong> (-{appliedNotice.before - appliedNotice.after} pts).
              </p>
            </div>
          </div>
          <button
            onClick={() => setAppliedNotice(null)}
            className="text-emerald-700 font-bold hover:text-emerald-900 px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Priority Control & Comparison Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Route Visualizer & Summary */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-cream-border p-5 shadow-soft space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-charcoal-900">
              Path Comparison Visualizer
            </h3>
            <span className="text-xs font-medium text-charcoal-500">
              Corridor geometry rendered from NetworkX
            </span>
          </div>

          {/* Real Leaflet Map of the Route Corridor */}
          <RealLeafletRouteCompareMap
            routeData={routeData}
            selectedAltIndex={selectedAltIndex}
            originCity={currentShipment?.origin_name}
            destinationCity={currentShipment?.destination_name}
          />

          {/* Current Route Stats vs Chosen Alternative */}
          {routeData && (
            <div className="p-4 bg-cream-50 rounded-xl border border-cream-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-charcoal-900">Current Planned Path</span>
                <span className="text-red-600 font-bold">High Risk ({routeData.current.risk_score}/100)</span>
              </div>
              <p className="text-charcoal-600 leading-relaxed">
                {routeData.current.route_name} • Distance: {routeData.current.distance_km} km • ETA: {routeData.current.duration_h} hrs • Est. Cost: ${routeData.current.cost.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Right: Priority Controls & Candidate Comparison Table */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-cream-border p-6 shadow-soft space-y-6">
          {/* Priority Slider / Toggles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-charcoal-900">
                Optimization Priority Weights
              </h3>
              <span className="text-xs text-charcoal-500">Live utility re-ranking</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(['fastest', 'balanced', 'cheapest', 'safest'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize transition ${
                    priority === p
                      ? 'bg-cream-pill text-charcoal-900 border border-cream-border font-bold shadow-xs'
                      : 'bg-cream-50 text-charcoal-600 hover:bg-cream-100 border border-cream-border/60'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Alternative Candidates */}
          <div>
            <h4 className="text-xs font-bold text-charcoal-500 uppercase tracking-wider mb-3">
              Generated Candidates ({routeData?.alternatives.length || 0})
            </h4>

            <div className="space-y-3">
              {routeData?.alternatives.map((alt, idx) => {
                const isSelected = selectedAltIndex === idx;
                return (
                  <div
                    key={alt.route_id}
                    onClick={() => setSelectedAltIndex(idx)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cream-100/90 border-cream-400 ring-1 ring-cream-300 shadow-xs'
                        : 'bg-cream-50/50 border-cream-border hover:bg-cream-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cream-pill text-charcoal-900 font-bold text-xs flex items-center justify-center">
                          {alt.rank}
                        </span>
                        <h5 className="text-sm font-bold text-charcoal-900">
                          {alt.route_name}
                        </h5>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Utility: {Math.round(alt.utility * 100)}%
                      </span>
                    </div>

                    {/* Deltas & Metrics */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-cream-border">
                        <span className="text-[10.5px] text-charcoal-500">Duration Delta</span>
                        <div className="font-bold text-emerald-700">
                          {alt.delta.duration_h > 0 ? `+${alt.delta.duration_h}h` : `${alt.delta.duration_h}h`}
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-cream-border">
                        <span className="text-[10.5px] text-charcoal-500">Cost Delta</span>
                        <div className="font-bold text-charcoal-800">
                          {alt.delta.cost_pct > 0 ? `+${alt.delta.cost_pct}%` : `${alt.delta.cost_pct}%`}
                        </div>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-cream-border">
                        <span className="text-[10.5px] text-charcoal-500">Risk Drop</span>
                        <div className="font-bold text-emerald-700">
                          {alt.delta.risk} pts
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Approval Bar */}
          <div className="pt-4 border-t border-cream-border flex items-center justify-between gap-4">
            <div className="text-xs text-charcoal-600">
              Selected: <strong>Candidate {selectedAltIndex + 1}</strong>
            </div>

            <button
              onClick={handleApprove}
              disabled={isApplying}
              className="px-5 py-2.5 bg-charcoal-900 hover:bg-charcoal-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isApplying ? 'Applying Reroute...' : 'Approve & Execute Reroute'}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RoutePlanningPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-xs text-charcoal-500">
        Loading Route Planning...
      </div>
    }>
      <RoutePlanningContent />
    </Suspense>
  );
}
