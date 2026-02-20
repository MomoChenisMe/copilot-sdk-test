import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import type { WsMessage } from '../lib/ws-types';

interface UseBashModeOptions {
  subscribe: (listener: (message: WsMessage) => void) => () => void;
  send: (message: WsMessage) => void;
  tabId: string;
  onCwdChange?: (newCwd: string) => void;
}

export function useBashMode({ subscribe, send, tabId, onCwdChange }: UseBashModeOptions) {
  const outputBufferRef = useRef('');
  const cwdRef = useRef('');
  const onCwdChangeRef = useRef(onCwdChange);
  onCwdChangeRef.current = onCwdChange;

  const sendBashCommand = useCallback(
    (command: string, cwd: string, conversationId?: string) => {
      // Resolve conversationId from tab if not provided
      const convId = conversationId || useAppStore.getState().tabs[tabId]?.conversationId || '';

      // Add user message to tab
      const userMsg = {
        id: `bash-user-${Date.now()}`,
        conversationId: convId,
        role: 'user' as const,
        content: command,
        metadata: { bash: true },
        createdAt: new Date().toISOString(),
      };
      useAppStore.getState().addTabMessage(tabId, userMsg);

      // Start streaming state
      useAppStore.getState().setTabIsStreaming(tabId, true);
      outputBufferRef.current = '';
      cwdRef.current = cwd;

      // Send to backend (include conversationId so messages can be persisted)
      send({
        type: 'bash:exec',
        data: { command, cwd, conversationId: convId || undefined },
      });
    },
    [tabId, send],
  );

  useEffect(() => {
    const unsub = subscribe((message: WsMessage) => {
      const { type, data } = message;
      const payload = data as Record<string, unknown> | undefined;

      if (type === 'bash:output' && payload) {
        const output = String(payload.output ?? '');
        outputBufferRef.current += output;
        useAppStore.getState().appendTabStreamingText(tabId, output);
      }

      if (type === 'bash:cwd' && payload) {
        const newCwd = String(payload.cwd ?? '');
        if (newCwd) {
          cwdRef.current = newCwd;
          onCwdChangeRef.current?.(newCwd);
        }
      }

      if (type === 'bash:done' && payload) {
        const exitCode = (payload.exitCode as number) ?? 0;
        const user = (payload.user as string) ?? '';
        const hostname = (payload.hostname as string) ?? '';
        const gitBranch = (payload.gitBranch as string) ?? '';
        const finalOutput = outputBufferRef.current;

        // Finalize: add assistant message with accumulated output
        const assistantMsg = {
          id: `bash-result-${Date.now()}`,
          conversationId: '',
          role: 'assistant' as const,
          content: finalOutput,
          metadata: { exitCode, user, hostname, gitBranch, cwd: cwdRef.current },
          createdAt: new Date().toISOString(),
        };
        useAppStore.getState().addTabMessage(tabId, assistantMsg);

        // Clear streaming state
        useAppStore.getState().clearTabStreaming(tabId);
        outputBufferRef.current = '';
      }
    });

    return unsub;
  }, [subscribe, tabId]);

  return { sendBashCommand };
}
