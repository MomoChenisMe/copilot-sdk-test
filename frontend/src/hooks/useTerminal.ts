import { useCallback, useRef, useEffect } from 'react';
import type { WsMessage } from '../lib/ws-types';

interface UseTerminalOptions {
  send: (message: WsMessage) => void;
  subscribe: (listener: (message: WsMessage) => void) => () => void;
  cwd: string;
}

export function useTerminal({ send, subscribe, cwd }: UseTerminalOptions) {
  const writeRef = useRef<((data: string) => void) | null>(null);

  // Subscribe to terminal messages from server
  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'terminal:output') {
        const data = msg.data as { output: string } | undefined;
        if (data?.output && writeRef.current) {
          writeRef.current(data.output);
        }
      } else if (msg.type === 'terminal:exit') {
        if (writeRef.current) {
          writeRef.current('\r\n\x1b[33mShell exited. Reconnecting...\x1b[0m\r\n');
        }
        // Auto-respawn after short delay
        setTimeout(() => {
          send({ type: 'terminal:spawn', data: { cwd } });
        }, 500);
      }
    });

    return unsub;
  }, [send, subscribe, cwd]);

  const handleData = useCallback(
    (data: string) => {
      send({ type: 'terminal:input', data: { input: data } });
    },
    [send],
  );

  const handleResize = useCallback(
    (cols: number, rows: number) => {
      send({ type: 'terminal:resize', data: { cols, rows } });
    },
    [send],
  );

  const handleReady = useCallback(() => {
    send({ type: 'terminal:spawn', data: { cwd } });
  }, [send, cwd]);

  return {
    writeRef,
    handleData,
    handleResize,
    handleReady,
  };
}
