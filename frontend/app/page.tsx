'use client';

import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import DemoBanner from '../components/DemoBanner';
import GlobalMap from '../components/GlobalMap';
import RiskDonut from '../components/RiskDonut';
import RegionalRiskWidget from '../components/RegionalRiskWidget';
import RecentDisruptions from '../components/RecentDisruptions';
import RecommendedActions from '../components/RecommendedActions';
import SimulatorDrawer from '../components/SimulatorDrawer';
import { api } from '../lib/api';
import { OverviewData, Disruption } from '../lib/types';
import { useAlerts } from '../lib/useAlerts';
import { useRouter } from 'next/navigation';

export default function OverviewPage() {
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const overview = await api.getOverview();
      setData(overview);
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to live alerts
  useAlerts((event) => {
    if (event.event === 'disruption_created') {
      setToastMessage(`New Disruption: ${event.data.disruption?.issue_title || 'Alert Detected'}`);
      loadData();
    } else if (event.event === 'plan_applied') {
      setToastMessage(`Action Applied: ${event.data.action_type || 'Reroute'} executed.`);
      loadData();
    } else if (event.event === 'disruption_resolved') {
      loadData();
    }
  });

  const handleSelectDisruption = (disruption: Disruption | string) => {
    const id = typeof disruption === 'string' ? disruption : disruption.id;
    router.push(`/risks?id=${id}`);
  };

  const handleActionApproved = (recId: string, beforeRisk: number, afterRisk: number) => {
    setToastMessage(`Approved recommendation ${recId}! Risk dropped from ${beforeRisk} to ${afterRisk}.`);
    loadData();
  };

  if (isLoading || !data) {
    return (
      <main className="flex-1 p-6 flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-cream-400 border-t-charcoal-900 rounded-full animate-spin"></div>
          <span className="text-xs text-charcoal-500 font-medium tracking-tight">
            Loading SupplySense Control Tower...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-5 md:p-7 max-w-[1600px] w-full mx-auto flex flex-col justify-between">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-6 z-50 bg-charcoal-900 text-cream-100 px-4 py-2.5 rounded-xl shadow-lg border border-charcoal-700 text-xs font-semibold flex items-center gap-3 animate-fade-in">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-cream-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <Header
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        activeRisksCount={data.kpis.total_active_risks}
      />

      {/* Demo Mode Banner */}
      <DemoBanner />

      {/* Main Grid matching reference image layout */}
      <div className="space-y-6">
        {/* Top Section: Map (Left) & Risk Breakdown (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Global Supply Chain Map */}
          <div className="lg:col-span-8 flex flex-col">
            <GlobalMap
              disruptions={data.recent_disruptions}
              onSelectDisruption={(id) => handleSelectDisruption(id)}
            />
          </div>

          {/* Right Stack: Donut & Regional Risk Level */}
          <div className="lg:col-span-4 flex flex-col gap-6 justify-between">
            <RiskDonut data={data.active_risks_by_cause} />
            <RegionalRiskWidget levels={data.regional_risk_levels} />
          </div>
        </div>

        {/* Bottom Section: Recent Disruptions (Left) & Recommended Actions (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Recent Disruptions Table */}
          <div className="lg:col-span-7 flex flex-col">
            <RecentDisruptions
              disruptions={data.recent_disruptions}
              onSelect={handleSelectDisruption}
            />
          </div>

          {/* Recommended Actions */}
          <div className="lg:col-span-5 flex flex-col">
            <RecommendedActions
              actions={data.recommended_actions}
              onActionApproved={handleActionApproved}
            />
          </div>
        </div>
      </div>

      {/* Disruption Simulator Drawer */}
      <SimulatorDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onScenarioInjected={() => {
          loadData();
        }}
        onReset={() => {
          loadData();
        }}
      />
    </main>
  );
}
