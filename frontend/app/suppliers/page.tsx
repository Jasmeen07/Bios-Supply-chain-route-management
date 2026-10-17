'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import DemoBanner from '../../components/DemoBanner';
import { api } from '../../lib/api';
import { Supplier } from '../../lib/types';
import { Users, Search, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await api.getSuppliers();
        setSuppliers(list);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredSuppliers = suppliers.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.location_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <main className="flex-1 p-5 md:p-7 max-w-[1600px] w-full mx-auto flex flex-col justify-between">
      <Header />
      <DemoBanner />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Suppliers & Vendor Performance Telemetry
          </h2>
          <p className="text-xs text-charcoal-500">
            Statistical lead time drift tracking, on-time delivery rates, and active supplier disruptions.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-charcoal-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suppliers or cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-cream-border rounded-xl text-charcoal-800 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-cream-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Supplier Performance Table */}
      <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-cream-border text-charcoal-500 font-semibold bg-cream-50/50">
              <tr>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Base Lead Time</th>
                <th className="py-3 px-3">Active Delay</th>
                <th className="py-3 px-3">On-Time Rate (30d)</th>
                <th className="py-3 px-3">Reliability Score</th>
                <th className="py-3 px-3 text-right">Active Disruptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border/50">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-cream-50/70 transition">
                  <td className="py-3 px-3 font-semibold text-charcoal-900">
                    {sup.name}
                    <div className="text-[10px] font-mono text-charcoal-400">{sup.id}</div>
                  </td>
                  <td className="py-3 px-3 text-charcoal-700">
                    {sup.location_name}
                  </td>
                  <td className="py-3 px-3 text-charcoal-900 font-medium">
                    {sup.base_lead_time_days} days
                  </td>
                  <td className="py-3 px-3">
                    {sup.current_delay_days > 0 ? (
                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        +{sup.current_delay_days} days
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium">On schedule</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-cream-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            sup.on_time_rate < 75
                              ? 'bg-red-500'
                              : sup.on_time_rate < 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${sup.on_time_rate}%` }}
                        />
                      </div>
                      <span className="font-bold text-charcoal-800">
                        {sup.on_time_rate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-charcoal-900">
                      {Math.round(sup.reliability_score * 100)} / 100
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {sup.active_disruptions_count > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        {sup.active_disruptions_count} Disrupted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
