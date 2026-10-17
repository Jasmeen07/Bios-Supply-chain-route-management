'use client';

import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import DemoBanner from '../../components/DemoBanner';
import { api } from '../../lib/api';
import { Shipment, RiskLevel } from '../../lib/types';
import { Truck, Search, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await api.getShipments();
        setShipments(list);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredShipments = shipments.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.id.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        s.sku_name.toLowerCase().includes(q) ||
        s.origin_name.toLowerCase().includes(q) ||
        s.destination_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-charcoal-900 tracking-tight">
            Active In-Transit Shipments
          </h2>
          <p className="text-xs text-charcoal-500">
            Real-time tracking of active shipments, scheduled vs live ETAs, and corridor risks.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-charcoal-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by SKU or route..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-cream-border rounded-xl text-charcoal-800 placeholder:text-charcoal-400 focus:outline-none focus:ring-1 focus:ring-cream-500 shadow-2xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-cream-border rounded-xl px-3 py-1.5 text-charcoal-800 font-medium focus:outline-none focus:ring-1 focus:ring-cream-500 shadow-2xs"
          >
            <option value="all">All Status</option>
            <option value="in_transit">In Transit</option>
            <option value="delayed">Delayed</option>
            <option value="rerouted">Rerouted</option>
          </select>
        </div>
      </div>

      {/* Shipments Table Card */}
      <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-cream-border text-charcoal-500 font-semibold bg-cream-50/50">
              <tr>
                <th className="py-3 px-3">Shipment ID</th>
                <th className="py-3 px-3">Product / SKU</th>
                <th className="py-3 px-3">Origin → Destination</th>
                <th className="py-3 px-3">Quantity</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Planned ETA</th>
                <th className="py-3 px-3">Current ETA (Delay)</th>
                <th className="py-3 px-3">Risk</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border/50">
              {filteredShipments.map((s) => (
                <tr key={s.id} className="hover:bg-cream-50/70 transition">
                  <td className="py-3 px-3 font-mono font-bold text-charcoal-900">
                    {s.id}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-charcoal-900">{s.sku_name}</div>
                    <div className="text-[11px] font-mono text-charcoal-500">{s.sku}</div>
                  </td>
                  <td className="py-3 px-3 text-charcoal-700">
                    <span className="font-medium text-charcoal-900">{s.origin_name}</span> → {s.destination_name}
                  </td>
                  <td className="py-3 px-3 font-medium text-charcoal-900">
                    {s.qty.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                        s.status === 'delayed'
                          ? 'bg-red-50 text-red-700'
                          : s.status === 'rerouted'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {s.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-charcoal-500 font-mono text-[11px]">
                    {new Date(s.planned_eta).toLocaleDateString()} {new Date(s.planned_eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-charcoal-800 text-[11px]">
                      {new Date(s.current_eta).toLocaleDateString()}
                    </span>
                    {s.delay_h > 0 && (
                      <span className="ml-1 text-[11px] font-bold text-amber-700">
                        (+{s.delay_h}h)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {getRiskBadge(s.risk_level)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/routes?shipment_id=${s.id}`}
                      className="inline-flex items-center gap-1 text-[11.5px] font-bold text-charcoal-900 hover:text-amber-800 transition"
                    >
                      <span>Optimize</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
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
