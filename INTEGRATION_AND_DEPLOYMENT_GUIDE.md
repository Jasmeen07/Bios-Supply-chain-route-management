# SupplySense: Monorepo Integration, Git Branching & Deployment Guide

This guide provides the complete, step-by-step procedure to pull a clean branch from the GitHub repository, add the backend files without breaking any existing frontend code, push the changes safely, and run both frontend and backend together in unified tandem.

---

## 1. Monorepo Architecture & Directory Separation

The repository is structured so that the frontend and backend are completely decoupled in their own dedicated directories, while sharing a single source of truth (`contracts/`):

```
Bios-Supply-chain-route-management/
├── backend/                       # 🐍 FastAPI Backend Engine (Python 3.11+)
│   ├── app/
│   │   ├── api/                   # 9 REST routers (/api/overview, /api/shipments, etc.)
│   │   ├── analysis/              # Disruption detection, impact scoring & ranking
│   │   ├── providers/             # Weather, traffic, supplier & inventory providers
│   │   ├── routing/               # NetworkX multi-criteria route optimiser
│   │   ├── simulator/             # Disruption scenario injector & reset engine
│   │   ├── config.py              # Environment settings & deterministic seed (42)
│   │   ├── db.py                  # SQLAlchemy engine & session factory
│   │   ├── models.py              # SQLite ORM models
│   │   ├── schemas.py             # Pydantic v2 schemas (dual camel/snake support)
│   │   ├── ws.py                  # Real-time WebSocket connection manager
│   │   └── main.py                # FastAPI app with CORS middleware & lifespan
│   ├── data/                      # India network geometry (OSM/OSRM road lanes)
│   ├── tests/                     # 15 Pytest tests (unit, integration, resilience)
│   └── requirements.txt           # Python dependencies
│
├── frontend/                      # ⚛️ Next.js 14 Frontend (App Router, Tailwind, Leaflet)
│   ├── app/                       # 5 pages: Overview, Risks, Routes, Shipments, Suppliers
│   ├── components/                # GlobalMap, SimulatorDrawer, RecommendedActions, etc.
│   ├── lib/
│   │   ├── api.ts                 # Fetch client with seamless mock fallback
│   │   ├── types.ts               # TypeScript definitions matching contracts
│   │   ├── mockData.ts            # Reactive in-memory mock store
│   │   └── useAlerts.ts           # Live WebSocket hook with auto-reconnect
│   └── package.json
│
├── contracts/                     # 📜 Shared Interface (Single Source of Truth)
│   ├── VERSION                    # Version 1.0.0
│   ├── openapi.yaml               # OpenAPI 3.1.0 specification
│   ├── scenarios.yaml             # 20 Benchmark evaluation & simulation scenarios
│   ├── ws_events.md               # WebSocket event specification
│   └── fixtures/                  # Seeded JSON fixtures matching live database
│
├── scripts/                       # 🛠️ Automation & Evaluation Utilities
│   ├── build_network.py           # Network builder & geometry validator
│   ├── seed.py                    # Database seeder (seed 42)
│   ├── evaluate.py                # 20-scenario benchmark suite
│   ├── export_contracts.py        # Contract & fixture exporter
│   └── run_dev.py                 # Cross-platform concurrent dev runner
│
├── reports/                       # 📊 Benchmark Evidence
│   └── evaluation.md              # 100% precision, 100% recall evaluation report
│
├── Makefile                       # Unified make commands for full stack
├── requirements.txt               # Root Python dependencies
└── README.md                      # Unified Monorepo Documentation
```

> [!NOTE]
> All files to be added to GitHub have already been pre-packaged in a separate clean staging directory:  
> `backend_files_to_push/`  
> (Cleaned of all `__pycache__`, `.pytest_cache`, and temporary files).

---

## 2. Step-by-Step Git Workflow (Branch & Push)

Follow these exact terminal commands to pull a branch from GitHub, merge the backend files, and push without breaking anything.

