import Database from 'better-sqlite3';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createLogger } from '../utils/logger.js';
import type { WsMessage } from '../ws/types.js';

const log = createLogger('todo-sync');

const TODOS_PATTERN = /\btodos\b/i;

export interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface TodoSyncOptions {
  getWorkspacePath: (sessionId: string) => string | undefined;
  /** Fallback workspace path resolver when primary returns undefined */
  fallbackWorkspacePath?: (sessionId: string) => string | undefined;
  getConversationId: (sessionId: string) => string | undefined;
  broadcast: (conversationId: string, msg: WsMessage) => void;
}

interface PostToolUseInput {
  toolName: string;
  toolArgs: unknown;
  toolResult: unknown;
  timestamp: number;
  cwd: string;
}

interface ToolInvocation {
  sessionId: string;
}

export function createTodoSyncHook(options: TodoSyncOptions) {
  return async (input: PostToolUseInput, invocation: ToolInvocation): Promise<void> => {
    if (input.toolName !== 'sql') return;

    const args = input.toolArgs as { query?: string } | undefined;
    if (!args?.query || !TODOS_PATTERN.test(args.query)) return;

    let workspacePath = options.getWorkspacePath(invocation.sessionId);
    if (!workspacePath && options.fallbackWorkspacePath) {
      workspacePath = options.fallbackWorkspacePath(invocation.sessionId);
      if (workspacePath) {
        log.debug({ sessionId: invocation.sessionId, workspacePath }, 'Using fallback workspacePath');
      }
    }
    if (!workspacePath) {
      log.debug({ sessionId: invocation.sessionId }, 'No workspacePath — skipping todo sync');
      return;
    }

    const dbPath = join(workspacePath, 'session.db');
    if (!existsSync(dbPath)) {
      log.debug({ dbPath }, 'session.db not found — skipping todo sync');
      return;
    }

    let todos: TodoItem[] = [];
    let db: Database.Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true });
      const tableCheck = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='todos'",
      ).get() as { name: string } | undefined;
      if (!tableCheck) {
        log.debug({ dbPath }, 'todos table not yet created — skipping');
        return;
      }
      todos = db.prepare('SELECT * FROM todos ORDER BY created_at').all() as TodoItem[];
    } catch (err) {
      log.error({ err, dbPath }, 'Failed to read todos from session.db');
      return;
    } finally {
      try { db?.close(); } catch { /* ignore close errors */ }
    }

    const conversationId = options.getConversationId(invocation.sessionId);
    if (!conversationId) return;

    options.broadcast(conversationId, {
      type: 'copilot:todos_updated',
      data: { conversationId, todos },
    });
  };
}
