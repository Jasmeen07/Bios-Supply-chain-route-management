"""
build_network.py – builds backend/data/network.json once.

Calls OSRM for each lane to get real road distance and geometry.
Falls back to haversine + straight polyline if OSRM is unreachable.
Run once before starting the backend. The JSON is committed to the repo.
"""
import json
import math
import os
import sys
import time

import requests

# ── Demo network definition ───────────────────────────────────────────────────

LOCATIONS = [
    {"id": "ludhiana",   "name": "Ludhiana",   "type": "supplier",  "lat": 30.9010, "lng": 75.8573},
    {"id": "pune",       "name": "Pune",        "type": "supplier",  "lat": 18.5204, "lng": 73.8567},
    {"id": "surat",      "name": "Surat",       "type": "supplier",  "lat": 21.1702, "lng": 72.8311},
    {"id": "chennai",    "name": "Chennai",     "type": "supplier",  "lat": 13.0827, "lng": 80.2707},
    {"id": "delhi",      "name": "Delhi NCR",   "type": "warehouse", "lat": 28.6139, "lng": 77.2090},
    {"id": "nagpur",     "name": "Nagpur",      "type": "warehouse", "lat": 21.1458, "lng": 79.0882},
    {"id": "bengaluru",  "name": "Bengaluru",   "type": "warehouse", "lat": 12.9716, "lng": 77.5946},
    {"id": "mumbai",     "name": "Mumbai",      "type": "store",     "lat": 19.0760, "lng": 72.8777},
    {"id": "kolkata",    "name": "Kolkata",     "type": "store",     "lat": 22.5726, "lng": 88.3639},
    {"id": "hyderabad",  "name": "Hyderabad",   "type": "store",     "lat": 17.3850, "lng": 78.4867},
    {"id": "jaipur",     "name": "Jaipur",      "type": "store",     "lat": 26.9124, "lng": 75.7873},
    {"id": "lucknow",    "name": "Lucknow",     "type": "store",     "lat": 26.8467, "lng": 80.9462},
    {"id": "ahmedabad",  "name": "Ahmedabad",   "type": "store",     "lat": 23.0225, "lng": 72.5714},
]

LOC_BY_ID = {loc["id"]: loc for loc in LOCATIONS}

HUBS = [loc["id"] for loc in LOCATIONS if loc["type"] == "warehouse"]
SUPPLIERS = [loc["id"] for loc in LOCATIONS if loc["type"] == "supplier"]
STORES = [loc["id"] for loc in LOCATIONS if loc["type"] == "store"]

OSRM_BASE = "http://router.project-osrm.org"
HAVERSINE_SPEED_KMH = 50.0
HAVERSINE_DETOUR = 1.3


def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlng / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def nearest_n(loc_id, candidates, n=3):
    loc = LOC_BY_ID[loc_id]
    dists = [
        (c, haversine_km(loc["lat"], loc["lng"], LOC_BY_ID[c]["lat"], LOC_BY_ID[c]["lng"]))
        for c in candidates if c != loc_id
    ]
    dists.sort(key=lambda x: x[1])
    return [d[0] for d in dists[:n]]


def osrm_route(a, b):
    """Return (distance_km, duration_s, geometry_geojson) or None on failure."""
    la, ba = LOC_BY_ID[a], LOC_BY_ID[b]
    coords = f"{ba['lng']},{ba['lat']};{la['lng']},{la['lat']}"
    url = f"{OSRM_BASE}/route/v1/driving/{coords}?overview=simplified&geometries=geojson&steps=false"
    try:
        r = requests.get(url, timeout=8)
        r.raise_for_status()
        data = r.json()
        route = data["routes"][0]
        return (
            route["distance"] / 1000,
            route["duration"],
            route["geometry"],
        )
    except Exception as e:
        print(f"  OSRM failed for {a}→{b}: {e}")
        return None


def straight_geojson(a, b):
    la, lb = LOC_BY_ID[a], LOC_BY_ID[b]
    return {
        "type": "LineString",
        "coordinates": [[la["lng"], la["lat"]], [lb["lng"], lb["lat"]]],
    }


def build_lane(a, b, cost_per_km=12.0, fixed_cost=500.0):
    result = osrm_route(a, b)
    if result:
        dist_km, dur_s, geometry = result
        approx = False
    else:
        dist_km = haversine_km(
            LOC_BY_ID[a]["lat"], LOC_BY_ID[a]["lng"],
            LOC_BY_ID[b]["lat"], LOC_BY_ID[b]["lng"],
        ) * HAVERSINE_DETOUR
        dur_s = (dist_km / HAVERSINE_SPEED_KMH) * 3600
        geometry = straight_geojson(a, b)
        approx = True

    cost = dist_km * cost_per_km + fixed_cost
    lane_id = f"L_{a}_{b}"
    return {
        "id": lane_id,
        "from_id": a,
        "to_id": b,
        "distance_km": round(dist_km, 2),
        "baseline_duration_s": round(dur_s, 1),
        "cost": round(cost, 2),
        "geometry": geometry,
        "approximate": approx,
    }


def main():
    edges = set()

    # Hub-to-hub (both directions)
    for i, h1 in enumerate(HUBS):
        for h2 in HUBS[i + 1:]:
            edges.add((h1, h2))
            edges.add((h2, h1))

    # Each supplier → 3 nearest hubs (both directions)
    for s in SUPPLIERS:
        for h in nearest_n(s, HUBS, 3):
            edges.add((s, h))
            edges.add((h, s))

    # Each store → 3 nearest hubs (both directions)
    for st in STORES:
        for h in nearest_n(st, HUBS, 3):
            edges.add((st, h))
            edges.add((h, st))

    lanes = []
    print(f"Building {len(edges)} lanes...")
    for i, (a, b) in enumerate(sorted(edges)):
        print(f"  [{i+1}/{len(edges)}] {a} -> {b}")
        lane = build_lane(a, b)
        lanes.append(lane)
        time.sleep(0.25)   # be polite to OSRM demo server

    network = {"locations": LOCATIONS, "lanes": lanes}
    out_path = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "network.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(network, f, indent=2)
    print(f"\nSaved {len(lanes)} lanes to {out_path}")

    approx_count = sum(1 for l in lanes if l["approximate"])
    if approx_count:
        print(f"  WARNING: {approx_count} lanes are approximate (OSRM unavailable)")


if __name__ == "__main__":
    main()