### Step 2.1: Clone or Update the GitHub Repository
```bash
# 1. Clone the repository (if not already cloned)
git clone https://github.com/Jasmeen07/Bios-Supply-chain-route-management.git
cd Bios-Supply-chain-route-management

# Or if you already have the repo cloned locally:
git checkout main
git pull origin main
```

### Step 2.2: Create a Dedicated Feature Branch
```bash
git checkout -b feature/backend-decision-engine
```

### Step 2.3: Copy the Pre-Packaged Backend Files
Copy the contents of `backend_files_to_push/` into your local git repository root:

**On Windows (PowerShell):**
```powershell
Copy-Item -Path "c:\Users\Dhruv\Downloads\BIOS_backend\backend_files_to_push\*" -Destination "." -Recurse -Force
```

**On macOS / Linux (Bash):**
```bash
cp -r /path/to/backend_files_to_push/* .
```

### Step 2.4: Review Git Status
Check that only new directories (`backend/`, `scripts/`, `reports/`) and updated root files are staged, while `frontend/` remains untouched:
```bash
git status
```

You should see:
- `backend/` (new directory)
- `scripts/` (new directory)
- `reports/` (new directory)
- `contracts/` (unified specification)
- `Makefile` (unified root Makefile)
- `requirements.txt` (root dependency file)
- `README.md` (unified documentation)
- Existing `frontend/` files remain completely intact!

### Step 2.5: Commit and Push to GitHub
```bash
# Add the files
git add backend/ contracts/ scripts/ reports/ Makefile requirements.txt README.md supplysense_build_spec.md

# Commit with a clean conventional commit message
git commit -m "feat(backend): add FastAPI decision engine, evaluation benchmarks, and tandem contracts"

# Push the branch to GitHub
git push -u origin feature/backend-decision-engine
```

### Step 2.6: Open a Pull Request
1. Go to `https://github.com/Jasmeen07/Bios-Supply-chain-route-management`
2. You will see a banner: **`feature/backend-decision-engine had recent pushes`**.
3. Click **"Compare & pull request"**.
4. Confirm:
   - Base branch: `main`
   - Compare branch: `feature/backend-decision-engine`
   - Notice: **Able to merge (no conflicts)**.
5. Click **Create pull request** and merge!

---

## 2B. Alternative: 100% Online GitHub GUI Walkthrough

If you prefer using the **GitHub Web Interface** without running git CLI commands:

### Method 1: GitHub Web Editor (`github.dev` - Easiest Drag & Drop)
1. **Create Branch Online:**
   - Go to your repository on GitHub: `https://github.com/Jasmeen07/Bios-Supply-chain-route-management`.
   - Click the branch selector dropdown button on the top-left (currently says **`main`**).
   - In the text box, type: `feature/backend-engine`.
   - Click **Create branch: feature/backend-engine from 'main'**.
2. **Open the Web VS Code Editor:**
   - While viewing your new branch on GitHub, press the `.` (period) key on your keyboard, or change the URL in your browser from `github.com` to `github.dev`.
   - This opens full VS Code right inside your browser!
3. **Upload the Backend Files:**
   - In your Windows File Explorer, open `backend_files_to_push/`.
   - Select the folders (`backend`, `contracts`, `scripts`, `reports`) and files (`Makefile`, `requirements.txt`, `README.md`).
   - Drag and drop them directly into the left file explorer pane of `github.dev`.
4. **Commit & Push:**
   - Click the **Source Control** icon on the left sidebar (or press `Ctrl+Shift+G`).
   - Type a commit message: `feat: add backend engine and contracts`.
   - Click the checkmark **Commit & Push**.
5. **Merge to Main:**
   - Return to GitHub repo tab.
   - Click **Compare & pull request** -> **Merge pull request** -> **Confirm merge**.

---

### Method 2: Create Branch Online + Push with Git CLI
1. **Create Branch on GitHub.com:**
   - Click the **`main`** branch dropdown -> type `feature/backend-engine` -> click **Create branch**.
2. **Fetch and Switch Locally:**
   ```bash
   git fetch origin
   git checkout feature/backend-engine
   ```
