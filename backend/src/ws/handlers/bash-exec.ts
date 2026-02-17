import { spawn, execSync } from 'node:child_process';
import { realpathSync, existsSync } from 'node:fs';
import { homedir, userInfo, hostname as osHostname } from 'node:os';
import type { Readable } from 'node:stream';
import type { WsHandler } from '../router.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('bash-exec');
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 512_000; // 500 KB

export function createBashExecHandler(initialCwd?: string): WsHandler {
  return {
    onMessage(message, send) {
      const { type, data } = message;
      const payload = (data ?? {}) as Record<string, unknown>;

      switch (type) {
        case 'bash:exec': {
          const command = payload.command;
          const rawCwd = (payload.cwd as string) || initialCwd || process.cwd();
          // Resolve ~ to home directory (Node.js spawn doesn't do tilde expansion)
          const resolvedCwd = rawCwd.startsWith('~')
            ? rawCwd.replace(/^~/, homedir())
            : rawCwd;
          // Validate cwd exists, fall back to safe defaults
          const cwd = existsSync(resolvedCwd)
            ? resolvedCwd
            : (initialCwd && existsSync(initialCwd) ? initialCwd : process.cwd());

          if (!command || typeof command !== 'string') {
            send({ type: 'error', data: { message: 'Missing or invalid command' } });
            return;
          }

          let totalBytes = 0;
          let killed = false;

          // Wrap the command to capture the final working directory via fd3.
          // This allows us to detect `cd` and persist directory changes.
          const wrappedCommand = `${command}\n__ec=$?\npwd >&3 2>/dev/null\nexit $__ec`;

          const shell = process.env.SHELL || '/bin/bash';
          const child = spawn(shell, ['-c', wrappedCommand], {
            cwd,
            env: { ...process.env },
            stdio: ['ignore', 'pipe', 'pipe', 'pipe'], // fd3 for CWD capture
          });

          // Read the final CWD from fd3
          let capturedCwd = '';
          const fd3 = child.stdio[3] as Readable | null;
          if (fd3) {
            fd3.on('data', (chunk: Buffer) => {
              capturedCwd += chunk.toString('utf-8');
            });
          }

          const timer = setTimeout(() => {
            killed = true;
            child.kill('SIGKILL');
            send({
              type: 'bash:output',
              data: { output: '\n[Process timed out after 30s]\n', stream: 'stderr' },
            });
            send({ type: 'bash:done', data: { exitCode: 124 } });
          }, TIMEOUT_MS);

          child.stdout.on('data', (data: Buffer) => {
            totalBytes += data.length;
            if (totalBytes > MAX_OUTPUT_BYTES) {
              if (!killed) {
                killed = true;
                child.kill('SIGKILL');
                send({
                  type: 'bash:output',
                  data: { output: '\n[Output truncated]\n', stream: 'stderr' },
                });
              }
              return;
            }
            send({
              type: 'bash:output',
              data: { output: data.toString('utf-8'), stream: 'stdout' },
            });
          });

          child.stderr.on('data', (data: Buffer) => {
            totalBytes += data.length;
            if (totalBytes > MAX_OUTPUT_BYTES) return;
            send({
              type: 'bash:output',
              data: { output: data.toString('utf-8'), stream: 'stderr' },
            });
          });

          child.on('close', (code) => {
            clearTimeout(timer);
            if (!killed) {
              // Check if CWD changed after the command.
              // Resolve symlinks (e.g., /tmp -> /private/tmp on macOS) to avoid
              // false positives when comparing paths.
              const newCwd = capturedCwd.trim();
              let resolvedInputCwd: string;
              try {
                resolvedInputCwd = realpathSync(cwd as string);
              } catch {
                resolvedInputCwd = cwd as string;
              }
              if (newCwd && newCwd !== resolvedInputCwd) {
                send({ type: 'bash:cwd', data: { cwd: newCwd } });
              }

              // Gather environment info for prompt display
              let gitBranch = '';
              try {
                const effectiveCwd = newCwd || resolvedInputCwd;
                gitBranch = execSync('git rev-parse --abbrev-ref HEAD', {
                  cwd: effectiveCwd,
                  timeout: 2000,
                  stdio: ['ignore', 'pipe', 'ignore'],
                }).toString().trim();
              } catch {
                // Not a git repo or git not available
              }

              let user = '';
              let hostname = '';
              try { user = userInfo().username; } catch { /* ignore */ }
              try { hostname = osHostname(); } catch { /* ignore */ }

              send({
                type: 'bash:done',
                data: { exitCode: code ?? 1, user, hostname, gitBranch },
              });
            }
          });

          child.on('error', (err) => {
            clearTimeout(timer);
            log.error({ err }, 'bash exec error');
            send({
              type: 'bash:output',
              data: { output: `Error: ${err.message}\n`, stream: 'stderr' },
            });
            send({ type: 'bash:done', data: { exitCode: 1 } });
          });

          break;
        }

        default:
          send({ type: 'error', data: { message: `Unknown bash action: ${type}` } });
      }
    },
  };
}
