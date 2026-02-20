import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBashMode } from '../../src/hooks/useBashMode';
import { useAppStore } from '../../src/store';
import type { WsMessage } from '../../src/lib/ws-types';

describe('useBashMode', () => {
  let subscribeFn: ReturnType<typeof vi.fn>;
  let sendFn: ReturnType<typeof vi.fn>;
  let registeredListener: ((msg: WsMessage) => void) | null;
  let tabId: string;

  beforeEach(() => {
    registeredListener = null;
    subscribeFn = vi.fn((listener: (msg: WsMessage) => void) => {
      registeredListener = listener;
      return () => { registeredListener = null; };
    });
    sendFn = vi.fn();

    // Create a tab
    useAppStore.setState({ tabs: {}, tabOrder: [], activeTabId: null });
    useAppStore.getState().openTab('conv-bash', 'Bash Tab');
    tabId = useAppStore.getState().tabOrder[0];
    useAppStore.getState().setTabMode(tabId, 'terminal');
  });

  it('sendBashCommand sends bash:exec message', () => {
    const { result } = renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId }),
    );

    act(() => {
      result.current.sendBashCommand('ls -la', '/tmp');
    });

    expect(sendFn).toHaveBeenCalledWith({
      type: 'bash:exec',
      data: { command: 'ls -la', cwd: '/tmp', conversationId: 'conv-bash' },
    });
  });

  it('sendBashCommand adds user message with command to tab', () => {
    const { result } = renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId }),
    );

    act(() => {
      result.current.sendBashCommand('echo hello', '/tmp');
    });

    const tab = useAppStore.getState().tabs[tabId];
    expect(tab.messages.length).toBe(1);
    expect(tab.messages[0].content).toBe('echo hello');
    expect(tab.messages[0].role).toBe('user');
    expect((tab.messages[0].metadata as any)?.bash).toBe(true);
  });

  it('accumulates output from bash:output events', () => {
    renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId }),
    );

    // Simulate sending a command first
    act(() => {
      // Simulate bash:output arriving
      registeredListener?.({ type: 'bash:output', data: { output: 'hello\n', stream: 'stdout' } });
    });

    const tab = useAppStore.getState().tabs[tabId];
    expect(tab.streamingText).toContain('hello');
  });

  it('finalizes on bash:done with exit code 0', () => {
    renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId }),
    );

    act(() => {
      registeredListener?.({ type: 'bash:output', data: { output: 'result\n', stream: 'stdout' } });
    });

    act(() => {
      registeredListener?.({ type: 'bash:done', data: { exitCode: 0 } });
    });

    const tab = useAppStore.getState().tabs[tabId];
    // Streaming should be cleared
    expect(tab.isStreaming).toBe(false);
    // Should have an assistant message with the output
    const assistantMsgs = tab.messages.filter((m) => m.role === 'assistant');
    expect(assistantMsgs.length).toBe(1);
    expect(assistantMsgs[0].content).toContain('result');
  });

  it('includes exit code in metadata for exit 0', () => {
    renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId }),
    );

    act(() => {
      registeredListener?.({ type: 'bash:output', data: { output: 'ok\n', stream: 'stdout' } });
    });

    act(() => {
      registeredListener?.({ type: 'bash:done', data: { exitCode: 0 } });
    });

    const tab = useAppStore.getState().tabs[tabId];
    const assistantMsgs = tab.messages.filter((m) => m.role === 'assistant');
    const meta = assistantMsgs[0].metadata as { exitCode?: number };
    expect(meta?.exitCode).toBe(0);
  });

  it('includes exit code in metadata for non-zero exit', () => {
    renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId }),
    );

    act(() => {
      registeredListener?.({ type: 'bash:output', data: { output: 'error\n', stream: 'stderr' } });
    });

    act(() => {
      registeredListener?.({ type: 'bash:done', data: { exitCode: 1 } });
    });

    const tab = useAppStore.getState().tabs[tabId];
    const assistantMsgs = tab.messages.filter((m) => m.role === 'assistant');
    expect(assistantMsgs.length).toBe(1);
    const meta = assistantMsgs[0].metadata as { exitCode?: number };
    expect(meta?.exitCode).toBe(1);
  });

  it('calls onCwdChange when bash:cwd event is received', () => {
    const onCwdChange = vi.fn();
    renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId, onCwdChange }),
    );

    act(() => {
      registeredListener?.({ type: 'bash:cwd', data: { cwd: '/home/user' } });
    });

    expect(onCwdChange).toHaveBeenCalledWith('/home/user');
  });

  it('does not call onCwdChange with empty cwd', () => {
    const onCwdChange = vi.fn();
    renderHook(() =>
      useBashMode({ subscribe: subscribeFn, send: sendFn, tabId, onCwdChange }),
    );

    act(() => {
      registeredListener?.({ type: 'bash:cwd', data: { cwd: '' } });
    });

    expect(onCwdChange).not.toHaveBeenCalled();
  });
});
