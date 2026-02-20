import { Cron } from 'croner';
import type { CronStore, CronJob } from './cron-store.js';
import type { WsMessage } from '../ws/types.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cron-scheduler');

export interface AiExecutorResult {
  output?: string;
  executionData?: {
    turnSegments: unknown[];
    toolRecords: unknown[];
    contentSegments: string[];
    reasoningText: string;
    usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
    error?: string;
  };
}

export interface CronExecutors {
  executeAiTask: (config: Record<string, unknown>) => Promise<AiExecutorResult>;
  executeShellTask: (config: Record<string, unknown>) => Promise<{ output?: string }>;
}

export class CronScheduler {
  private jobs = new Map<string, Cron>();
  private intervals = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private store: CronStore,
    private executors: CronExecutors,
    private broadcastFn?: (msg: WsMessage) => void,
  ) {}

  loadAll(): void {
    const enabled = this.store.listEnabled();
    for (const job of enabled) {
      this.registerJob(job);
    }
    log.info({ count: enabled.length }, 'Loaded cron jobs');
  }

  registerJob(job: CronJob): void {
    // Clean up any existing registration
    this.unregisterJob(job.id);

    if (job.scheduleType === 'cron') {
      const cronJob = new Cron(job.scheduleValue, { protect: true }, () => {
        this.triggerJob(job.id).catch((err) => {
          log.error({ err, jobId: job.id }, 'Cron trigger failed');
        });
      });
      this.jobs.set(job.id, cronJob);
    } else if (job.scheduleType === 'interval') {
      const ms = parseInt(job.scheduleValue, 10);
      const interval = setInterval(() => {
        this.triggerJob(job.id).catch((err) => {
          log.error({ err, jobId: job.id }, 'Interval trigger failed');
        });
      }, ms);
      this.intervals.set(job.id, interval);
    } else if (job.scheduleType === 'once') {
      const targetTime = new Date(job.scheduleValue).getTime();
      const delay = Math.max(0, targetTime - Date.now());
      const timeout = setTimeout(() => {
        this.triggerJob(job.id).then(() => {
          // Disable one-shot job after execution
          this.store.update(job.id, { enabled: false });
          this.unregisterJob(job.id);
        }).catch((err) => {
          log.error({ err, jobId: job.id }, 'One-shot trigger failed');
        });
      }, delay);
      this.intervals.set(job.id, timeout);
    }
  }

  unregisterJob(jobId: string): void {
    const cronJob = this.jobs.get(jobId);
    if (cronJob) {
      cronJob.stop();
      this.jobs.delete(jobId);
    }
    const interval = this.intervals.get(jobId);
    if (interval) {
      clearTimeout(interval);
      clearInterval(interval);
      this.intervals.delete(jobId);
    }
  }

  getActiveJobIds(): string[] {
    const cronIds = Array.from(this.jobs.keys());
    const intervalIds = Array.from(this.intervals.keys());
    return [...new Set([...cronIds, ...intervalIds])];
  }

  async triggerJob(jobId: string): Promise<void> {
    const job = this.store.getById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const startedAt = new Date().toISOString();
    const prompt = (job.config as any)?.prompt as string | undefined;

    // Create a 'running' history record
    const history = this.store.addHistory({
      jobId: job.id,
      startedAt,
      status: 'running',
      prompt,
      configSnapshot: job.config,
    });

    let status: 'success' | 'error' | 'timeout' = 'success';
    let output: string | undefined;
    let executionData: AiExecutorResult['executionData'];

    try {
      const executor = job.type === 'ai' ? this.executors.executeAiTask : this.executors.executeShellTask;
      const result = await executor(job.config);
      output = result.output ?? 'completed';

      if ('executionData' in result) {
        executionData = (result as AiExecutorResult).executionData;
        if (executionData?.error) {
          status = executionData.error.includes('timeout') ? 'timeout' : 'error';
        }
      }
    } catch (err: any) {
      status = 'error';
      output = err.message ?? String(err);
    }

    const finishedAt = new Date().toISOString();

    // Update the history record with final results
    this.store.updateHistory(history.id, {
      status,
      finishedAt,
      output,
      ...(executionData && {
        turnSegments: executionData.turnSegments,
        toolRecords: executionData.toolRecords,
        reasoning: executionData.reasoningText,
        usage: executionData.usage,
        content: executionData.contentSegments?.join('\n'),
      }),
    });

    this.store.update(job.id, { lastRun: finishedAt });

    // Broadcast WebSocket notification
    if (this.broadcastFn) {
      const msgType = status === 'success' ? 'cron:job_completed' : 'cron:job_failed';
      this.broadcastFn({
        type: msgType,
        data: {
          historyId: history.id,
          jobId: job.id,
          jobName: job.name,
          status,
          startedAt,
          finishedAt,
          outputPreview: (output ?? '').slice(0, 200),
        },
      });
    }
  }

  async shutdown(): Promise<void> {
    for (const jobId of this.getActiveJobIds()) {
      this.unregisterJob(jobId);
    }
    log.info('Cron scheduler shut down');
  }
}
