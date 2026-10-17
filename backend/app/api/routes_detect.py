"""
routes_detect.py – POST /api/detect/run
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db import get_db
from backend.app.models import Disruption
from backend.app.detection.engine import run_detection

router = APIRouter()


@router.post("/detect/run")
async def trigger_detection(db: Session = Depends(get_db)):
    """
    Manually triggers a full detection cycle across all 4 rules:
    weather, traffic, supplier delay, inventory shortage.
    """
    result = await run_detection(db)
    open_count = db.query(Disruption).filter(Disruption.status == "open").all()
    return {
        "status": "success",
        "message": "Detection cycle completed.",
        "created_ids": result.get("created", []) if isinstance(result, dict) else [],
        "updated_ids": result.get("updated", []) if isinstance(result, dict) else [],
        "total_open_disruptions": len(open_count),
    }
