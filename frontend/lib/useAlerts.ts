'use client';

import { useEffect, useState, useRef } from 'react';
import { WsAlertEvent } from './types';
import { subscribeAlerts } from './mockData';

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

    // Listen to mock store events in all cases
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
          // Reconnect with backoff
          reconnectTimeout = setTimeout(connectWs, 5000);
        };

        socket.onerror = () => {
          if (socket) socket.close();
        };
      } catch (err) {
        // Fall back gracefully to mock emitter
        reconnectTimeout = setTimeout(connectWs, 8000);
      }
    }

    if (process.env.NEXT_PUBLIC_USE_MOCK === 'false') {
      connectWs();
    }

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (mockUnsubscribe) mockUnsubscribe();
    };
  }, []);

  return { isConnected, latestEvent };
}
