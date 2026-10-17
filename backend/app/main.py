"""
main.py – SupplySense FastAPI backend application.
Includes REST API routers, WebSocket /ws/alerts, background detection scheduler, and database initialization.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.config import DETECTION_INTERVAL_S
from backend.app.db import engine, Base, SessionLocal
from backend.app.models import Location
from backend.app import ws
from backend.app.detection.engine import run_detection
from backend.app.api import (
    overview_router,
    network_router,
    disruptions_router,
    shipments_router,
    suppliers_router,
    routes_router,
    recommendations_router,
    detect_router,
    simulate_router,
)

_scheduler_task: asyncio.Task = None


async def _detection_loop():
    """Background periodic detection loop running every DETECTION_INTERVAL_S."""
    while True:
        try:
            await asyncio.sleep(DETECTION_INTERVAL_S)
            db: Session = SessionLocal()
            try:
                await run_detection(db)
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Detection Loop Error] {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_task
    # 1. Create DB tables
    Base.metadata.create_all(bind=engine)

    # 2. Check if DB needs initial seed
    db = SessionLocal()
    try:
        loc_count = db.query(Location).count()
        if loc_count == 0:
            print("[Startup] Empty database detected. Running seed...")
            from scripts.seed import seed_all
            seed_all(db)
            print("[Startup] Seed completed.")
        # Run an initial detection pass
        await run_detection(db)
    finally:
        db.close()

    # 3. Start background periodic detection
    _scheduler_task = asyncio.create_task(_detection_loop())
    print(f"[Startup] Detection scheduler started (interval: {DETECTION_INTERVAL_S}s).")

    yield

    # Shutdown
    if _scheduler_task:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass
    print("[Shutdown] Background scheduler stopped.")


app = FastAPI(
    title="SupplySense API",
    version="1.0.0",
    description="Intelligent Supply-Chain Risk and Route Management Decision-Support Platform",
    lifespan=lifespan,
)

# CORS middleware for full cross-origin compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers under /api
app.include_router(overview_router, prefix="/api", tags=["Overview"])
app.include_router(network_router, prefix="/api", tags=["Network"])
app.include_router(disruptions_router, prefix="/api", tags=["Disruptions"])
app.include_router(shipments_router, prefix="/api", tags=["Shipments"])
app.include_router(suppliers_router, prefix="/api", tags=["Suppliers"])
app.include_router(routes_router, prefix="/api", tags=["Routes"])
app.include_router(recommendations_router, prefix="/api", tags=["Recommendations"])
app.include_router(detect_router, prefix="/api", tags=["Detection"])
app.include_router(simulate_router, prefix="/api", tags=["Simulate"])


# WebSocket alerts endpoint
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await ws.connect(websocket)
    try:
        while True:
            # Keep connection open; receive ping or client messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await ws.disconnect(websocket)
    except Exception:
        await ws.disconnect(websocket)
