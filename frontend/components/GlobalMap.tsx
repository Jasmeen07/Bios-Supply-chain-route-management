'use client';

import React, { useState } from 'react';
import { AlertTriangle, Plane, Ship, Truck, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Disruption, LaneEdge, LocationNode } from '../lib/types';

interface GlobalMapProps {
  locations?: LocationNode[];
  lanes?: LaneEdge[];
  disruptions?: Disruption[];
  onSelectDisruption?: (id: string) => void;
}

export default function GlobalMap({
  locations = [],
  lanes = [],
  disruptions = [],
  onSelectDisruption,
}: GlobalMapProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.0));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div className="bg-white rounded-2xl border border-cream-border p-5 shadow-soft relative overflow-hidden flex flex-col">
      {/* Map Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 z-10">
        <div>
          <h2 className="text-[17px] font-bold text-charcoal-900 tracking-tight">
            Global Supply Chain Map
          </h2>
          <p className="text-xs text-charcoal-500">
            Real-time monitoring of corridors, active disruptions & in-transit modes
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3.5 text-xs text-charcoal-600 bg-cream-100/80 px-3 py-1.5 rounded-xl border border-cream-border/60">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
            <span className="font-medium text-charcoal-700">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100"></span>
            <span className="font-medium text-charcoal-700">Medium Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100"></span>
            <span className="font-medium text-charcoal-700">High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="font-medium text-red-700">Disruption</span>
          </div>
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div className="relative w-full h-[380px] bg-[#FAF8F5] rounded-xl border border-cream-border/60 overflow-hidden flex items-center justify-center select-none">
        {/* SVG World Map Viewport */}
        <div
          className="w-full h-full transition-transform duration-300 ease-out origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox="0 0 1000 500"
            className="w-full h-full object-cover"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F0EBE1" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="1000" height="500" fill="#FAF7F2" />
            <rect width="1000" height="500" fill="url(#grid)" opacity="0.6" />

            {/* Stylized Continents (Warm tan/cream landmasses matching mockup) */}
            <g fill="#EFE8DB" stroke="#E2DAC9" strokeWidth="0.8">
              {/* North America */}
              <path d="M 120 70 Q 180 50 240 70 Q 280 110 260 160 Q 230 200 210 240 Q 170 210 140 180 Q 100 130 120 70 Z" />
              {/* Central America & Caribbean */}
              <path d="M 210 240 Q 230 280 250 310 Q 235 320 220 290 Z" />
              {/* South America */}
              <path d="M 250 300 Q 320 310 350 370 Q 330 460 280 470 Q 250 430 240 370 Q 230 330 250 300 Z" />
              {/* Europe & UK */}
              <path d="M 420 80 Q 480 60 520 90 Q 510 150 460 160 Q 420 140 420 80 Z" />
              <path d="M 405 85 Q 415 80 415 105 Q 400 100 405 85 Z" />
              {/* Africa */}
              <path d="M 440 170 Q 540 160 560 240 Q 540 360 480 390 Q 430 330 430 240 Q 420 190 440 170 Z" />
              {/* Asia & India */}
              <path d="M 520 80 Q 720 50 820 110 Q 840 220 780 260 Q 730 280 680 220 Q 640 230 610 260 Q 580 190 530 170 Z" />
              <path d="M 620 200 Q 660 210 650 280 Q 630 300 610 250 Z" />
              {/* Australia */}
              <path d="M 760 330 Q 860 320 880 390 Q 830 440 760 410 Q 740 360 760 330 Z" />
            </g>

            {/* Connecting Corridor Routes (curved arcs colored by risk) */}
            <g strokeLinecap="round" fill="none">
              {/* Route: Santos -> Singapore (Green dashed, low risk) */}
              <path
                d="M 330 380 Q 500 450 670 340"
                stroke="#16A34A"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.85"
              />

              {/* Route: Singapore -> New York (Green dashed, low risk) */}
              <path
                d="M 230 170 Q 300 240 330 380"
                stroke="#16A34A"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.8"
              />

              {/* Route: New York -> Rotterdam (Green dashed, low risk) */}
              <path
                d="M 230 170 Q 340 130 450 145"
                stroke="#16A34A"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.8"
              />

              {/* Route: Rotterdam -> Shanghai (Red dashed, HIGH risk weather disruption) */}
              <path
                d="M 450 145 Q 600 120 720 180"
                stroke="#DC2626"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                opacity="0.9"
              />

              {/* Route: Shanghai -> Shenzhen (Amber dashed, medium risk) */}
              <path
                d="M 720 180 Q 725 210 710 230"
                stroke="#D97706"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                opacity="0.9"
              />

              {/* Route: Shenzhen -> Singapore (Red dashed, HIGH risk supplier delay) */}
              <path
                d="M 710 230 Q 690 290 670 340"
                stroke="#DC2626"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                opacity="0.9"
              />

              {/* Air Cargo Bypass Corridor: Singapore -> Rotterdam (Amber dashed with plane) */}
              <path
                d="M 670 340 Q 560 220 450 145"
                stroke="#F59E0B"
                strokeWidth="1.8"
                strokeDasharray="3,3"
                opacity="0.75"
              />
            </g>

            {/* Transport Mode Floating Badges */}
            {/* Cargo Ship between Santos & Singapore */}
            <g transform="translate(515, 385)">
              <circle r="14" fill="#FFFFFF" stroke="#E2DAC9" strokeWidth="1" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))" />
              <Ship className="w-4 h-4 text-charcoal-700" x="-8" y="-8" />
            </g>

            {/* Cargo Ship between NY & Rotterdam */}
            <g transform="translate(340, 150)">
              <circle r="14" fill="#FFFFFF" stroke="#E2DAC9" strokeWidth="1" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))" />
              <Ship className="w-4 h-4 text-charcoal-700" x="-8" y="-8" />
            </g>

            {/* Air Cargo Plane between Singapore & Europe */}
            <g transform="translate(565, 240)">
              <circle r="14" fill="#FFFFFF" stroke="#E2DAC9" strokeWidth="1" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))" />
              <Plane className="w-4 h-4 text-amber-600" x="-8" y="-8" />
            </g>

            {/* Truck on inland lane near Shanghai */}
            <g transform="translate(640, 230)">
              <circle r="14" fill="#FFFFFF" stroke="#E2DAC9" strokeWidth="1" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))" />
              <Truck className="w-4 h-4 text-charcoal-700" x="-8" y="-8" />
            </g>

            {/* City Location Nodes */}
            {/* New York */}
            <g transform="translate(230, 170)" className="cursor-pointer" onClick={() => setSelectedNode('New York')}>
              <circle r="7" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="14" y="4" fontSize="12" fontWeight="600" fill="#2A2724" className="select-none font-sans">
                New York
              </text>
            </g>

            {/* Rotterdam */}
            <g transform="translate(450, 145)" className="cursor-pointer" onClick={() => setSelectedNode('Rotterdam')}>
              <circle r="7" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="14" y="4" fontSize="12" fontWeight="600" fill="#2A2724" className="select-none font-sans">
                Rotterdam
              </text>
            </g>

            {/* Shanghai */}
            <g transform="translate(720, 180)" className="cursor-pointer" onClick={() => setSelectedNode('Shanghai')}>
              <circle r="7" fill="#D97706" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="14" y="4" fontSize="12" fontWeight="600" fill="#2A2724" className="select-none font-sans">
                Shanghai
              </text>
            </g>

            {/* Shenzhen */}
            <g transform="translate(710, 230)" className="cursor-pointer" onClick={() => setSelectedNode('Shenzhen')}>
              <circle r="7" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="14" y="4" fontSize="12" fontWeight="600" fill="#2A2724" className="select-none font-sans">
                Shenzhen
              </text>
            </g>

            {/* Singapore */}
            <g transform="translate(670, 340)" className="cursor-pointer" onClick={() => setSelectedNode('Singapore')}>
              <circle r="7" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="14" y="4" fontSize="12" fontWeight="600" fill="#2A2724" className="select-none font-sans">
                Singapore
              </text>
            </g>

            {/* Santos */}
            <g transform="translate(330, 380)" className="cursor-pointer" onClick={() => setSelectedNode('Santos')}>
              <circle r="7" fill="#D97706" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x="14" y="4" fontSize="12" fontWeight="600" fill="#2A2724" className="select-none font-sans">
                Santos
              </text>
            </g>

            {/* Disruption Popups (Matching mockup exactly) */}
            {/* Rotterdam Severe Weather Popup */}
            <g
              transform="translate(460, 95)"
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => onSelectDisruption && onSelectDisruption('d_102')}
            >
              <rect
                width="145"
                height="42"
                rx="10"
                fill="#FDEBEB"
                stroke="#F8B4B4"
                strokeWidth="1"
                filter="drop-shadow(0 2px 5px rgba(220, 38, 38, 0.15))"
              />
              <circle cx="20" cy="21" r="11" fill="#EF4444" />
              <AlertTriangle className="w-3.5 h-3.5 text-white" x="13" y="14" />
              <text x="38" y="17" fontSize="11" fontWeight="700" fill="#991B1B" className="font-sans">
                Severe weather
              </text>
              <text x="38" y="31" fontSize="10" fill="#B91C1C" className="font-sans">
                Rotterdam
              </text>
            </g>

            {/* Shenzhen Supplier Delay Popup */}
            <g
              transform="translate(730, 195)"
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => onSelectDisruption && onSelectDisruption('d_101')}
            >
              <rect
                width="135"
                height="42"
                rx="10"
                fill="#FDEBEB"
                stroke="#F8B4B4"
                strokeWidth="1"
                filter="drop-shadow(0 2px 5px rgba(220, 38, 38, 0.15))"
              />
              <circle cx="20" cy="21" r="11" fill="#EF4444" />
              <AlertTriangle className="w-3.5 h-3.5 text-white" x="13" y="14" />
              <text x="38" y="17" fontSize="11" fontWeight="700" fill="#991B1B" className="font-sans">
                Supplier delay
              </text>
              <text x="38" y="31" fontSize="10" fill="#B91C1C" className="font-sans">
                Shenzhen
              </text>
            </g>
          </svg>
        </div>

        {/* Floating Zoom Controls (Bottom Left, matching reference image) */}
        <div className="absolute left-4 bottom-4 flex flex-col bg-white rounded-xl border border-cream-border shadow-soft overflow-hidden z-20">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-cream-100 text-charcoal-700 border-b border-cream-border transition active:scale-95"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-cream-100 text-charcoal-700 border-b border-cream-border transition active:scale-95"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-cream-100 text-charcoal-500 transition active:scale-95"
            title="Reset View"
            aria-label="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Interactive Node Info Box */}
        {selectedNode && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-cream-border shadow-soft text-xs text-charcoal-800 z-20 flex items-center gap-2">
            <span className="font-bold text-charcoal-900">{selectedNode} Hub</span>
            <span className="text-charcoal-500">Telemetry active</span>
            <button
              onClick={() => setSelectedNode(null)}
              className="ml-2 text-charcoal-500 hover:text-charcoal-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
