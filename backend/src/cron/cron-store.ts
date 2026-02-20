import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

// --- Structured config interfaces ---

export interface CronToolConfig {
  skills?: boolean;
  selfControlTools?: boolean;
  memoryTools?: boolean;
  webSearchTool?: boolean;
  taskTools?: boolean;
  mcpTools?: boolean;
  disabledSkills?: string[];
  mcpServers?: Record<string, boolean>;
}

export interface CronJobConfig {
  prompt?: string;
  model?: string;
  cwd?: string;
  command?: string;
  timeout?: number;
  timeoutMs?: number;
  toolConfig?: CronToolConfig;
}

// --- Job interfaces ---

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

// --- History interfaces ---

export interface CronHistory {
  id: string;
  jobId: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'error' | 'timeout' | 'running';
  output: string | null;
  prompt: string | null;
  configSnapshot: Record<string, unknown> | null;
  turnSegments: unknown[] | null;
  toolRecords: unknown[] | null;
  reasoning: string | null;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number } | null;
  content: string | null;
  createdAt: string;
}

export interface AddHistoryInput {
  jobId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'error' | 'timeout' | 'running';
  output?: string;
  prompt?: string;
  configSnapshot?: Record<string, unknown>;
  turnSegments?: unknown[];
  toolRecords?: unknown[];
  reasoning?: string;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
  content?: string;
}

export interface UpdateHistoryInput {
  finishedAt?: string;
  status?: 'success' | 'error' | 'timeout';
  output?: string;
  turnSegments?: unknown[];
  toolRecords?: unknown[];
  reasoning?: string;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
  content?: string;
}

export interface CronHistoryWithJob extends CronHistory {
  jobName: string;
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
      `INSERT INTO cron_history (id, job_id, started_at, finished_at, status, output, prompt, config_snapshot, turn_segments, tool_records, reasoning, usage, content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.jobId,
      input.startedAt,
      input.finishedAt ?? null,
      input.status,
      input.output ?? null,
      input.prompt ?? null,
      input.configSnapshot ? JSON.stringify(input.configSnapshot) : null,
      input.turnSegments ? JSON.stringify(input.turnSegments) : null,
      input.toolRecords ? JSON.stringify(input.toolRecords) : null,
      input.reasoning ?? null,
      input.usage ? JSON.stringify(input.usage) : null,
      input.content ?? null,
    );
    return this.getHistoryById(id)!;
  }

  updateHistory(id: string, updates: UpdateHistoryInput): void {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (updates.finishedAt !== undefined) { setClauses.push('finished_at = ?'); params.push(updates.finishedAt); }
    if (updates.status !== undefined) { setClauses.push('status = ?'); params.push(updates.status); }
    if (updates.output !== undefined) { setClauses.push('output = ?'); params.push(updates.output); }
    if (updates.turnSegments !== undefined) { setClauses.push('turn_segments = ?'); params.push(JSON.stringify(updates.turnSegments)); }
    if (updates.toolRecords !== undefined) { setClauses.push('tool_records = ?'); params.push(JSON.stringify(updates.toolRecords)); }
    if (updates.reasoning !== undefined) { setClauses.push('reasoning = ?'); params.push(updates.reasoning); }
    if (updates.usage !== undefined) { setClauses.push('usage = ?'); params.push(JSON.stringify(updates.usage)); }
    if (updates.content !== undefined) { setClauses.push('content = ?'); params.push(updates.content); }

    if (setClauses.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE cron_history SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
  }

  getHistory(jobId: string, limit = 20): CronHistory[] {
    const rows = this.db.prepare(
      'SELECT * FROM cron_history WHERE job_id = ? ORDER BY started_at DESC, created_at DESC LIMIT ?',
    ).all(jobId, limit) as any[];
    return rows.map((r) => this.mapHistory(r));
  }

  getHistoryById(id: string): CronHistory | null {
    const row = this.db.prepare('SELECT * FROM cron_history WHERE id = ?').get(id) as any;
    return row ? this.mapHistory(row) : null;
  }

  getAllRecentHistory(limit = 50): CronHistoryWithJob[] {
    const rows = this.db.prepare(
      `SELECT h.*, j.name as job_name FROM cron_history h
       JOIN cron_jobs j ON j.id = h.job_id
       ORDER BY h.started_at DESC LIMIT ?`,
    ).all(limit) as any[];
    return rows.map((r) => ({ ...this.mapHistory(r), jobName: r.job_name }));
  }

  deleteHistory(id: string): boolean {
    const result = this.db.prepare('DELETE FROM cron_history WHERE id = ?').run(id);
    return result.changes > 0;
  }

  clearHistory(): number {
    const result = this.db.prepare('DELETE FROM cron_history').run();
    return result.changes;
  }

  pruneHistory(keepCount: number): number {
    // Keep the most recent `keepCount` entries, delete the rest
    const result = this.db.prepare(
      `DELETE FROM cron_history WHERE id NOT IN (
        SELECT id FROM cron_history ORDER BY started_at DESC LIMIT ?
      )`,
    ).run(keepCount);
    return result.changes;
  }

  getUnreadCount(since: string): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as cnt FROM cron_history WHERE created_at > ?',
    ).get(since) as any;
    return row.cnt;
  }

  getFailedCount(since: string): number {
    const row = this.db.prepare(
      "SELECT COUNT(*) as cnt FROM cron_history WHERE status = 'error' AND created_at > ?",
    ).get(since) as any;
    return row.cnt;
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
      prompt: row.prompt ?? null,
      configSnapshot: row.config_snapshot ? JSON.parse(row.config_snapshot) : null,
      turnSegments: row.turn_segments ? JSON.parse(row.turn_segments) : null,
      toolRecords: row.tool_records ? JSON.parse(row.tool_records) : null,
      reasoning: row.reasoning ?? null,
      usage: row.usage ? JSON.parse(row.usage) : null,
      content: row.content ?? null,
      createdAt: row.created_at,
    };
  }
}
