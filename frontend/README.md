# SupplySense Frontend

The frontend for **SupplySense: Supply-Chain Risk and Route Management Control Tower**.

Designed closely after the executive dashboard mockup with a warm cream/beige aesthetic, high-contrast typography, interactive SVG corridor maps, real-time disruption monitoring, and closed-loop rerouting.

## Design System & Theme Tokens

- **Background**: Warm Cream `#F7F4EE`
- **Sidebar & Panels**: `#F4EFE6`
- **Active Navigation Pill**: `#EADEC9` with `#2A2724` typography
- **Cards**: Pure White `#FFFFFF` with soft borders (`#E8E2D6`) and subtle elevation (`shadow-soft`)
- **Risk Badges**:
  - **High Risk**: Coral Red `#DC2626` / `#FEE2E2`
  - **Medium Risk**: Warm Amber `#D97706` / `#FEF3C7`
  - **Low Risk**: Forest Green `#16A34A` / `#DCFCE7`

## Features

1. **Global Supply Chain Map**:
   - Real-time visualization of transportation corridors, multi-modal transport icons (Maritime cargo ship, Air express, Land freight truck).
   - Dynamic disruption alert badges (e.g. "Severe weather Rotterdam", "Supplier delay Shenzhen").
   - Interactive zoom controls (+, -, reset) and hub inspection popups.

2. **Active Risks by Cause**:
   - Centralized donut chart displaying active risk distributions (Supplier Delay, Weather, Traffic, Inventory Shortage, Geopolitical) with real-time risk counter.

3. **Regional Risk Levels**:
   - Multi-segment progress bars for key operational theatres (North America, Europe, Asia, South America, Africa).

4. **Recent Disruptions Feed**:
   - Real-time tabular stream of events (Time, Location, Issue, Impact, Risk Level) with one-click drill-down.

5. **Recommended Actions**:
   - Ranked mitigation strategies with clear quantitative trade-offs (delay savings, cost impact, risk score drop).
   - One-click approval flow with instant reactive feedback and before/after risk delta.

6. **Risk Monitor & Deep Evidence Inspector** (`/risks`):
   - Multi-criteria filtering by disruption cause, severity, and operational status.
   - Transparent sensor evidence logs with explicit `Simulated` vs `Live Verified` labeling.

7. **Route Planning & Intelligent Optimization** (`/routes`):
   - Interactive visualizer comparing current path against candidate bypasses.
   - Dynamic priority weight adjustment (Fastest, Balanced, Cheapest, Safest) recalculating multi-objective utilities.
   - Closed-loop execution: approving a route updates network risk and affected shipments.

8. **Shipments & Suppliers Portals** (`/shipments`, `/suppliers`):
   - Operational visibility into in-transit SKUs, scheduled vs actual ETAs, vendor reliability scores, and historical lead-time drift.

9. **Disruption Simulator Drawer**:
   - Accessible via the **Simulate** button in the header.
   - Preset scenarios from `contracts/scenarios.yaml` for live demonstration and evaluation.
   - Network baseline reset button.

## Running Locally

### Development with Mock Fixtures (Default)
```bash
npm run dev:mock
```
Opens [http://localhost:3000](http://localhost:3000) using mock store and simulation emitter.

### Development with Live Backend
```bash
NEXT_PUBLIC_USE_MOCK=false npm run dev
```

### Type Checking & Build
```bash
npm run check-types
npm run build
```
