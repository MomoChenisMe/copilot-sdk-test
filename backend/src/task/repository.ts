import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export interface Task {
  id: string;
  conversationId: string;
  subject: string;
  description: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed' | 'deleted';
  owner: string | null;
  blocks: string[];
  blockedBy: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  conversationId: string;
  subject: string;
  description?: string;
  activeForm?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskInput {
  status?: Task['status'];
  subject?: string;
  description?: string;
  activeForm?: string;
  owner?: string;
  metadata?: Record<string, unknown>;
  addBlocks?: string[];
  addBlockedBy?: string[];
}

export class TaskRepository {
  constructor(private db: Database.Database) {}

  create(input: CreateTaskInput): Task {
    const id = randomUUID();
    const metadata = input.metadata ? JSON.stringify(input.metadata) : '{}';
    this.db.prepare(
      `INSERT INTO tasks (id, conversation_id, subject, description, active_form, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.conversationId, input.subject, input.description ?? '', input.activeForm ?? '', metadata);
    return this.getById(id)!;
  }

  getById(id: string): Task | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  listByConversation(conversationId: string): Task[] {
    const rows = this.db.prepare(
      "SELECT * FROM tasks WHERE conversation_id = ? AND status != 'deleted' ORDER BY created_at ASC",
    ).all(conversationId) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  update(id: string, updates: UpdateTaskInput): Task | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const setClauses: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (updates.status !== undefined) { setClauses.push('status = ?'); params.push(updates.status); }
    if (updates.subject !== undefined) { setClauses.push('subject = ?'); params.push(updates.subject); }
    if (updates.description !== undefined) { setClauses.push('description = ?'); params.push(updates.description); }
    if (updates.activeForm !== undefined) { setClauses.push('active_form = ?'); params.push(updates.activeForm); }
    if (updates.owner !== undefined) { setClauses.push('owner = ?'); params.push(updates.owner); }

    if (updates.metadata !== undefined) {
      const merged = { ...existing.metadata };
      for (const [k, v] of Object.entries(updates.metadata)) {
        if (v === null) delete merged[k];
        else merged[k] = v;
      }
      setClauses.push('metadata = ?');
      params.push(JSON.stringify(merged));
    }

    if (updates.addBlocks?.length) {
      const newBlocks = [...new Set([...existing.blocks, ...updates.addBlocks])];
      setClauses.push('blocks = ?');
      params.push(JSON.stringify(newBlocks));
    }

    if (updates.addBlockedBy?.length) {
      const newBlockedBy = [...new Set([...existing.blockedBy, ...updates.addBlockedBy])];
      setClauses.push('blocked_by = ?');
      params.push(JSON.stringify(newBlockedBy));
    }

    params.push(id);
    this.db.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  }

  private mapRow(row: any): Task {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      subject: row.subject,
      description: row.description,
      activeForm: row.active_form,
      status: row.status,
      owner: row.owner,
      blocks: JSON.parse(row.blocks),
      blockedBy: JSON.parse(row.blocked_by),
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
