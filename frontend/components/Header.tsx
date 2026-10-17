'use client';

import React, { useState, useEffect } from 'react';
import { Search, Bell, SlidersHorizontal, Activity } from 'lucide-react';

interface HeaderProps {
  onOpenSimulator?: () => void;
  activeRisksCount?: number;
}

export default function Header({ onOpenSimulator, activeRisksCount = 12 }: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>('14:32 (IST)');
  const [dateStr, setDateStr] = useState<string>('Thu, 16 Oct 2026');

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

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 pt-1">
      {/* Page Title & Subtitle */}
      <div>
        <h1 className="text-2xl md:text-[26px] font-bold text-charcoal-900 tracking-tight leading-tight">
          Supply Chain Risk & Route Management
        </h1>
        <p className="text-sm text-charcoal-500 font-normal mt-0.5">
          Monitor disruptions, assess risks and plan optimal routes.
        </p>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative min-w-[260px] md:min-w-[320px]">
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
          className="flex items-center gap-1.5 px-3 py-2 bg-cream-pill hover:bg-cream-300 text-charcoal-900 font-semibold text-xs rounded-xl border border-cream-border shadow-xs transition active:scale-95"
          title="Open Disruption Simulator"
        >
          <Activity className="w-3.5 h-3.5 text-amber-700" />
          <span>Simulate</span>
        </button>

        {/* Notifications Bell */}
        <button
          className="relative p-2.5 rounded-xl bg-white border border-cream-border hover:bg-cream-100 text-charcoal-700 shadow-xs transition"
          title="Live Notifications"
          aria-label="View alerts"
        >
          <Bell className="w-4 h-4" />
          {activeRisksCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {activeRisksCount > 9 ? '9+' : activeRisksCount}
            </span>
          )}
        </button>

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
