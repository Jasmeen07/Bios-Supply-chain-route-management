"""
traffic.py – Simulated traffic provider behind a clean interface.
No real live-traffic API is used. This is clearly stated in the UI.
"""
import math
import random
from datetime import datetime, timezone
from typing import Protocol

from backend.app.config import (
    SEED, TRAFFIC_RUSH_HOUR_BUMP_MORNING, TRAFFIC_RUSH_HOUR_BUMP_EVENING,
    TRAFFIC_RUSH_HOUR_MAGNITUDE, TRAFFIC_NOISE_SCALE,
    TRAFFIC_CONFIDENCE_BASE, TRAFFIC_RATIO_MEDIUM, TRAFFIC_RATIO_HIGH,
    TRAFFIC_SEVERITY_DENOM,
)

# Active simulated incidents: lane_id → multiplier
_active_incidents: dict[str, float] = {}
_rng = random.Random(SEED)


class TrafficProvider(Protocol):
    def get_ratio(self, lane_id: str) -> float: ...
    def get_all_ratios(self, lane_ids: list) -> dict: ...


class SimulatedTrafficProvider:
    """
    Simulates realistic traffic patterns:
    - Rush-hour bump based on IST time of day
    - Gaussian noise for natural variation
    - Incident overlay for simulated disruptions
    """

    def _rush_hour_bump(self) -> float:
        ist_hour = (datetime.now(timezone.utc).hour + 5) % 24  # UTC+5:30 approx
        mo_start, mo_end = TRAFFIC_RUSH_HOUR_BUMP_MORNING
        ev_start, ev_end = TRAFFIC_RUSH_HOUR_BUMP_EVENING
        if mo_start <= ist_hour < mo_end or ev_start <= ist_hour < ev_end:
            return TRAFFIC_RUSH_HOUR_MAGNITUDE
        return 0.0

    def get_ratio(self, lane_id: str) -> float:
        bump = self._rush_hour_bump()
        noise = _rng.gauss(0, TRAFFIC_NOISE_SCALE)
        ratio = 1.0 + bump + noise
        # Apply any active incident on this lane
        incident_mult = _active_incidents.get(lane_id, 1.0)
        ratio *= incident_mult
        return max(1.0, round(ratio, 3))

    def get_all_ratios(self, lane_ids: list) -> dict:
        return {lid: self.get_ratio(lid) for lid in lane_ids}

    def inject_incident(self, lane_id: str, severity: float):
        """severity 0-1 maps to extra ratio multiplier 1.0-2.5."""
        multiplier = 1.0 + severity * 1.5
        _active_incidents[lane_id] = multiplier

    def clear_incident(self, lane_id: str):
        _active_incidents.pop(lane_id, None)

    def clear_all_incidents(self):
        _active_incidents.clear()

    def get_active_incidents(self) -> dict:
        return dict(_active_incidents)


def ratio_to_severity(ratio: float) -> float:
    """Convert traffic ratio to severity in [0, 1]."""
    return max(0.0, min((ratio - 1.0) / TRAFFIC_SEVERITY_DENOM, 1.0))


def ratio_to_level(ratio: float) -> str:
    if ratio >= TRAFFIC_RATIO_HIGH:
        return "high"
    if ratio >= TRAFFIC_RATIO_MEDIUM:
        return "medium"
    return "low"


# Singleton
traffic_provider = SimulatedTrafficProvider()
