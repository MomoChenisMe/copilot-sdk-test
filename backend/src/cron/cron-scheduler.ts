import { Cron } from 'croner';
import type { CronStore, CronJob } from './cron-store.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('cron-scheduler');

export interface CronExecutors {
  executeAiTask: (config: Record<string, unknown>) => Promise<{ output?: string }>;
  executeShellTask: (config: Record<string, unknown>) => Promise<{ output?: string }>;
}

export class CronScheduler {
  private jobs = new Map<string, Cron>();
  private intervals = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private store: CronStore,
    private executors: CronExecutors,
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
    let status: 'success' | 'error' | 'timeout' = 'success';
    let output: string | undefined;

    try {
      const executor = job.type === 'ai' ? this.executors.executeAiTask : this.executors.executeShellTask;
      const result = await executor(job.config);
      output = result.output ?? 'completed';
    } catch (err: any) {
      status = 'error';
      output = err.message ?? String(err);
    }

    const finishedAt = new Date().toISOString();

    this.store.addHistory({
      jobId: job.id,
      startedAt,
      finishedAt,
      status,
      output,
    });

    this.store.update(job.id, { lastRun: finishedAt });
  }

  async shutdown(): Promise<void> {
    for (const jobId of this.getActiveJobIds()) {
      this.unregisterJob(jobId);
    }
    log.info('Cron scheduler shut down');
  }
}
