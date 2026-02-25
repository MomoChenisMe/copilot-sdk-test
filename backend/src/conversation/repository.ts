import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type {
  Conversation,
  Message,
  CreateConversationInput,
  SearchResult,
} from './types.js';

export class ConversationRepository {
  constructor(private db: Database.Database) {}

  create(input: CreateConversationInput): Conversation {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO conversations (id, model, cwd, created_at, updated_at)
         VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(id, input.model, input.cwd);

    return this.getById(id)!;
  }

  getById(id: string): Conversation | null {
    const row = this.db
      .prepare('SELECT * FROM conversations WHERE id = ?')
      .get(id) as RawConversation | undefined;

    return row ? mapConversation(row) : null;
  }

  list(): Conversation[] {
    const rows = this.db
      .prepare('SELECT * FROM conversations ORDER BY pinned DESC, updated_at DESC')
      .all() as RawConversation[];

    return rows.map(mapConversation);
  }

  update(
    id: string,
    updates: {
      title?: string;
      pinned?: boolean;
      sdkSessionId?: string;
      model?: string;
      cwd?: string;
      cronEnabled?: boolean;
      cronScheduleType?: string | null;
      cronScheduleValue?: string | null;
      cronPrompt?: string | null;
      cronModel?: string | null;
    },
  ): Conversation | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const setClauses: string[] = ["updated_at = datetime('now')"];
    const params: unknown[] = [];

    if (updates.title !== undefined) {
      setClauses.push('title = ?');
      params.push(updates.title);
    }
    if (updates.pinned !== undefined) {
      setClauses.push('pinned = ?');
      params.push(updates.pinned ? 1 : 0);
    }
    if (updates.sdkSessionId !== undefined) {
      setClauses.push('sdk_session_id = ?');
      params.push(updates.sdkSessionId);
    }
    if (updates.model !== undefined) {
      setClauses.push('model = ?');
      params.push(updates.model);
    }
    if (updates.cwd !== undefined) {
      setClauses.push('cwd = ?');
      params.push(updates.cwd);
    }
    if (updates.cronEnabled !== undefined) {
      setClauses.push('cron_enabled = ?');
      params.push(updates.cronEnabled ? 1 : 0);
    }
    if (updates.cronScheduleType !== undefined) {
      setClauses.push('cron_schedule_type = ?');
      params.push(updates.cronScheduleType);
    }
    if (updates.cronScheduleValue !== undefined) {
      setClauses.push('cron_schedule_value = ?');
      params.push(updates.cronScheduleValue);
    }
    if (updates.cronPrompt !== undefined) {
      setClauses.push('cron_prompt = ?');
      params.push(updates.cronPrompt);
    }
    if (updates.cronModel !== undefined) {
      setClauses.push('cron_model = ?');
      params.push(updates.cronModel);
    }

    params.push(id);

    this.db
      .prepare(`UPDATE conversations SET ${setClauses.join(', ')} WHERE id = ?`)
      .run(...params);

