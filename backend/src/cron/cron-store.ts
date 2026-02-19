import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export interface CronJob {
  id: string;
  name: string;
  type: 'ai' | 'shell';
  scheduleType: 'cron' | 'interval' | 'once';
  scheduleValue: string;
  config: Record<string, unknown>;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCronJobInput {
  name: string;
  type: 'ai' | 'shell';
  scheduleType: 'cron' | 'interval' | 'once';
  scheduleValue: string;
  config?: Record<string, unknown>;
}

export interface UpdateCronJobInput {
  name?: string;
  type?: 'ai' | 'shell';
  scheduleType?: 'cron' | 'interval' | 'once';
  scheduleValue?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface CronHistory {
  id: string;
  jobId: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'error' | 'timeout';
  output: string | null;
  createdAt: string;
}

export interface AddHistoryInput {
  jobId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'error' | 'timeout';
  output?: string;
}

export class CronStore {
  constructor(private db: Database.Database) {}

  create(input: CreateCronJobInput): CronJob {
    const id = randomUUID();
    const config = input.config ? JSON.stringify(input.config) : '{}';
    this.db.prepare(
      `INSERT INTO cron_jobs (id, name, type, schedule_type, schedule_value, config)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.name, input.type, input.scheduleType, input.scheduleValue, config);
    return this.getById(id)!;
  }

  getById(id: string): CronJob | null {
    const row = this.db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as any;
    return row ? this.mapJob(row) : null;
  }

  listAll(): CronJob[] {
    const rows = this.db.prepare('SELECT * FROM cron_jobs ORDER BY created_at ASC').all() as any[];
    return rows.map((r) => this.mapJob(r));
  }

  listEnabled(): CronJob[] {
    const rows = this.db.prepare('SELECT * FROM cron_jobs WHERE enabled = 1 ORDER BY created_at ASC').all() as any[];
    return rows.map((r) => this.mapJob(r));
  }

  update(id: string, updates: UpdateCronJobInput): CronJob | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const setClauses: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (updates.name !== undefined) { setClauses.push('name = ?'); params.push(updates.name); }
    if (updates.type !== undefined) { setClauses.push('type = ?'); params.push(updates.type); }
    if (updates.scheduleType !== undefined) { setClauses.push('schedule_type = ?'); params.push(updates.scheduleType); }
    if (updates.scheduleValue !== undefined) { setClauses.push('schedule_value = ?'); params.push(updates.scheduleValue); }
    if (updates.config !== undefined) { setClauses.push('config = ?'); params.push(JSON.stringify(updates.config)); }
    if (updates.enabled !== undefined) { setClauses.push('enabled = ?'); params.push(updates.enabled ? 1 : 0); }
    if (updates.lastRun !== undefined) { setClauses.push('last_run = ?'); params.push(updates.lastRun); }
    if (updates.nextRun !== undefined) { setClauses.push('next_run = ?'); params.push(updates.nextRun); }

    params.push(id);
    this.db.prepare(`UPDATE cron_jobs SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id);
    return result.changes > 0;
  }

  addHistory(input: AddHistoryInput): CronHistory {
    const id = randomUUID();
    this.db.prepare(
      `INSERT INTO cron_history (id, job_id, started_at, finished_at, status, output)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.jobId, input.startedAt, input.finishedAt ?? null, input.status, input.output ?? null);
    return this.getHistoryById(id)!;
  }

  getHistory(jobId: string, limit = 20): CronHistory[] {
    const rows = this.db.prepare(
      'SELECT * FROM cron_history WHERE job_id = ? ORDER BY started_at DESC, created_at DESC LIMIT ?',
    ).all(jobId, limit) as any[];
    return rows.map((r) => this.mapHistory(r));
  }

  private getHistoryById(id: string): CronHistory | null {
    const row = this.db.prepare('SELECT * FROM cron_history WHERE id = ?').get(id) as any;
    return row ? this.mapHistory(row) : null;
  }

  private mapJob(row: any): CronJob {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      scheduleType: row.schedule_type,
      scheduleValue: row.schedule_value,
      config: JSON.parse(row.config),
      enabled: row.enabled === 1,
      lastRun: row.last_run,
      nextRun: row.next_run,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapHistory(row: any): CronHistory {
    return {
      id: row.id,
      jobId: row.job_id,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      output: row.output,
      createdAt: row.created_at,
    };
  }
}
