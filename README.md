# SupplySense — Backend Decision-Support Engine

> *"A control tower that watches the whole supply network, detects disruptions before they hurt, and recommends the best reroute or action, with the evidence and trade-offs shown."*

---

## 1. System Architecture

```mermaid
flowchart TD
  S[Simulator / Scenarios] --> A[Signal Ingestion]
  A -->|Traffic, Weather, Suppliers, Inventory| B[(SQLite Database)]
  B --> C[Detection Engine (60s loop)]
  C -->|Disruptions| D[Impact Analysis]
  D --> E[Risk Scoring (0-100)]
  E --> F[Response Generator & Route Optimiser]
  F --> G[Ranking, Explanations & Evidence]
  G --> H[FastAPI REST & WebSocket /ws/alerts]
  H -->|User Approves| I[Apply Plan / Audit Log]
  I --> B
```

SupplySense is a decision-support backend that monitors supply-chain networks, detects disruptions across four categories (weather, traffic, supplier delay, inventory shortage), quantifies financial and operational impacts, generates ranked mitigation plans, and closes the loop when recommendations are approved.

---

## 2. Real vs. Simulated Data Transparency

In accordance with our data-honesty design principle:

| Signal / Layer | Source | Implementation | In UI Labeled As |
|---|---|---|---|
| **Weather** | Open-Meteo API | Cached multi-coordinate hourly forecast with fixture fallback | Real Forecast / Simulated Storm |
| **Road Network** | OpenStreetMap / OSRM | India regional road geometry cached in `backend/data/network.json` | Real Road Geometry |
| **Traffic** | Simulated Provider | Time-of-day rush-hour curve + Gaussian noise + incident overlay | `Simulated Traffic` (Transparent) |
| **Suppliers** | Synthetic Generator | Fixed-seed historical distributions with z-score drift tracking | Synthetic Historical Lead-time |
| **Inventory** | Synthetic Generator | Daily store demand + warehouse cover days calculation | Stored Inventory Ledger |
| **Explanations** | Algorithmic Template Generator | Grounded strictly in structured evidence facts; zero hallucinated numbers | Deterministic Template |

---

## 3. REST API Endpoints & WebSocket

All endpoints are prefixed with `/api`:

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health status, database connection, seed ID |
| `/api/overview` | `GET` | Top KPIs, risk by cause, top risky lanes, recent disruptions, recommendations |
| `/api/network` | `GET` | Locations and lanes with live risk scores and durations |
| `/api/disruptions` | `GET` | Filterable list of disruptions (`status`, `type`, `level`) |
| `/api/disruptions/{id}` | `GET` | Disruption detail with impacts, evidence items, and candidate actions |
| `/api/shipments` | `GET` | Active shipments enriched with origin/destination names, delay, and route risk |
| `/api/suppliers` | `GET` | Supplier scorecards with on-time rate, current delay, and risk tier |
| `/api/routes/compare` | `GET` | Current route vs. up to 3 alternatives with live priority weighting (`fastest`, `balanced`, `cheapest`, `safest`) |
| `/api/recommendations` | `GET` | Ranked recommendations |
| `/api/recommendations/{id}/approve` | `POST` | Approves and executes action, updates shipment/order/inventory, logs audit, broadcasts WebSocket event (idempotent) |
| `/api/detect/run` | `POST` | Triggers immediate full detection loop |
| `/api/simulate` | `POST` | Injects a disruption scenario (`scenario_id` or custom payload) |
| `/api/simulate/reset` | `POST` | Resets network, clears incidents, and restores clean baseline seed state |
| `/api/simulate/scenarios` | `GET` | Lists all 20 scenario templates for the simulator drawer |
| `/ws/alerts` | `WebSocket` | Real-time push notifications (`disruption_created`, `disruption_updated`, `disruption_resolved`, `recommendation_ready`, `plan_applied`, `simulation_reset`) |

---

## 4. Setup and Quickstart

### Prerequisites
- Python 3.11+
- pip

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Initialize Seed Database
```bash
python scripts/seed.py --reset
```

### 3. Start the API Server
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger documentation is available at: `http://localhost:8000/docs`

---

## 5. Verification & Testing

### Run Pytest Suite (Unit, Integration, Resilience)
```bash
python -m pytest -v backend/tests
```
Expected output: **15 passed, 100% green**.

### Run System Evaluation (20 Scenarios Benchmark)
```bash
python scripts/evaluate.py
```
Generated report: `reports/evaluation.md`
- **Detection Precision:** 100.0% (Target $\ge 90\%$)
- **Detection Recall:** 100.0% (Target $\ge 90\%$)
- **F1 Score:** 1.000
- **False Alarm Count:** 0 (Target: 0)
- **Recommendation Quality:** 100.0% (Target $\ge 80\%$)
- **Average Latency:** < 150 ms (Target < 5000 ms)
- **Determinism:** VERIFIED (100% identical outputs for fixed seed)

---

## 6. Monorepo & Frontend Tandem Compatibility

The backend was built to operate in pure tandem with the Next.js frontend:
1. **No Directory Conflicts:** All backend code resides cleanly in `backend/`, `contracts/`, `scripts/`, `reports/`.
2. **Contracts & TypeScript Types:** Single source of truth in `contracts/openapi.yaml` and `contracts/fixtures/`.
3. **CORS Enabled:** Wildcard CORS middleware allows the deployed Vercel frontend or local Next.js client (`localhost:3000`) to connect immediately.
4. **Resilient Field Aliasing:** Endpoints support both contract shapes and frontend camelCase/snake_case aliases (`total_active_risks` / `active_disruptions`, `top_recommendations` / `recommended_actions`, etc.).
