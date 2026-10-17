"""
weather.py – Weather provider using Open-Meteo (real) or recorded fixtures (offline).
"""
import json
import math
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

from backend.app.config import (
    WEATHER_MODE, OPEN_METEO_URL, OPEN_METEO_TIMEOUT_S,
    WEATHER_SAMPLE_EVERY_KM, WEATHER_PRECIP_HIGH_MM_H,
    WEATHER_WIND_HIGH_KMH, WEATHER_STORM_CODES,
    WEATHER_FORECAST_HOURS, WEATHER_CONFIDENCE_BASE,
)

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "weather_fixtures")


def _sample_points(geometry: dict, every_km: float = WEATHER_SAMPLE_EVERY_KM) -> list:
    """Sample up to 6 lat/lng points along a GeoJSON LineString."""
    coords = geometry.get("coordinates", [])
    if not coords:
        return []
    if len(coords) == 1:
        return [(coords[0][1], coords[0][0])]

    # Compute total length and sample uniformly
    def seg_len(a, b):
        dlat = math.radians(b[1] - a[1])
        dlng = math.radians(b[0] - a[0])
        p1 = math.radians(a[1])
        p2 = math.radians(b[1])
        x = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlng / 2) ** 2
        return 6371 * 2 * math.asin(math.sqrt(x))

    total = sum(seg_len(coords[i], coords[i + 1]) for i in range(len(coords) - 1))
    step = max(every_km, total / 6)  # max 6 points
    points = [(coords[0][1], coords[0][0])]

    accum = 0.0
    for i in range(len(coords) - 1):
        l = seg_len(coords[i], coords[i + 1])
        accum += l
        if accum >= step:
            points.append((coords[i + 1][1], coords[i + 1][0]))
            accum = 0.0
        if len(points) >= 6:
            break

    if (coords[-1][1], coords[-1][0]) not in points:
        points.append((coords[-1][1], coords[-1][0]))

    return points[:6]


def _severity_from_hourly(hourly: dict, hours: int = WEATHER_FORECAST_HOURS) -> tuple:
    """Return (severity, evidence_list) from Open-Meteo hourly data."""
    times = hourly.get("time", [])
    precip = hourly.get("precipitation", [0] * len(times))
    wind_gusts = hourly.get("wind_gusts_10m", [0] * len(times))
    wmo_codes = hourly.get("weather_code", [0] * len(times))

    max_sev = 0.0
    evidence = []
    now_utc = datetime.now(timezone.utc)

    for i, t_str in enumerate(times[:hours]):
        try:
            t = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
            if t < now_utc:
                continue
        except Exception:
            continue

        p = precip[i] if i < len(precip) else 0
        w = wind_gusts[i] if i < len(wind_gusts) else 0
        wmo = wmo_codes[i] if i < len(wmo_codes) else 0

        ps = min(p / WEATHER_PRECIP_HIGH_MM_H, 1.0)
        ws = min(w / WEATHER_WIND_HIGH_KMH, 1.0)
        ss = 1.0 if wmo in WEATHER_STORM_CODES else 0.0

        sev = max(ps, ws, ss)
        if sev > max_sev:
            max_sev = sev
            evidence = [
                {"metric": "precip_mm_per_h", "value": round(p, 2), "ts": t_str, "score": round(ps, 3)},
                {"metric": "wind_gust_kmh", "value": round(w, 1), "ts": t_str, "score": round(ws, 3)},
                {"metric": "wmo_code", "value": wmo, "ts": t_str, "score": round(ss, 1)},
            ]

    return max_sev, evidence


async def fetch_weather_for_lane(lane_id: str, geometry: dict) -> dict:
    """
    Returns a dict with: severity, confidence, evidence, simulated.
    """
    if WEATHER_MODE == "fixture":
        return _load_fixture(lane_id)

    points = _sample_points(geometry)
    if not points:
        return {"severity": 0.0, "confidence": WEATHER_CONFIDENCE_BASE, "evidence": [], "simulated": False}

    # Build multi-point request to Open-Meteo
    lat_str = ",".join(str(p[0]) for p in points)
    lng_str = ",".join(str(p[1]) for p in points)

    params = {
        "latitude": lat_str,
        "longitude": lng_str,
        "hourly": "precipitation,wind_gusts_10m,weather_code",
        "forecast_days": 2,
        "timezone": "UTC",
    }

    try:
        async with httpx.AsyncClient(timeout=OPEN_METEO_TIMEOUT_S) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        print(f"[WeatherProvider] Open-Meteo failed for {lane_id}: {e}. Using fixture fallback.")
        return _load_fixture(lane_id)

    # Open-Meteo returns a list when multiple lat/lng given, else a single dict
    if isinstance(data, list):
        all_sev = []
        all_ev = []
        for d in data:
            s, ev = _severity_from_hourly(d.get("hourly", {}))
            all_sev.append(s)
            if ev:
                all_ev.extend(ev)
        severity = max(all_sev, default=0.0)
        evidence = all_ev[:6]
    else:
        severity, evidence = _severity_from_hourly(data.get("hourly", {}))

    ts_now = datetime.utcnow().isoformat() + "Z"
    return {
        "severity": round(severity, 4),
        "confidence": WEATHER_CONFIDENCE_BASE,
        "evidence": [
            {
                "source": "open-meteo",
                "simulated": False,
                "metric": e["metric"],
                "value": e["value"],
                "ts": e.get("ts", ts_now),
            }
            for e in evidence
        ],
        "simulated": False,
    }


def _load_fixture(lane_id: str) -> dict:
    """Load a pre-recorded fixture for offline demo mode."""
    path = os.path.join(FIXTURE_PATH, f"{lane_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    # Generic mild weather fixture
    return {
        "severity": 0.1,
        "confidence": WEATHER_CONFIDENCE_BASE,
        "evidence": [
            {"source": "open-meteo-fixture", "simulated": True, "metric": "precip_mm_per_h",
             "value": 1.0, "ts": datetime.utcnow().isoformat() + "Z"}
        ],
        "simulated": True,
    }
