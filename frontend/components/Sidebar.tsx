'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Home,
  AlertTriangle,
  GitBranch,
  Truck,
  Users,
  BarChart2,
  FileText,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Risk Monitor', href: '/risks', icon: AlertTriangle },
  { name: 'Route Planning', href: '/routes', icon: GitBranch },
  { name: 'Shipments', href: '/shipments', icon: Truck },
  { name: 'Suppliers', href: '/suppliers', icon: Users },
  { name: 'Analytics', href: '#', icon: BarChart2, disabled: true },
  { name: 'Reports', href: '#', icon: FileText, disabled: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#F4EFE6] border-r border-cream-border flex flex-col justify-between shrink-0 min-h-screen p-5">
      <div>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 px-2 py-3 mb-6 group">
          <div className="w-9 h-9 rounded-xl bg-[#2A2724] text-[#FAF7F2] flex items-center justify-center shadow-sm">
            <Box className="w-5 h-5 text-[#EADEC9]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold text-charcoal-900 leading-tight tracking-tight">
              SupplySense
            </span>
            <span className="text-[11px] font-medium text-charcoal-500 tracking-tight">
              Supply Chain Intelligence
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[14px] font-medium text-charcoal-500/50 cursor-not-allowed select-none"
                  title="Excluded from prototype scope"
                >
                  <Icon className="w-4 h-4 opacity-40" />
                  <span>{item.name}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider bg-cream-300/40 text-charcoal-500 px-1.5 py-0.5 rounded">
                    Scope cut
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[14.5px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-cream-pill text-charcoal-900 font-semibold shadow-xs'
                    : 'text-charcoal-600 hover:bg-[#EFE8DB] hover:text-charcoal-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-charcoal-900' : 'text-charcoal-500'
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-cream-border/60 px-2 text-[12px] text-charcoal-500">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-charcoal-700">v1.0.0 Protospace</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
            Active
          </span>
        </div>
        <p className="text-[11px] text-charcoal-500 leading-relaxed">
          Decisions powered by deterministic rule graphs & simulated telemetry.
        </p>
      </div>
    </aside>
  );
}
