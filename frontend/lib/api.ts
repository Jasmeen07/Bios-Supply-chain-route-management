import {
  OverviewData,
  NetworkData,
  Disruption,
  DisruptionDetail,
  Shipment,
  Supplier,
  RouteCompareData,
  ApproveResult,
} from './types';
import { mockStore, scenariosList } from './mockData';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/+$/, '')}/api`;

// ---------------------------------------------------------------------------
// Auto-detect backend availability
// On first API call we probe the backend. If it responds we use live mode for
// the rest of the session. If it fails we switch to mock mode permanently.
// This means the frontend works perfectly standalone (just `npm run dev`)
// AND works with the live backend when it's running – zero config needed.
// ---------------------------------------------------------------------------
let _backendStatus: 'unknown' | 'online' | 'offline' = 'unknown';
let _probePromise: Promise<boolean> | null = null;

async function isBackendOnline(): Promise<boolean> {
  if (_backendStatus === 'online') return true;
  if (_backendStatus === 'offline') return false;

  // Only probe once – reuse the in-flight promise if multiple calls arrive simultaneously
  if (!_probePromise) {
    _probePromise = (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000); // 2s max wait
        const res = await fetch(`${BASE_URL}/overview`, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          _backendStatus = 'online';
          console.info('[SupplySense] Backend detected at', BASE_URL, '→ live mode');
          return true;
        }
        throw new Error(`status ${res.status}`);
      } catch {
        _backendStatus = 'offline';
        console.info('[SupplySense] Backend unreachable → mock mode (all features work offline)');
        return false;
      }
    })();
  }
  return _probePromise;
}

/** Expose the resolved backend status so other modules (e.g. useAlerts) can check */
export function getBackendStatus(): 'unknown' | 'online' | 'offline' {
  return _backendStatus;
}

async function fetchWithFallback<T>(endpoint: string, mockFn: () => T, options?: RequestInit): Promise<T> {
  const online = await isBackendOnline();

  if (!online) {
    // Artificial small delay to reflect realistic network feel
    await new Promise((r) => setTimeout(r, 60));
    return mockFn();
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`API call to ${endpoint} failed, falling back to mock fixtures:`, err);
    return mockFn();
  }
}

export const api = {
  getOverview: (): Promise<OverviewData> => {
    return fetchWithFallback('/overview', () => mockStore.getOverview());
  },

  getNetwork: (): Promise<NetworkData> => {
    return fetchWithFallback('/network', () => mockStore.getNetwork());
  },

  getDisruptions: (status?: string, type?: string, level?: string): Promise<Disruption[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (type) params.append('type', type);
    if (level) params.append('level', level);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchWithFallback(`/disruptions${qs}`, () => mockStore.getDisruptions(status, type, level));
  },

  getDisruptionDetail: (id: string): Promise<DisruptionDetail | null> => {
    return fetchWithFallback(`/disruptions/${id}`, () => mockStore.getDisruptionDetail(id));
  },

  getShipments: (): Promise<Shipment[]> => {
    return fetchWithFallback('/shipments', () => mockStore.getShipments());
  },

  getSuppliers: (): Promise<Supplier[]> => {
    return fetchWithFallback('/suppliers', () => mockStore.getSuppliers());
  },

  getRouteCompare: (shipmentId: string, priority = 'balanced'): Promise<RouteCompareData> => {
    return fetchWithFallback(
      `/routes/compare?shipment_id=${shipmentId}&priority=${priority}`,
      () => mockStore.getRouteCompare(shipmentId, priority)
    );
  },

  approveRecommendation: (id: string): Promise<ApproveResult> => {
    return fetchWithFallback(
      `/recommendations/${id}/approve`,
      () => mockStore.approveRecommendation(id),
      { method: 'POST' }
    );
  },

  injectScenario: (scenarioId: string): Promise<any> => {
    return fetchWithFallback(
      '/simulate',
      () => mockStore.injectScenario(scenarioId),
      {
        method: 'POST',
        body: JSON.stringify({ scenario_id: scenarioId }),
      }
    );
  },

  resetSimulation: (): Promise<any> => {
    return fetchWithFallback(
      '/simulate/reset',
      () => mockStore.resetSimulation(),
      { method: 'POST' }
    );
  },

  getScenarios: (): Promise<any[]> => {
    return fetchWithFallback('/simulate/scenarios', () => scenariosList);
  },
};
