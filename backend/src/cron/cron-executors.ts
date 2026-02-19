import { exec } from 'node:child_process';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cron-executors');

const MAX_OUTPUT_LENGTH = 10000;

export function createAiTaskExecutor(
  repo: { create: (input: any) => { id: string } },
  streamManager: { startStream: (convId: string, message: any) => Promise<void>; waitForStreamEnd?: (convId: string) => Promise<void> },
) {
  return async (config: Record<string, unknown>): Promise<{ output?: string }> => {
    const prompt = config.prompt as string;
    const model = (config.model as string) || 'gpt-4o';
    const cwd = (config.cwd as string) || process.cwd();

    const conversation = repo.create({
      title: `Cron: ${prompt.slice(0, 50)}`,
      model,
      cwd,
    });

    await streamManager.startStream(conversation.id, { role: 'user', content: prompt });

    if (streamManager.waitForStreamEnd) {
      await streamManager.waitForStreamEnd(conversation.id);
    }

    return { output: `Conversation ${conversation.id} started` };
  };
}

export function createShellTaskExecutor() {
  return (config: Record<string, unknown>): Promise<{ output?: string }> => {
    const command = config.command as string;
    const cwd = (config.cwd as string) || process.cwd();
    const timeout = (config.timeout as number) || 60000;

    return new Promise((resolve, reject) => {
      exec(command, { cwd, timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          if ((error as any).killed) {
            reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
          } else {
            reject(error);
          }
          return;
        }

        let output = stdout || stderr || '';
        if (output.length > MAX_OUTPUT_LENGTH) {
          output = output.slice(0, MAX_OUTPUT_LENGTH) + '\n...[truncated]';
        }

        resolve({ output });
      });
    });
  };
}
