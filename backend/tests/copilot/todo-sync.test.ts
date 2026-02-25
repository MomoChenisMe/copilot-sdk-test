import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { createTodoSyncHook } from '../../src/copilot/todo-sync.js';
import type { TodoItem, TodoSyncOptions } from '../../src/copilot/todo-sync.js';
import type { WsMessage } from '../../src/ws/types.js';

function createTestDb(dir: string): Database.Database {
  const dbPath = join(dir, 'session.db');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'done', 'blocked')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

describe('createTodoSyncHook', () => {
  let tempDir: string;
  let broadcast: ReturnType<typeof vi.fn>;
  let getWorkspacePath: ReturnType<typeof vi.fn>;
  let getConversationId: ReturnType<typeof vi.fn>;
  let options: TodoSyncOptions;
  let hook: ReturnType<typeof createTodoSyncHook>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'todo-sync-test-'));
    broadcast = vi.fn();
    getWorkspacePath = vi.fn().mockReturnValue(tempDir);
    getConversationId = vi.fn().mockReturnValue('conv-1');
    options = { getWorkspacePath, getConversationId, broadcast };
    hook = createTodoSyncHook(options);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should trigger broadcast when sql tool query contains todos', async () => {
    const db = createTestDb(tempDir);
    db.prepare("INSERT INTO todos (id, title, status) VALUES ('t1', 'Do something', 'pending')").run();
    db.close();

    await hook(
      { toolName: 'sql', toolArgs: { query: 'SELECT * FROM todos' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).toHaveBeenCalledTimes(1);
    const call = broadcast.mock.calls[0] as [string, WsMessage];
    expect(call[0]).toBe('conv-1');
    expect(call[1].type).toBe('copilot:todos_updated');
    const data = call[1].data as { conversationId: string; todos: TodoItem[] };
    expect(data.conversationId).toBe('conv-1');
    expect(data.todos).toHaveLength(1);
    expect(data.todos[0].id).toBe('t1');
    expect(data.todos[0].title).toBe('Do something');
    expect(data.todos[0].status).toBe('pending');
  });

  it('should NOT trigger when toolName is not sql', async () => {
    createTestDb(tempDir).close();

    await hook(
      { toolName: 'Read', toolArgs: { path: '/tmp/file.txt' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should NOT trigger when query does not contain todos', async () => {
    createTestDb(tempDir).close();

    await hook(
      { toolName: 'sql', toolArgs: { query: 'CREATE TABLE test_cases (id TEXT PRIMARY KEY)' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should skip when workspacePath is undefined and no fallback found', async () => {
    getWorkspacePath.mockReturnValue(undefined);

    await hook(
      { toolName: 'sql', toolArgs: { query: 'INSERT INTO todos ...' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should use fallbackWorkspacePath when primary returns undefined', async () => {
    // Setup: primary returns undefined, but fallback points to our tempDir
    getWorkspacePath.mockReturnValue(undefined);
    const db = createTestDb(tempDir);
    db.prepare("INSERT INTO todos (id, title, status) VALUES ('fb1', 'Fallback todo', 'pending')").run();
    db.close();

    const hookWithFallback = createTodoSyncHook({
      ...options,
      getWorkspacePath: () => undefined,
      fallbackWorkspacePath: () => tempDir,
    });

    await hookWithFallback(
      { toolName: 'sql', toolArgs: { query: 'SELECT * FROM todos' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).toHaveBeenCalledTimes(1);
    const data = (broadcast.mock.calls[0] as [string, WsMessage])[1].data as { todos: TodoItem[] };
    expect(data.todos).toHaveLength(1);
    expect(data.todos[0].id).toBe('fb1');
  });

  it('should skip when session.db does not exist', async () => {
    // tempDir exists but no session.db created
    await hook(
      { toolName: 'sql', toolArgs: { query: 'INSERT INTO todos ...' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should skip when todos table does not exist', async () => {
    // Create session.db without todos table
    const dbPath = join(tempDir, 'session.db');
    const db = new Database(dbPath);
    db.exec('CREATE TABLE other_table (id TEXT PRIMARY KEY)');
    db.close();

    await hook(
      { toolName: 'sql', toolArgs: { query: 'SELECT * FROM todos' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should skip when conversationId is undefined', async () => {
    createTestDb(tempDir).close();
    getConversationId.mockReturnValue(undefined);

    await hook(
      { toolName: 'sql', toolArgs: { query: 'SELECT * FROM todos' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should handle DB open errors gracefully', async () => {
    // Create a file that is not a valid SQLite database
    writeFileSync(join(tempDir, 'session.db'), 'not a database');

    await hook(
      { toolName: 'sql', toolArgs: { query: 'SELECT * FROM todos' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('should return full todos array ordered by created_at', async () => {
    const db = createTestDb(tempDir);
    db.prepare("INSERT INTO todos (id, title, status, created_at) VALUES ('t1', 'First', 'done', '2026-01-01 00:00:00')").run();
    db.prepare("INSERT INTO todos (id, title, status, created_at) VALUES ('t2', 'Second', 'in_progress', '2026-01-02 00:00:00')").run();
    db.prepare("INSERT INTO todos (id, title, status, created_at) VALUES ('t3', 'Third', 'blocked', '2026-01-03 00:00:00')").run();
    db.close();

    await hook(
      { toolName: 'sql', toolArgs: { query: "UPDATE todos SET status = 'done' WHERE id = 't2'" }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).toHaveBeenCalledTimes(1);
    const data = (broadcast.mock.calls[0] as [string, WsMessage])[1].data as { todos: TodoItem[] };
    expect(data.todos).toHaveLength(3);
    expect(data.todos[0].id).toBe('t1');
    expect(data.todos[1].id).toBe('t2');
    expect(data.todos[2].id).toBe('t3');
    expect(data.todos[2].status).toBe('blocked');
  });

  it('should broadcast empty array when todos table exists but is empty', async () => {
    createTestDb(tempDir).close();

    await hook(
      { toolName: 'sql', toolArgs: { query: 'SELECT * FROM todos' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).toHaveBeenCalledTimes(1);
    const data = (broadcast.mock.calls[0] as [string, WsMessage])[1].data as { todos: TodoItem[] };
    expect(data.todos).toEqual([]);
  });

  it('should match case-insensitive todos keyword', async () => {
    createTestDb(tempDir).close();

    await hook(
      { toolName: 'sql', toolArgs: { query: 'INSERT INTO TODOS (id, title) VALUES (...)' }, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).toHaveBeenCalledTimes(1);
  });

  it('should skip when toolArgs has no query', async () => {
    createTestDb(tempDir).close();

    await hook(
      { toolName: 'sql', toolArgs: {}, toolResult: { textResultForLlm: '', resultType: 'success' as const }, timestamp: Date.now(), cwd: '/tmp' },
      { sessionId: 'sess-1' },
    );

    expect(broadcast).not.toHaveBeenCalled();
  });
});