    return this.getById(id);
  }

  listCronEnabled(): Conversation[] {
    const rows = this.db
      .prepare('SELECT * FROM conversations WHERE cron_enabled = 1 ORDER BY updated_at DESC')
      .all() as RawConversation[];

    return rows.map(mapConversation);
  }

  delete(id: string): boolean {
    const result = this.db
      .prepare('DELETE FROM conversations WHERE id = ?')
      .run(id);

    return result.changes > 0;
  }

  addMessage(
    conversationId: string,
    input: { role: string; content: string; metadata?: unknown },
    clientId?: string,
  ): Message {
    const id = clientId || randomUUID();

    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      )
      .run(
        id,
        conversationId,
        input.role,
        input.content,
        input.metadata ? JSON.stringify(input.metadata) : null,
      );

    // Update conversation updated_at
    this.db
      .prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?")
      .run(conversationId);

    const row = this.db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as RawMessage;
    return mapMessage(row);
  }

  getMessages(conversationId: string): Message[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(conversationId) as RawMessage[];

    return rows.map(mapMessage);
  }

  /**
   * Update a tool record's result/status in the last assistant message for a conversation.
   * Used when a tool_end event arrives after the accumulation was already persisted
   * (e.g., after ask_user caused persistAccumulated to reset the accumulation).
   */
  updateToolResult(
    conversationId: string,
    toolCallId: string,
    update: { status: 'success' | 'error'; result?: unknown; error?: string },
  ): boolean {
    // Find the last assistant message for this conversation
    const row = this.db
      .prepare(
        `SELECT * FROM messages WHERE conversation_id = ? AND role = 'assistant'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(conversationId) as RawMessage | undefined;

    if (!row || !row.metadata) return false;

    let metadata: Record<string, unknown>;
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      return false;
    }

    let updated = false;

    // Update in toolRecords array
    const toolRecords = metadata.toolRecords as Array<Record<string, unknown>> | undefined;
    if (toolRecords) {
      const record = toolRecords.find((r) => r.toolCallId === toolCallId);
      if (record) {
        record.status = update.status;
        if (update.status === 'success' && update.result !== undefined) {
          record.result = update.result;
        } else if (update.status === 'error' && update.error !== undefined) {
          record.error = update.error;
        }
        updated = true;
      }
    }

    // Also update in turnSegments array
    const turnSegments = metadata.turnSegments as Array<Record<string, unknown>> | undefined;
    if (turnSegments) {
      const segment = turnSegments.find(
        (s) => s.type === 'tool' && s.toolCallId === toolCallId,
      );
      if (segment) {
        segment.status = update.status;
        if (update.status === 'success' && update.result !== undefined) {
          segment.result = update.result;
        } else if (update.status === 'error' && update.error !== undefined) {
          segment.error = update.error;
        }
        updated = true;
      }
    }

    if (updated) {
      this.db
        .prepare('UPDATE messages SET metadata = ? WHERE id = ?')
        .run(JSON.stringify(metadata), row.id);
    }

    return updated;
  }

  search(query: string): SearchResult[] {
    const rows = this.db
      .prepare(
        `SELECT m.conversation_id, c.title, snippet(messages_fts, 0, '<b>', '</b>', '...', 32) as snippet
         FROM messages_fts
         JOIN messages m ON m.rowid = messages_fts.rowid
         JOIN conversations c ON c.id = m.conversation_id
         WHERE messages_fts MATCH ?
         ORDER BY rank
         LIMIT 50`,
      )
      .all(`"${query.replace(/"/g, '""')}"`) as { conversation_id: string; title: string; snippet: string }[];

    return rows.map((row) => ({
      conversationId: row.conversation_id,
      conversationTitle: row.title,
      snippet: row.snippet,
    }));
  }
}

// --- Internal types for raw DB rows ---

interface RawConversation {
  id: string;
  title: string;
  sdk_session_id: string | null;
  model: string;
  cwd: string;
  pinned: number;
  plan_file_path: string | null;
  cron_enabled: number;
  cron_schedule_type: string | null;
  cron_schedule_value: string | null;
  cron_prompt: string | null;
  cron_model: string | null;
  created_at: string;
  updated_at: string;
}

interface RawMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  metadata: string | null;
  created_at: string;
}

function mapConversation(row: RawConversation): Conversation {
  return {
    id: row.id,
    title: row.title,
    sdkSessionId: row.sdk_session_id,
    model: row.model,
    cwd: row.cwd,
    pinned: row.pinned === 1,
    planFilePath: row.plan_file_path ?? null,
    cronEnabled: row.cron_enabled === 1,
    cronScheduleType: (row.cron_schedule_type as Conversation['cronScheduleType']) ?? null,
    cronScheduleValue: row.cron_schedule_value ?? null,
    cronPrompt: row.cron_prompt ?? null,
    cronModel: row.cron_model ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: RawMessage): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Message['role'],
    content: row.content,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: row.created_at,
  };
}
