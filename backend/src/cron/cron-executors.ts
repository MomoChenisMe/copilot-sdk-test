import { exec } from 'node:child_process';
import type { BackgroundSessionRunner, BackgroundExecutionResult } from './background-session-runner.js';
import { assembleCronTools } from './cron-tool-assembler.js';
import type { CronToolAssemblerDeps } from './cron-tool-assembler.js';
import type { CronJobConfig, CronToolConfig } from './cron-store.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cron-executors');

const MAX_OUTPUT_LENGTH = 10000;

export interface AiExecutorResult {
  output?: string;
  executionData?: BackgroundExecutionResult;
}

export function createAiTaskExecutor(
  runner: BackgroundSessionRunner,
  toolDeps: CronToolAssemblerDeps,
) {
  return async (config: Record<string, unknown>): Promise<AiExecutorResult> => {
    const jobConfig = config as unknown as CronJobConfig;
    const prompt = jobConfig.prompt as string;
    const model = jobConfig.model || 'gpt-4o';
    const cwd = jobConfig.cwd || process.cwd();
    const toolConfig: CronToolConfig = jobConfig.toolConfig ?? {};

    // Assemble tools based on per-job config
    const assembled = await assembleCronTools(toolConfig, toolDeps);

    const executionData = await runner.run({
      prompt,
      model,
      workingDirectory: cwd,
      tools: assembled.tools.length > 0 ? assembled.tools : undefined,
      skillDirectories: assembled.skillDirectories,
      disabledSkills: assembled.disabledSkills,
      timeoutMs: jobConfig.timeoutMs,
    });

    // Build a human-readable output summary
    const contentPreview = executionData.contentSegments.join('\n').slice(0, MAX_OUTPUT_LENGTH);
    const output = executionData.error
      ? `Error: ${executionData.error}\n\n${contentPreview}`
      : contentPreview || 'completed';

    return { output, executionData };
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