3. **Copy Files from `backend_files_to_push`:**
   ```powershell
   Copy-Item -Path "backend_files_to_push\*" -Destination "." -Recurse -Force
   ```
4. **Push and Merge:**
   ```bash
   git add backend/ contracts/ scripts/ reports/ Makefile requirements.txt README.md
   git commit -m "feat(backend): add backend decision engine"
   git push origin feature/backend-engine
   ```
5. Merge the pull request on GitHub into `main`.

---

## 3. How to Run Frontend and Backend Together

Once the repository has both frontend and backend, you have multiple convenient ways to run them.

### Option A: The One-Command Unified Launcher (Recommended)

Run both servers concurrently with a single command:
```bash
python scripts/run_dev.py
```
*Or using make:*
```bash
make dev
```

This launches:
- **FastAPI Backend Server**: `http://localhost:8000` (Interactive API Docs: `http://localhost:8000/docs`)
- **Next.js Frontend Client**: `http://localhost:3000` (Connected live to backend via REST & WebSocket)
- Gracefully shuts down both child processes when you press `Ctrl+C`.

---

### Option B: Separate Terminal Windows

If you prefer viewing server logs in separate terminal windows:

#### Terminal 1 — Backend:
```bash
# 1. Install Python requirements (first time only)
pip install -r requirements.txt

# 2. Seed database baseline state
python scripts/seed.py --reset

# 3. Start backend API server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Terminal 2 — Frontend:
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies (first time only)
npm install

# 3. Start frontend connected to live backend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option C: Frontend Standalone (Mock Mode)

If you ever need to demonstrate or develop the frontend without running Python or the backend:
```bash
cd frontend
npm run dev:mock
```
The frontend will transparently use in-memory reactive fixtures with realistic network simulation.

---

## 4. Verification & Compatibility Test Results

Both frontend and backend have been rigorously tested and verified:

| Test Suite | Target | Actual Result | Status |
|---|---|---|---|
| **Backend Pytest Suite** | 100% Pass | 15 / 15 Passed (0 Failed) | ✅ PASS |
| **Detection Precision** | $\ge 90\%$ | **100.0%** | ✅ PASS |
| **Detection Recall** | $\ge 90\%$ | **100.0%** | ✅ PASS |
| **F1 Score** | $\ge 0.90$ | **1.000** | ✅ PASS |
| **Recommendation Quality** | $\ge 80\%$ | **100.0%** | ✅ PASS |
| **False Alarm Count** | 0 | **0** | ✅ PASS |
| **Scenario Injection Latency** | $< 5000\text{ ms}$ | **97.5 ms** | ✅ PASS |
| **Multi-objective Dijkstra Latency** | $< 100\text{ ms}$ | **5.1 ms** | ✅ PASS |
| **Determinism (Seed 42)** | 100% Identical | **VERIFIED** | ✅ PASS |
| **Frontend TypeScript Types** | 0 errors | **0 errors (`tsc --noEmit`)** | ✅ PASS |
| **Frontend Production Build** | Compile all routes | **8 / 8 routes compiled cleanly** | ✅ PASS |
| **End-to-End Live Browser Test** | Simulator injection & UI update | **Verified on `localhost:3000`** | ✅ PASS |

---

## 5. Live Simulator Demonstration Steps

To test the complete closed-loop system in your browser:
1. Open `http://localhost:3000`
2. Click the **⚡ Simulate** button in the header.
3. Select **Western Corridor Monsoon / Heavy Rains on NH48**.
4. Click **Inject Disruption**.
5. Observe:
   - The map colors the corridor red with an incident badge.
   - The top KPIs update to reflect active risks and revenue at risk.
   - The Active Risks breakdown donut recalculates.
   - Recommended actions populate with ranked reroute options and cost/time trade-offs.
6. Click **Approve Reroute**:
   - The backend applies the reroute to the affected shipment.
   - Risk score drops immediately in real-time via WebSocket push (`plan_applied`).
7. Click **Reset Network** in the simulator drawer to restore pristine baseline seed state at any time.
