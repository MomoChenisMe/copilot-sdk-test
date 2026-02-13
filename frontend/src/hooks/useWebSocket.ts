import { useEffect, useRef, useCallback, useState } from 'react';
import { WsClient, type WsListener } from '../lib/ws-client';
import type { WsMessage, WsStatus } from '../lib/ws-types';

const client = new WsClient();

export function useWebSocket(onAuthExpired?: () => void) {
  const [status, setStatus] = useState<WsStatus>('disconnected');
  const authExpiredRef = useRef(onAuthExpired);
  authExpiredRef.current = onAuthExpired;

  useEffect(() => {
    const unsubStatus = client.onStatus(setStatus);

    const unsubMessage = client.onMessage((msg) => {
      if (msg.type === 'auth:expired') {
        authExpiredRef.current?.();
      }
    });

    client.connect();

    return () => {
      unsubStatus();
      unsubMessage();
    };
  }, []);

  const send = useCallback((message: WsMessage) => {
    client.send(message);
  }, []);

  const subscribe = useCallback((listener: WsListener) => {
    return client.onMessage(listener);
  }, []);

  return { status, send, subscribe };
}
