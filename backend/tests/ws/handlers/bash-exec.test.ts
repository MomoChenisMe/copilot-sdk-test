import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBashExecHandler } from '../../../src/ws/handlers/bash-exec.js';
import type { WsHandler } from '../../../src/ws/router.js';

describe('bash-exec handler', () => {
  let handler: WsHandler;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handler = createBashExecHandler('/tmp');
    send = vi.fn();
  });

  function onMessage(msg: any) {
    const h = typeof handler === 'function' ? handler : handler.onMessage;
    h(msg, send);
  }

  it('should execute a simple command and send output + done', async () => {
    onMessage({ type: 'bash:exec', data: { command: 'echo hello', cwd: '/tmp' } });

    await new Promise((r) => setTimeout(r, 2000));

    const outputCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:output',
    );
    const doneCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:done',
    );

    expect(outputCalls.length).toBeGreaterThanOrEqual(1);
    const allOutput = outputCalls.map((c: any[]) => c[0].data.output).join('');
    expect(allOutput).toContain('hello');

    expect(doneCalls).toHaveLength(1);
    expect(doneCalls[0][0].data.exitCode).toBe(0);
  });

  it('should send non-zero exit code for failing commands', async () => {
    onMessage({ type: 'bash:exec', data: { command: 'exit 42', cwd: '/tmp' } });

    await new Promise((r) => setTimeout(r, 2000));

    const doneCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:done',
    );
    expect(doneCalls).toHaveLength(1);
    expect(doneCalls[0][0].data.exitCode).toBe(42);
  });

  it('should send stderr output with stream=stderr', async () => {
    onMessage({ type: 'bash:exec', data: { command: 'echo err >&2', cwd: '/tmp' } });

    await new Promise((r) => setTimeout(r, 2000));

    const stderrCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:output' && c[0].data.stream === 'stderr',
    );
    expect(stderrCalls.length).toBeGreaterThanOrEqual(1);
    const stderrOutput = stderrCalls.map((c: any[]) => c[0].data.output).join('');
    expect(stderrOutput).toContain('err');
  });

  it('should send error for missing command', () => {
    onMessage({ type: 'bash:exec', data: {} });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('should ignore unknown bash sub-types', () => {
    onMessage({ type: 'bash:unknown', data: {} });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('should use initialCwd when no cwd is provided in message', async () => {
    onMessage({ type: 'bash:exec', data: { command: 'pwd' } });

    await new Promise((r) => setTimeout(r, 2000));

    const outputCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:output' && c[0].data.stream === 'stdout',
    );
    const allOutput = outputCalls.map((c: any[]) => c[0].data.output).join('');
    expect(allOutput).toContain('/tmp');
  });

  it('should send bash:cwd event when cd changes directory', async () => {
    // Run cd to a different directory
    onMessage({ type: 'bash:exec', data: { command: 'cd /', cwd: '/tmp' } });

    await new Promise((r) => setTimeout(r, 2000));

    const cwdCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:cwd',
    );
    expect(cwdCalls).toHaveLength(1);
    expect(cwdCalls[0][0].data.cwd).toBe('/');
  });

  it('should not send bash:cwd when directory does not change', async () => {
    onMessage({ type: 'bash:exec', data: { command: 'echo hi', cwd: '/tmp' } });

    await new Promise((r) => setTimeout(r, 2000));

    const cwdCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:cwd',
    );
    expect(cwdCalls).toHaveLength(0);
  });
});
