'use client';

import { useEffect, useState, useRef } from 'react';
import { WsAlertEvent } from './types';
import { subscribeAlerts } from './mockData';
import { getBackendStatus } from './api';

/**
 * Unified alerts hook.
 * - ALWAYS subscribes to mock-store events (so mock-mode simulation / approve
 *   produces immediate toasts and KPI updates).
 * - Only opens a real WebSocket to the backend if the auto-detect probe
 *   (in api.ts) confirmed the backend is online.
 */
export function useAlerts(onEvent?: (event: WsAlertEvent) => void) {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [latestEvent, setLatestEvent] = useState<WsAlertEvent | null>(null);
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/alerts';
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let mockUnsubscribe: (() => void) | null = null;

    // Always listen to mock store events (works in both mock & live mode)
    mockUnsubscribe = subscribeAlerts((event) => {
      setLatestEvent(event);
      if (callbackRef.current) {
        callbackRef.current(event);
      }
    });

    function connectWs() {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setIsConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const parsed: WsAlertEvent = JSON.parse(event.data);
            setLatestEvent(parsed);
            if (callbackRef.current) {
              callbackRef.current(parsed);
            }
          } catch (e) {
            console.error('Failed to parse WS event:', e);
          }
        };

        socket.onclose = () => {
          // Reconnect with backoff (only if backend was confirmed online)
          reconnectTimeout = setTimeout(connectWs, 5000);
        };

        socket.onerror = () => {
          if (socket) socket.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWs, 8000);
      }
    }

    // Only attempt WebSocket when the backend was confirmed reachable by the
    // auto-detect probe in api.ts. This prevents connection spam when running
    // the frontend standalone.
    const checkAndConnect = () => {
      const status = getBackendStatus();
      if (status === 'online') {
        connectWs();
      } else if (status === 'unknown') {
        // Backend not probed yet — check again shortly after first API call resolves
        setTimeout(checkAndConnect, 3000);
      }
      // status === 'offline' → skip WebSocket entirely, mock events handle everything
    };

    checkAndConnect();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (mockUnsubscribe) mockUnsubscribe();
    };
  }, []);

  return { isConnected, latestEvent };
}
