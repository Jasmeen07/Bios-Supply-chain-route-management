"""
config.py – single source of truth for all thresholds, weights, and constants.
No magic numbers anywhere else in the codebase.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./backend/data/supplysense.db")

# ── Reproducibility ───────────────────────────────────────────────────────────
SEED: int = int(os.getenv("SEED", "42"))

# ── Scheduler ─────────────────────────────────────────────────────────────────
DETECTION_INTERVAL_S: int = int(os.getenv("DETECTION_INTERVAL_S", "60"))

# ── Providers ─────────────────────────────────────────────────────────────────
WEATHER_MODE: str = os.getenv("WEATHER_MODE", "live")     # live | fixture
TRAFFIC_MODE: str = os.getenv("TRAFFIC_MODE", "simulated")  # simulated only

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ORIGINS_STR: str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://bios-supply-chain-route-management-delta.vercel.app"
)
CORS_ORIGINS: list[str] = [o.strip() for o in CORS_ORIGINS_STR.split(",")]

# ── Weather detection thresholds ──────────────────────────────────────────────
WEATHER_SAMPLE_EVERY_KM: float = 75.0        # sample points along a lane
WEATHER_CACHE_MINUTES: int = 30
WEATHER_PRECIP_HIGH_MM_H: float = 20.0       # precip_mm_per_h → severity 1
WEATHER_WIND_HIGH_KMH: float = 90.0          # gust_kmh → severity 1
WEATHER_STORM_CODES: set = {95, 96, 97, 98, 99}  # WMO codes for thunderstorms
WEATHER_SEVERITY_MEDIUM: float = 0.5
WEATHER_SEVERITY_HIGH: float = 0.75
WEATHER_CONFIDENCE_BASE: float = 0.7
WEATHER_FORECAST_HOURS: int = 24             # look-ahead window for max severity

# ── Traffic detection thresholds ──────────────────────────────────────────────
TRAFFIC_RATIO_MEDIUM: float = 1.25
TRAFFIC_RATIO_HIGH: float = 1.50
TRAFFIC_SEVERITY_DENOM: float = 0.8          # clamp((ratio-1)/denom, 0, 1)
TRAFFIC_CONFIDENCE_BASE: float = 0.60        # lower because simulated

# Traffic simulation parameters
TRAFFIC_RUSH_HOUR_BUMP_MORNING: tuple[int, int] = (7, 10)   # IST hour range
TRAFFIC_RUSH_HOUR_BUMP_EVENING: tuple[int, int] = (17, 20)
TRAFFIC_RUSH_HOUR_MAGNITUDE: float = 0.12
TRAFFIC_NOISE_SCALE: float = 0.04            # Gaussian noise std


# ── Supplier delay thresholds ─────────────────────────────────────────────────
SUPPLIER_RECENT_WINDOW_DAYS: int = 7
SUPPLIER_BASELINE_WINDOW_DAYS: int = 30
SUPPLIER_Z_MEDIUM: float = 1.5
SUPPLIER_Z_HIGH: float = 2.5
SUPPLIER_OTR_MEDIUM: float = 0.85            # on-time rate
SUPPLIER_OTR_HIGH: float = 0.70
SUPPLIER_SEVERITY_DENOM: float = 4.0        # clamp(z / denom, 0, 1)
SUPPLIER_MIN_DELIVERIES: int = 20            # for confidence saturation

# ── Inventory shortage thresholds ─────────────────────────────────────────────
INVENTORY_SAFETY_BUFFER_DAYS: float = 3.0
INVENTORY_CONFIDENCE: float = 0.95

# ── De-duplication ────────────────────────────────────────────────────────────
DISRUPTION_CLEAR_RUNS: int = 3              # runs needed to resolve a disruption
DISRUPTION_CORROBORATION_BONUS: float = 0.10  # confidence boost for two signals
DISRUPTION_CONFIDENCE_CAP: float = 1.0

# ── Impact / risk scoring ─────────────────────────────────────────────────────
REVENUE_EXPOSURE_CAP: float = 10_000_000.0  # ₹ cap for normalising exposure
RISK_SCORE_LOW_MAX: float = 35.0
RISK_SCORE_MEDIUM_MAX: float = 65.0
# risk_score = 100 * severity * (0.4 + 0.6 * exposure)

# Weather delay factor for lane: 1 + severity
# Traffic delay factor for lane: traffic ratio from provider

# ── Routing / optimiser ───────────────────────────────────────────────────────
ROUTE_K_ALTERNATIVES: int = 3               # k-shortest paths
ROUTE_COST_PER_KM: float = 12.0             # ₹ per km
ROUTE_FIXED_COST: float = 500.0             # ₹ per lane
ROUTE_WEIGHT_COST: float = 0.0001           # cost weight in edge weight formula
ROUTE_WEIGHT_RISK: float = 0.0005           # risk weight in edge weight formula
HAVERSINE_SPEED_KMH: float = 50.0           # fallback speed when OSRM unavailable
HAVERSINE_DETOUR_FACTOR: float = 1.3        # straight-line to road estimate

# ── Expedite ──────────────────────────────────────────────────────────────────
EXPEDITE_COST_MULTIPLIER: float = 1.8       # cost × this
EXPEDITE_TIME_REDUCTION: float = 0.30       # saves 30% of duration

# ── Rebalance ─────────────────────────────────────────────────────────────────
REBALANCE_MIN_SURPLUS_DAYS: float = 5.0     # donor warehouse min surplus cover

# ── Safety stock ─────────────────────────────────────────────────────────────
SAFETY_STOCK_HOLDING_COST_RATE: float = 0.02   # 2% of stock value per day

# ── Response ranking weights (defaults) ───────────────────────────────────────
DEFAULT_WEIGHTS: dict = {"time": 0.4, "cost": 0.3, "risk": 0.3}
PRIORITY_WEIGHTS: dict = {
    "fastest":  {"time": 0.6, "cost": 0.2, "risk": 0.2},
    "balanced": {"time": 0.4, "cost": 0.3, "risk": 0.3},
    "cheapest": {"time": 0.2, "cost": 0.6, "risk": 0.2},
    "safest":   {"time": 0.2, "cost": 0.2, "risk": 0.6},
}
MAX_RECOMMENDATIONS_PER_DISRUPTION: int = 3   # top N (plus MONITOR baseline)

# ── LLM (optional) ────────────────────────────────────────────────────────────
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "")
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")

# ── Network build ─────────────────────────────────────────────────────────────
NETWORK_JSON_PATH: str = "backend/data/network.json"
OSRM_BASE_URL: str = "http://router.project-osrm.org"

# ── Open-Meteo ────────────────────────────────────────────────────────────────
OPEN_METEO_URL: str = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_TIMEOUT_S: int = 10

# ── WebSocket ─────────────────────────────────────────────────────────────────
WS_PING_INTERVAL: int = 20   # seconds
