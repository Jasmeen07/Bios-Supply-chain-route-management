"""
scenarios.py – Loads and indexes simulator scenarios from contracts/scenarios.yaml
"""
import os
import yaml
from pathlib import Path
from typing import Dict, List, Optional

_SCENARIOS_CACHE: Optional[Dict[str, dict]] = None


def get_scenarios_path() -> Path:
    # Look for contracts/scenarios.yaml relative to project root
    here = Path(__file__).resolve()
    # backend/app/simulator/scenarios.py -> 3 levels up to BIOS_backend
    proj_root = here.parent.parent.parent.parent
    contracts_file = proj_root / "contracts" / "scenarios.yaml"
    if contracts_file.exists():
        return contracts_file
    # Fallback to local
    return Path("contracts/scenarios.yaml")


def load_all_scenarios() -> List[dict]:
    global _SCENARIOS_CACHE
    if _SCENARIOS_CACHE is None:
        p = get_scenarios_path()
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                scenarios = data.get("scenarios", [])
                _SCENARIOS_CACHE = {s["id"]: s for s in scenarios}
        else:
            _SCENARIOS_CACHE = {}
    return list(_SCENARIOS_CACHE.values())


def get_scenario(scenario_id: str) -> Optional[dict]:
    load_all_scenarios()
    return _SCENARIOS_CACHE.get(scenario_id) if _SCENARIOS_CACHE else None
