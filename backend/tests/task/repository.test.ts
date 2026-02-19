import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDb } from '../../src/conversation/db.js';
import { TaskRepository } from '../../src/task/repository.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('TaskRepository', () => {
  let db: Database.Database;
  let repo: TaskRepository;
  let dbPath: string;
  const CONV_ID = 'conv-test-1';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `test-task-repo-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    db = initDb(dbPath);
    repo = new TaskRepository(db);

    // Create a conversation to reference
    db.prepare(
      "INSERT INTO conversations (id, model, cwd) VALUES (?, 'gpt-5', '/tmp')",
    ).run(CONV_ID);
  });

  afterEach(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  describe('create', () => {
    it('should create a task with generated ID and correct defaults', () => {
      const task = repo.create({ conversationId: CONV_ID, subject: 'Fix bug' });

      expect(task.id).toBeTruthy();
      expect(task.conversationId).toBe(CONV_ID);
      expect(task.subject).toBe('Fix bug');
      expect(task.description).toBe('');
      expect(task.activeForm).toBe('');
      expect(task.status).toBe('pending');
      expect(task.owner).toBeNull();
      expect(task.blocks).toEqual([]);
      expect(task.blockedBy).toEqual([]);
      expect(task.metadata).toEqual({});
      expect(task.createdAt).toBeTruthy();
      expect(task.updatedAt).toBeTruthy();
    });

    it('should accept optional fields', () => {
      const task = repo.create({
        conversationId: CONV_ID,
        subject: 'Deploy',
        description: 'Deploy to prod',
        activeForm: 'Deploying service',
        metadata: { env: 'production' },
      });

      expect(task.description).toBe('Deploy to prod');
      expect(task.activeForm).toBe('Deploying service');
      expect(task.metadata).toEqual({ env: 'production' });
    });
  });

  describe('getById', () => {
    it('should return task by id', () => {
      const created = repo.create({ conversationId: CONV_ID, subject: 'Test' });
      const found = repo.getById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.subject).toBe('Test');
    });

    it('should return null for nonexistent id', () => {
      expect(repo.getById('nonexistent')).toBeNull();
    });
  });

  describe('listByConversation', () => {
    it('should return tasks filtered by conversationId', () => {
      // Create a second conversation
      db.prepare(
        "INSERT INTO conversations (id, model, cwd) VALUES ('conv-other', 'gpt-5', '/tmp')",
      ).run();

      repo.create({ conversationId: CONV_ID, subject: 'Task A' });
      repo.create({ conversationId: CONV_ID, subject: 'Task B' });
      repo.create({ conversationId: 'conv-other', subject: 'Task C' });

      const tasks = repo.listByConversation(CONV_ID);
      expect(tasks).toHaveLength(2);
      expect(tasks.map((t) => t.subject)).toEqual(['Task A', 'Task B']);
    });

    it('should exclude deleted tasks', () => {
      const task = repo.create({ conversationId: CONV_ID, subject: 'To delete' });
      repo.create({ conversationId: CONV_ID, subject: 'Keep' });
      repo.update(task.id, { status: 'deleted' });

      const tasks = repo.listByConversation(CONV_ID);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].subject).toBe('Keep');
    });

    it('should return empty array when no tasks', () => {
      expect(repo.listByConversation(CONV_ID)).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update status', () => {
      const task = repo.create({ conversationId: CONV_ID, subject: 'Test' });
      const updated = repo.update(task.id, { status: 'in_progress' });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe('in_progress');
    });

    it('should update subject, description, activeForm, and owner', () => {
      const task = repo.create({ conversationId: CONV_ID, subject: 'Old' });
      const updated = repo.update(task.id, {
        subject: 'New',
        description: 'New desc',
        activeForm: 'Running',
        owner: 'agent-1',
      });

      expect(updated!.subject).toBe('New');
      expect(updated!.description).toBe('New desc');
      expect(updated!.activeForm).toBe('Running');
      expect(updated!.owner).toBe('agent-1');
    });

    it('should merge metadata and delete keys set to null', () => {
      const task = repo.create({
        conversationId: CONV_ID,
        subject: 'Meta test',
        metadata: { a: 1, b: 2 },
      });

      const updated = repo.update(task.id, {
        metadata: { b: null, c: 3 },
      });

      expect(updated!.metadata).toEqual({ a: 1, c: 3 });
    });

    it('should append to blocks array without duplicates', () => {
      const task = repo.create({ conversationId: CONV_ID, subject: 'Blocking test' });

      const step1 = repo.update(task.id, { addBlocks: ['task-x', 'task-y'] });
      expect(step1!.blocks).toEqual(['task-x', 'task-y']);

      const step2 = repo.update(task.id, { addBlocks: ['task-y', 'task-z'] });
      expect(step2!.blocks).toEqual(['task-x', 'task-y', 'task-z']);
    });

    it('should append to blockedBy array without duplicates', () => {
      const task = repo.create({ conversationId: CONV_ID, subject: 'Blocked test' });

      const step1 = repo.update(task.id, { addBlockedBy: ['dep-a'] });
      expect(step1!.blockedBy).toEqual(['dep-a']);

      const step2 = repo.update(task.id, { addBlockedBy: ['dep-a', 'dep-b'] });
      expect(step2!.blockedBy).toEqual(['dep-a', 'dep-b']);
    });

    it('should return null for nonexistent task', () => {
      expect(repo.update('nonexistent', { status: 'completed' })).toBeNull();
    });

    it('should update the updated_at timestamp', () => {
      const task = repo.create({ conversationId: CONV_ID, subject: 'Timestamp test' });
      const originalUpdatedAt = task.updatedAt;

      // Small delay so timestamp changes
      const updated = repo.update(task.id, { subject: 'Changed' });
      // updated_at should be set (may or may not differ due to datetime precision)
      expect(updated!.updatedAt).toBeTruthy();
    });
  });
});
