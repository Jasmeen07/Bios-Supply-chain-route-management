"""
routes_simulate.py – POST /api/simulate, POST /api/simulate/reset, and GET /api/simulate/scenarios
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.schemas import SimulateRequest, SimulateResult
from backend.app.simulator.inject import inject_scenario, reset_simulation
from backend.app.simulator.scenarios import load_all_scenarios

router = APIRouter()


@router.post("/simulate", response_model=SimulateResult)
async def simulate(req: SimulateRequest, db: Session = Depends(get_db)):
    """
    Inject a disruption scenario (either by scenario_id or custom payload).
    """
    try:
        res = await inject_scenario(db, scenario_id=req.scenario_id, custom=req.custom)
        d_ids = res.get("disruption_ids", [])
        return SimulateResult(
            success=True,
            scenario_id=res["scenario_id"],
            description=res["description"],
            disruptions_created=res["disruptions_created"],
            disruption_ids=d_ids,
            injected_disruption_id=d_ids[0] if d_ids else "",
            status="active",
            message=res["message"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {e}")


@router.post("/simulate/reset")
async def reset(db: Session = Depends(get_db)):
    """
    Reset all simulation incidents and restore baseline seed network state.
    """
    try:
        res = await reset_simulation(db)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset error: {e}")


@router.get("/simulate/scenarios")
def list_scenarios() -> List[Dict[str, Any]]:
    """
    Returns all registered scenarios for the frontend Simulator drawer.
    """
    return load_all_scenarios()
