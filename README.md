# SupplySense: Intelligent Supply-Chain Risk & Route Management

> **"A control tower that watches the whole supply network, detects disruptions before they hurt, and recommends the best reroute or action, with the evidence and trade-offs shown."**

---

## 📸 Executive Dashboard & Theme Design

SupplySense is engineered to provide supply chain commanders and logistics teams with complete situational awareness and algorithmic decision support.

The interface adheres to an executive parchment palette:
- **Primary Background**: Warm Cream (`#F7F4EE`)
- **Control Panels & Navigation**: Parchment Sand (`#F4EFE6`)
- **Active Navigation Pill**: Warm Beige (`#EADEC9`)
- **Card Surfaces**: Off-White (`#FFFFFF`) with soft borders (`#E8E2D6`) and subtle elevation (`shadow-soft`)
- **Risk Indicators**: Multi-channel cues using explicit color badges, severity text labels, and numeric scores:
  - 🔴 **High Risk**: `#DC2626` / `#FEE2E2`
  - 🟡 **Medium Risk**: `#D97706` / `#FEF3C7`
  - 🟢 **Low Risk**: `#16A34A` / `#DCFCE7`

---

## 🏛️ Project Architecture & Monorepo Structure

```
Bios-Supply-chain-route-management/
├── contracts/                  # Shared interface & single source of truth
│   ├── VERSION                 # Current contract version (1.0.0)
│   ├── openapi.yaml            # OpenAPI 3.1 REST schema
│   ├── ws_events.md            # Live WebSocket event envelopes
│   ├── scenarios.yaml          # 20 Simulator & evaluation scenarios
│   └── fixtures/               # Seeded schema-valid JSON fixtures
│       ├── overview.json
│       ├── network.json
│       ├── disruptions.json
│       ├── disruption_detail.json
│       ├── shipments.json
│       ├── suppliers.json
│       ├── route_compare.json
│       ├── approve_result.json
│       └── simulate_result.json
├── frontend/                   # Next.js 14 (App Router) + TypeScript + Tailwind
│   ├── app/
│   │   ├── page.tsx            # Global Control Tower (Map, Donut, Risks, Actions)
│   │   ├── risks/page.tsx      # Risk Monitor & Deep Evidence Inspector
│   │   ├── routes/page.tsx     # Route Planning & Multi-Alternative Comparison
│   │   ├── shipments/page.tsx  # In-Transit Shipments Tracker
│   │   ├── suppliers/page.tsx  # Vendor Performance & Drift Telemetry
│   │   ├── globals.css         # Theme tokens & leaflet styles
│   │   └── layout.tsx          # Root Layout & responsive navigation
│   ├── components/             # Reusable UI components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── GlobalMap.tsx
│   │   ├── RiskDonut.tsx
│   │   ├── RegionalRiskWidget.tsx
│   │   ├── RecentDisruptions.tsx
│   │   ├── RecommendedActions.tsx
│   │   ├── SimulatorDrawer.tsx
│   │   └── DemoBanner.tsx
│   ├── lib/
│   │   ├── api.ts              # REST client with transparent fallback
│   │   ├── mockData.ts         # In-memory reactive mock engine
│   │   ├── useAlerts.ts        # WebSocket alert hook with backoff reconnect
│   │   └── types.ts            # Type definitions generated from OpenAPI schema
│   └── README.md
├── Makefile                    # Standardized development workflows
└── supplysense_build_spec.md   # Full project specification
```

---

## 🔍 Data Honesty & Provenance

In accordance with strict hackathon principles, SupplySense never fabricates live telemetry or conceals simulated sources. Every number shown in the UI is computed deterministically from underlying graph states.

| Stream | Provider | Mode | Notes |
|---|---|---|---|
| **Weather** | Open-Meteo API | Live / Cached Fixture | Free global forecast API (precipitation, wind gusts, weather codes). |
| **Traffic** | Simulated Provider | Deterministic Model | Peak rush hour modeling with calibrated random noise. |
| **Suppliers** | Synthetic Generator | Fixed Seed (42) | 60 days of historical delivery data with statistical z-score drift checks. |
| **Inventory** | WMS Seed | Fixed Seed (42) | Dynamic days of cover vs replenishment lead times. |
| **Routing** | NetworkX / GeoJSON | Graph Algorithm | Multi-objective Dijkstra and k-shortest simple paths. |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Jasmeen07/Bios-Supply-chain-route-management.git
cd Bios-Supply-chain-route-management

# Install frontend dependencies
cd frontend
npm install
```

### 3. Running Frontend (Mock Mode - Default)
```bash
npm run dev:mock
```
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Running Against Live Backend
```bash
NEXT_PUBLIC_USE_MOCK=false npm run dev
```

### 5. Type Check & Production Build
```bash
npm run check-types
npm run build
```

---

## 🎮 Disruption Simulator

Click the **⚡ Simulate** button in the top navigation header to test live platform capabilities:
- **Inject Scenarios**: Trigger weather storms, highway closures, vendor delays, or critical stockouts.
- **Inspect Impact**: Observe the live map update corridor colors, the donut chart recompute totals, and recommendations populate.
- **Closed-Loop Execution**: Approve recommended reroutes and observe before/after risk scores drop in real-time.
- **Reset Network**: Restore the pristine baseline state at any time.

---

## 👥 Authors & Maintainers
- **Jasmeen07** (Repository Owner)
