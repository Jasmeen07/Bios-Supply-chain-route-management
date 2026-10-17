# SupplySense: Evaluator & Professor Review Manual

Welcome to the **SupplySense** evaluation repository. This guide is tailored for evaluators, professors, and technical reviewers to get the platform up and running in **under 3 minutes**, inspect the academic rigor and benchmarks, and grade the live multi-agent decision support system.

---

## 1. Quick Technical Specifications

- **Backend Architecture**: FastAPI (Python 3.11+), SQLite with SQLAlchemy ORM, NetworkX graph routing algorithms, Open-Meteo REST API, and native WebSocket server.
- **Frontend Architecture**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Leaflet.js interactive maps, Lucide icons.
- **Contract & Architecture**: OpenAPI 3.1 specification, shared JSON fixtures, bidirectional WebSocket event protocol.
- **Data Transparency**: All simulated streams (traffic curves, synthetic supplier drifts, warehouse cover days) are mathematically deterministic with fixed seed (`seed = 42`) and explicitly labeled in the UI.

---

## 2. Prerequisites

Ensure your system has the following installed:
1. **Python 3.11+** (`python --version`)
2. **Node.js 18+ or 20+** (`node --version`)
3. **npm 9+** (`npm --version`)
4. **Git** (`git --version`)

---

## 3. Quickstart: 3 Simple Steps to Run the Project

### Step 1: Clone the Repository
```bash
git clone https://github.com/Jasmeen07/Bios-Supply-chain-route-management.git
cd Bios-Supply-chain-route-management
```

### Step 2: Install Dependencies
```bash
# 1. Install Python backend dependencies
pip install -r requirements.txt
```

**For Windows (PowerShell):**
```powershell
# 2. Install Next.js frontend dependencies (using npm.cmd directly)
npm.cmd --prefix frontend install
```
*(Or enter the folder directly: `cd frontend`, then `npm.cmd install`, then `cd ..`)*

**For macOS / Linux (Bash):**
```bash
# 2. Install Next.js frontend dependencies
cd frontend && npm install && cd ..
```

### Step 3: Run Both Frontend & Backend Concurrently
Run the unified development launcher:
```bash
python scripts/run_dev.py
```
*(Alternatively, on Linux/macOS with make installed, run `make dev`)*

