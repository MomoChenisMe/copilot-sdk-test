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

  it('should include user and hostname in bash:done event', async () => {
    onMessage({ type: 'bash:exec', data: { command: 'echo hello', cwd: '/tmp' } });

    await new Promise((r) => setTimeout(r, 2000));

    const doneCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:done',
    );
    expect(doneCalls).toHaveLength(1);
    const doneData = doneCalls[0][0].data;
    expect(doneData.user).toBeTruthy();
    expect(typeof doneData.user).toBe('string');
    expect(doneData.hostname).toBeTruthy();
    expect(typeof doneData.hostname).toBe('string');
  });

  it('should include gitBranch in bash:done when inside a git repo', async () => {
    // Run in the project root (which should be a git repo)
    const projectRoot = process.cwd();
    onMessage({ type: 'bash:exec', data: { command: 'echo test', cwd: projectRoot } });

    await new Promise((r) => setTimeout(r, 2000));

    const doneCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:done',
    );
    expect(doneCalls).toHaveLength(1);
    const doneData = doneCalls[0][0].data;
    // Should have a gitBranch string (may be 'main', 'master', or other)
    expect(typeof doneData.gitBranch).toBe('string');
    expect(doneData.gitBranch.length).toBeGreaterThan(0);
  });

  it('should include empty gitBranch when not in a git repo', async () => {
    onMessage({ type: 'bash:exec', data: { command: 'echo test', cwd: '/tmp' } });

    await new Promise((r) => setTimeout(r, 2000));

    const doneCalls = send.mock.calls.filter(
      (c: any[]) => c[0]?.type === 'bash:done',
    );
    expect(doneCalls).toHaveLength(1);
    const doneData = doneCalls[0][0].data;
    // /tmp is not a git repo, gitBranch should be empty string
    expect(doneData.gitBranch).toBe('');
  });

  // === onBashComplete callback tests ===
  describe('onBashComplete callback', () => {
    it('should call onBashComplete after command completes with (command, output, exitCode, cwd)', async () => {
      const onBashComplete = vi.fn();
      const cbHandler = createBashExecHandler('/tmp', onBashComplete);
      const cbSend = vi.fn();

      const h = typeof cbHandler === 'function' ? cbHandler : cbHandler.onMessage;
      h({ type: 'bash:exec', data: { command: 'echo hello', cwd: '/tmp' } }, cbSend);

      await new Promise((r) => setTimeout(r, 3000));

      expect(onBashComplete).toHaveBeenCalledTimes(1);
      const [command, output, exitCode, cwd] = onBashComplete.mock.calls[0];
      expect(command).toBe('echo hello');
      expect(output).toContain('hello');
      expect(exitCode).toBe(0);
      expect(typeof cwd).toBe('string');
      expect(cwd.length).toBeGreaterThan(0);
    });

    it('should accumulate both stdout and stderr in the output', async () => {
      const onBashComplete = vi.fn();
      const cbHandler = createBashExecHandler('/tmp', onBashComplete);
      const cbSend = vi.fn();

      const h = typeof cbHandler === 'function' ? cbHandler : cbHandler.onMessage;
      h({ type: 'bash:exec', data: { command: 'echo out && echo err >&2', cwd: '/tmp' } }, cbSend);

      await new Promise((r) => setTimeout(r, 3000));

      expect(onBashComplete).toHaveBeenCalledTimes(1);
      const [, output] = onBashComplete.mock.calls[0];
      expect(output).toContain('out');
      expect(output).toContain('err');
    });

    it('should work with non-zero exit codes', async () => {
      const onBashComplete = vi.fn();
      const cbHandler = createBashExecHandler('/tmp', onBashComplete);
      const cbSend = vi.fn();

      const h = typeof cbHandler === 'function' ? cbHandler : cbHandler.onMessage;
      h({ type: 'bash:exec', data: { command: 'echo fail && exit 7', cwd: '/tmp' } }, cbSend);

      await new Promise((r) => setTimeout(r, 3000));

      expect(onBashComplete).toHaveBeenCalledTimes(1);
      const [command, output, exitCode] = onBashComplete.mock.calls[0];
      expect(command).toBe('echo fail && exit 7');
      expect(output).toContain('fail');
      expect(exitCode).toBe(7);
    });

    it('should work normally without errors when onBashComplete is not provided', async () => {
      // This uses the default handler (no callback) — same as the beforeEach handler
      onMessage({ type: 'bash:exec', data: { command: 'echo works', cwd: '/tmp' } });

      await new Promise((r) => setTimeout(r, 2000));

      const doneCalls = send.mock.calls.filter(
        (c: any[]) => c[0]?.type === 'bash:done',
      );
      expect(doneCalls).toHaveLength(1);
      expect(doneCalls[0][0].data.exitCode).toBe(0);
    });

    it('should call onBashComplete with expanded signature including meta (user, hostname, gitBranch)', async () => {
      const onBashComplete = vi.fn();
      const cbHandler = createBashExecHandler('/tmp', onBashComplete);
      const cbSend = vi.fn();

      const h = typeof cbHandler === 'function' ? cbHandler : cbHandler.onMessage;
      h({ type: 'bash:exec', data: { command: 'echo meta-test', cwd: '/tmp' } }, cbSend);

      await new Promise((r) => setTimeout(r, 3000));

      expect(onBashComplete).toHaveBeenCalledTimes(1);
      const [command, output, exitCode, cwd, meta] = onBashComplete.mock.calls[0];
      expect(command).toBe('echo meta-test');
      expect(output).toContain('meta-test');
      expect(exitCode).toBe(0);
      expect(typeof cwd).toBe('string');
      // Verify meta object contains user, hostname, gitBranch
      expect(meta).toBeDefined();
      expect(typeof meta.user).toBe('string');
      expect(meta.user.length).toBeGreaterThan(0);
      expect(typeof meta.hostname).toBe('string');
      expect(meta.hostname.length).toBeGreaterThan(0);
      expect(typeof meta.gitBranch).toBe('string');
    });

    it('should include gitBranch in meta when inside a git repo', async () => {
      const onBashComplete = vi.fn();
      const projectRoot = process.cwd();
      const cbHandler = createBashExecHandler(projectRoot, onBashComplete);
      const cbSend = vi.fn();

      const h = typeof cbHandler === 'function' ? cbHandler : cbHandler.onMessage;
      h({ type: 'bash:exec', data: { command: 'echo git-meta', cwd: projectRoot } }, cbSend);

      await new Promise((r) => setTimeout(r, 3000));

      expect(onBashComplete).toHaveBeenCalledTimes(1);
      const [, , , , meta] = onBashComplete.mock.calls[0];
      expect(meta.gitBranch.length).toBeGreaterThan(0);
    });

    it('should include empty gitBranch in meta when not inside a git repo', async () => {
      const onBashComplete = vi.fn();
      const cbHandler = createBashExecHandler('/tmp', onBashComplete);
      const cbSend = vi.fn();

      const h = typeof cbHandler === 'function' ? cbHandler : cbHandler.onMessage;
      h({ type: 'bash:exec', data: { command: 'echo no-git', cwd: '/tmp' } }, cbSend);

      await new Promise((r) => setTimeout(r, 3000));

      expect(onBashComplete).toHaveBeenCalledTimes(1);
      const [, , , , meta] = onBashComplete.mock.calls[0];
      expect(meta.gitBranch).toBe('');
    });
  });
});
