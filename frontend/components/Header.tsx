'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, SlidersHorizontal, Activity } from 'lucide-react';
import { api } from '../lib/api';
import { Disruption } from '../lib/types';
import { useAlerts } from '../lib/useAlerts';

interface HeaderProps {
  onOpenSimulator?: () => void;
  activeRisksCount?: number;
}

export default function Header({ onOpenSimulator, activeRisksCount: propCount }: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>('14:32 (IST)');
  const [dateStr, setDateStr] = useState<string>('Thu, 16 Oct 2026');
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [activeCount, setActiveCount] = useState<number>(propCount ?? 12);

  // Subscribe to live alerts for dynamic refresh
  const { latestEvent } = useAlerts();

  // Fetch latest disruptions (refreshes on every alert event and on panel open)
  const loadDisruptions = async () => {
    try {
      const list = await api.getDisruptions('open');
      setDisruptions(list.slice(0, 5)); // Show top 5
      setActiveCount(list.length);
    } catch {
      // keep previous state
    }
  };

  useEffect(() => {
    loadDisruptions();
  }, []);

  // Refresh disruptions whenever a new alert fires (e.g. simulation injection)
  useEffect(() => {
    if (latestEvent) {
      loadDisruptions();
    }
  }, [latestEvent]);

  useEffect(() => {
    // Format live IST clock
    const updateTime = () => {
      const now = new Date();
      const optionsDate: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      };
      const optionsTime: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
      };

      setDateStr(now.toLocaleDateString('en-GB', optionsDate));
      setTimeStr(`${now.toLocaleTimeString('en-GB', optionsTime)} (IST)`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const severityColor = (level: string) => {
    if (level === 'high') return { bg: 'bg-red-50/70', border: 'border-red-200/60', title: 'text-red-900', badge: 'text-red-600' };
    if (level === 'medium') return { bg: 'bg-amber-50/70', border: 'border-amber-200/60', title: 'text-amber-900', badge: 'text-amber-600' };
    return { bg: 'bg-cream-50', border: 'border-cream-border', title: 'text-charcoal-800', badge: 'text-emerald-600' };
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 pt-1">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl md:text-[26px] font-bold text-charcoal-900 tracking-tight leading-tight">
          Supply Chain Risk &amp; Route Management
        </h1>
        <p className="text-sm text-charcoal-500 font-normal mt-0.5">
          Monitor disruptions, assess risks and plan optimal routes.
        </p>
      </div>

      {/* Header Actions & Nav */}
      <div className="flex items-center gap-3">
        {/* Top Header Navigation Links */}
        <nav className="hidden sm:flex items-center gap-1 bg-cream-100/90 p-1 rounded-xl border border-cream-border text-xs font-semibold">
          <Link
            href="/risks"
            className="px-2.5 py-1.5 rounded-lg text-charcoal-700 hover:text-charcoal-900 hover:bg-cream-200 transition"
          >
            Risk Monitor
          </Link>
          <Link
            href="/routes"
            className="px-2.5 py-1.5 rounded-lg text-charcoal-700 hover:text-charcoal-900 hover:bg-cream-200 transition"
          >
            Route Planning
          </Link>
        </nav>

        {/* Search Bar */}
        <div className="relative min-w-[220px] md:min-w-[280px]">
          <Search className="w-4 h-4 text-charcoal-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search shipments, suppliers or locations..."
            className="w-full pl-9 pr-4 py-2 bg-white/90 border border-cream-border rounded-xl text-xs md:text-sm text-charcoal-900 placeholder:text-charcoal-500/70 focus:outline-none focus:ring-2 focus:ring-cream-500/50 shadow-xs transition"
          />
        </div>

        {/* Simulator Drawer Trigger */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 px-3 py-2 bg-cream-pill hover:bg-cream-300 text-charcoal-900 font-semibold text-xs rounded-xl border border-cream-border shadow-xs transition active:scale-95 cursor-pointer"
          title="Open Disruption Simulator"
        >
          <Activity className="w-3.5 h-3.5 text-amber-700" />
          <span>Simulate</span>
        </button>

        {/* Notifications Bell with Popover */}
        <div className="relative">
          <button
            onClick={() => {
              if (!isNotifOpen) loadDisruptions(); // refresh on open
              setIsNotifOpen(!isNotifOpen);
            }}
            className={`relative p-2.5 rounded-xl border border-cream-border transition shadow-xs ${isNotifOpen ? 'bg-cream-200 text-charcoal-900' : 'bg-white hover:bg-cream-100 text-charcoal-700'}`}
            title="Live Notifications"
            aria-label="View alerts"
          >
            <Bell className="w-4 h-4" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {activeCount > 9 ? '9+' : activeCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Panel — Dynamic from live/mock data */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl border border-cream-border shadow-xl z-50 p-4 space-y-3 animate-fade-in text-charcoal-900">
              <div className="flex items-center justify-between pb-2 border-b border-cream-border">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs tracking-tight">Active Disruption Alerts</span>
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                    {activeCount} Active
                  </span>
                </div>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs text-charcoal-400 hover:text-charcoal-800 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {disruptions.length === 0 && (
                  <div className="p-3 text-xs text-charcoal-500 text-center">
                    No active disruptions. Network healthy.
                  </div>
                )}
                {disruptions.map((d) => {
                  const colors = severityColor(d.level);
                  const affectedShipment = d.impact?.affected_shipments?.[0];
                  return (
                    <div key={d.id} className={`p-3 ${colors.bg} border ${colors.border} rounded-xl text-xs space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${colors.title}`}>{d.issue_title}</span>
                        <span className={`text-[10px] font-semibold ${colors.badge}`}>
                          {d.level.charAt(0).toUpperCase() + d.level.slice(1)} ({d.risk_score}/100)
                        </span>
                      </div>
                      <p className="text-[11px] text-charcoal-700 leading-snug">
                        {d.entity.name} — {d.impact_summary}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-cream-border/50 text-[10px]">
                        <span className="text-charcoal-500 font-mono">
                          {d.time_ago || `Detected: ${new Date(d.detected_at).toLocaleTimeString()}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`/risks?id=${d.id}`}
                            className="text-charcoal-600 hover:text-charcoal-900 underline font-semibold"
                            onClick={() => setIsNotifOpen(false)}
                          >
                            Inspect
                          </a>
                          {affectedShipment && (
                            <a
                              href={`/routes?shipment_id=${affectedShipment}&disruption_id=${d.id}`}
                              className="text-emerald-700 font-bold hover:text-emerald-900 underline flex items-center gap-0.5"
                              onClick={() => setIsNotifOpen(false)}
                            >
                              ⚡ Reroute {affectedShipment} →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-cream-border flex items-center justify-between text-[11px]">
                <a
                  href="/risks"
                  className="text-amber-800 font-bold hover:underline"
                  onClick={() => setIsNotifOpen(false)}
                >
                  Open Risk Monitor →
                </a>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-charcoal-500 hover:text-charcoal-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Badge */}
        <div
          className="w-9 h-9 rounded-full bg-[#E5D7BF] text-[#3D332A] font-semibold text-xs flex items-center justify-center border border-cream-border shadow-xs cursor-pointer select-none"
          title="Logged in as Jasmeen (JK)"
        >
          JK
        </div>

        {/* Live IST Date & Time Display */}
        <div className="hidden lg:flex flex-col text-right pl-1 border-l border-cream-border/70 text-[11px] leading-tight text-charcoal-500">
          <span className="font-medium text-charcoal-700">{dateStr}</span>
          <span className="text-charcoal-500">{timeStr}</span>
        </div>
      </div>
    </header>
  );
}