That's it! Both services are now running simultaneously:
- 🌐 **Frontend Control Tower Dashboard**: [http://localhost:3000](http://localhost:3000)
- ⚡ **Backend Interactive OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🔌 **Live WebSocket Alert Gateway**: `ws://localhost:8000/ws/alerts`

*(To stop both servers at any time, simply press `Ctrl+C` in your terminal)*.

---

## 4. Academic Evaluation & Benchmark Verification

SupplySense includes a formal automated evaluation suite that tests **20 ground-truth scenarios** (15 positive disruption incidents across weather, traffic, supplier delay, and inventory shortage; plus 5 negative control / benign scenarios).

### Run Test Suite (15 Unit & Integration Tests)
```bash
python -m pytest -v backend/tests
```
> **Expected Result:** `15 passed (100% green)` in ~3 seconds.  
> Validates Dijkstra routing, priority weights, formula bounds, deduplication, resolution transitions, and API contracts.

### Run 20-Scenario Benchmark Suite
```bash
python scripts/evaluate.py
```
> **Expected Benchmark Output:**
> - **Detection Precision:** `100.0%` (Target $\ge 90\%$)
> - **Detection Recall:** `100.0%` (Target $\ge 90\%$)
> - **F1 Score:** `1.000`
> - **False Alarm Count:** `0` (Target: `0`)
> - **Recommendation Quality:** `100.0%` (Target $\ge 80\%$)
> - **Scenario Injection Latency:** `~97 ms` (Target $< 5000\text{ ms}$)
> - **Multi-Criteria Route Recomputation:** `~5 ms` (Target $< 100\text{ ms}$)
> - **Determinism:** `VERIFIED` (100% identical outputs across independent seed resets)

The complete benchmark report is generated dynamically at `reports/evaluation.md`.

---

## 5. Professor Grading Walkthrough: Live Platform Demonstration

Open your browser to [http://localhost:3000](http://localhost:3000) and follow this recommended 5-minute evaluation script:

### Step 1: Inspect the Global Control Tower (`/`)
- **Interactive Geospatial Map**: Renders real Indian road network topology (OSM/OSRM geometries across 13 major logistics hubs and 66 corridors).
- **Executive KPIs**: Real-time aggregation of active disruptions, shipments at risk, total revenue at risk ($), and network on-time delivery rate.
- **Active Risks by Cause**: Donut visualization breaking down active events across weather, traffic, supplier delays, and inventory shortages.
- **Recommended Actions Table**: Top algorithmic mitigations sorted by utility score.

### Step 2: Trigger Live Disruption Simulation
1. Click the **⚡ Simulate** button in the top navigation bar.
2. In the drawer, select the first scenario: **"Western Corridor Monsoon / Heavy Rains on NH48"**.
3. Click **Inject Disruption**.
4. **Observe the Reactive Loop**:
   - The status banner confirms scenario injection in $<100\text{ ms}$.
   - The map corridor turns **red (High Risk)** with an incident badge.
   - The KPI cards and Donut chart immediately update.
   - Close the drawer to inspect the newly generated recommendations.

### Step 3: Closed-Loop Recommendation Approval
1. Under **Recommended Actions** on the dashboard, locate the newly generated plan:  
   *Action:* **Reroute via Nashik Corridor**.
2. Notice the trade-off matrix:
   - **Delay Saved:** `+6.8h`
   - **Cost Delta:** `+3.8%`
   - **Risk Drop:** `87.0 -> 18.0`
   - **Evidence Item:** Live weather precipitation and wind gust metrics.
3. Click **Approve**.
4. Notice the closed-loop execution:
   - The shipment route updates immediately.
   - The risk level drops to safe green.
   - An immutable audit trail entry is logged in the backend SQLite ledger.

### Step 4: Multi-Objective Route Comparison (`/routes`)
1. Click **Routes** in the sidebar.
2. Select shipment `S-100` or `S-108`.
3. Toggle optimization priorities:
   - **Balanced** (Default Pareto optimal)
   - **Fastest** (Minimizes transit duration)
   - **Cheapest** (Minimizes lane toll and carrier costs)
   - **Safest** (Avoids all open storm and congestion zones)
4. Compare the baseline path against up to 3 candidate alternatives with geographic polylines rendered on the map.

### Step 5: Vendor Telemetry & Supplier Performance (`/suppliers`)
1. Click **Suppliers** in the sidebar.
2. Inspect the vendor scorecards:
   - Evaluates **60 days of historical delivery data**.
   - Computes statistical z-score drift tracking for mean lead time and on-time delivery rate.
   - Classifies vendor risk into Tier 1, Tier 2, or Tier 3 status.

### Step 6: Reset Network State
1. Open the **⚡ Simulate** drawer again.
2. Click **Reset Network**.
3. The platform clears all active incidents and restores the pristine baseline state (`seed = 42`).

---

## 6. Architecture & Codebase Map

For code review and grading, here are the core engineering components:

| Component | Path | Responsibility |
|---|---|---|
| **Disruption Detection Engine** | `backend/app/detection/engine.py` | 60-second loop evaluating threshold rules, z-scores, and cover days |
| **Risk Scoring & Boundaries** | `backend/app/analysis/scoring.py` | Normalized formula $S = 100 \times (0.45 \cdot \text{sev} + 0.35 \cdot \text{vuln} + 0.20 \cdot \text{conf})$ |
| **Multi-Objective Routing** | `backend/app/routing/optimiser.py` | NetworkX k-shortest paths with composite cost functions |
| **Response Mitigation Generator** | `backend/app/analysis/response.py` | Candidates generator (reroute, alternate supplier, expedite, rebalance) |
| **Pydantic Contract Schemas** | `backend/app/schemas.py` | Canonical REST contract shapes with dual snake_case/camelCase support |
| **WebSocket Event Gateway** | `backend/app/ws.py` | Push alert broadcaster (`disruption_created`, `plan_applied`, etc.) |
| **Next.js Frontend Client** | `frontend/app/` | Reactive UI with zero mock leakage when connected to live backend |

---

## 7. Troubleshooting & FAQ

- **Port Conflict (8000 or 3000 in use):**  
  Run `make clean` or specify alternate ports:  
  `uvicorn backend.app.main:app --port 8080` and `cd frontend && npm run dev -- -p 3001`.
- **Database Reset:**  
  Run `python scripts/seed.py --reset` to reconstruct the SQLite database from scratch.
- **Frontend Standalone Demo:**  
  To run the frontend without the Python backend, run `cd frontend && npm run dev:mock`.
