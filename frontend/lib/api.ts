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
import { mockStore } from './mockData';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false'; // Default to true in dev if backend not running

async function fetchWithFallback<T>(endpoint: string, mockFn: () => T, options?: RequestInit): Promise<T> {
  if (USE_MOCK) {
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
};
