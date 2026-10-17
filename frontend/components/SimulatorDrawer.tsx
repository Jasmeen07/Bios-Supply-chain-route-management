'use client';

import React, { useState } from 'react';
import { X, Play, RotateCcw, AlertTriangle, CloudRain, Truck, Users, Package, CheckCircle } from 'lucide-react';
import { scenariosList } from '../lib/mockData';
import { api } from '../lib/api';

interface SimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioInjected?: (scenarioId: string) => void;
  onReset?: () => void;
}

export default function SimulatorDrawer({
  isOpen,
  onClose,
  onScenarioInjected,
  onReset,
}: SimulatorDrawerProps) {
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleInject = async (scenarioId: string) => {
    try {
      setIsProcessing(true);
      const res = await api.injectScenario(scenarioId);
      setActiveScenarioId(scenarioId);
      setStatusMessage(res.description || 'Scenario active in simulation');
      if (onScenarioInjected) onScenarioInjected(scenarioId);
    } catch (err) {
      console.error(err);
      setStatusMessage('Error injecting scenario');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsProcessing(true);
      await api.resetSimulation();
      setActiveScenarioId(null);
      setStatusMessage('Network reset to clean baseline (seed 42).');
      if (onReset) onReset();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'weather':
        return <CloudRain className="w-4 h-4 text-sky-600" />;
      case 'traffic':
        return <Truck className="w-4 h-4 text-amber-600" />;
      case 'supplier_delay':
        return <Users className="w-4 h-4 text-red-600" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-emerald-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-emerald-700" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/30 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-[#FAF7F2] border-l border-cream-border h-full shadow-2xl flex flex-col justify-between p-6 z-10 overflow-y-auto">
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-cream-border">
            <div>
              <h2 className="text-lg font-bold text-charcoal-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Disruption Simulator
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Inject disruptions into network to evaluate real-time response.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-charcoal-500 hover:bg-cream-200 transition"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status line */}
          <div className="mt-4 p-3 rounded-xl bg-cream-200/60 border border-cream-border text-xs text-charcoal-700 flex items-center justify-between">
            <span className="font-medium">
              Mode: <span className="text-amber-800 font-bold">Simulated Telemetry</span>
            </span>
            <span className="text-[11px] text-charcoal-500">Seed: 42</span>
          </div>

          {statusMessage && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Scenarios Preset List */}
          <div className="mt-5 space-y-2.5">
            <span className="text-xs font-bold text-charcoal-500 uppercase tracking-wider">
              Scenarios Presets
            </span>

            {scenariosList.map((sc) => {
              const isActive = activeScenarioId === sc.id;
              return (
                <div
                  key={sc.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                      : 'bg-white border-cream-border hover:border-cream-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cream-100">
                        {getScenarioIcon(sc.type)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-charcoal-900 leading-tight">
                          {sc.name}
                        </h4>
                        <span className="text-[10px] uppercase font-bold text-charcoal-500">
                          {sc.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInject(sc.id)}
                      disabled={isProcessing}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition ${
                        isActive
                          ? 'bg-amber-600 text-white'
                          : 'bg-cream-200 hover:bg-cream-300 text-charcoal-800'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isActive ? 'Active' : 'Inject'}</span>
                    </button>
                  </div>

                  <p className="text-[11.5px] text-charcoal-600 mt-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reset Actions Footer */}
        <div className="pt-4 border-t border-cream-border mt-6">
          <button
            onClick={handleReset}
            disabled={isProcessing}
            className="w-full py-2.5 px-4 bg-white hover:bg-cream-100 text-charcoal-800 border border-cream-border font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 active:scale-98"
          >
            <RotateCcw className="w-4 h-4 text-charcoal-500" />
            <span>Reset Simulation to Baseline</span>
          </button>
        </div>
      </div>
    </div>
  );
}
