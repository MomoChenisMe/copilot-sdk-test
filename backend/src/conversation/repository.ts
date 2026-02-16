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
    updates: { title?: string; pinned?: boolean; sdkSessionId?: string; model?: string; cwd?: string },
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

    params.push(id);

    this.db
      .prepare(`UPDATE conversations SET ${setClauses.join(', ')} WHERE id = ?`)
      .run(...params);

    return this.getById(id);
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
  ): Message {
    const id = randomUUID();

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
