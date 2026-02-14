import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initDb } from '../../src/conversation/db.js';
import { ConversationRepository } from '../../src/conversation/repository.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('ConversationRepository', () => {
  let db: Database.Database;
  let repo: ConversationRepository;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `test-repo-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    db = initDb(dbPath);
    repo = new ConversationRepository(db);
  });

  afterEach(() => {
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  describe('create', () => {
    it('should create a new conversation', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/home/user' });

      expect(conv.id).toBeTruthy();
      expect(conv.title).toBe('New Conversation');
      expect(conv.model).toBe('gpt-5');
      expect(conv.cwd).toBe('/home/user');
      expect(conv.pinned).toBe(false);
      expect(conv.createdAt).toBeTruthy();
    });
  });

  describe('getById', () => {
    it('should return conversation by id', () => {
      const created = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      const found = repo.getById(created.id);

      expect(found).toBeTruthy();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for nonexistent id', () => {
      expect(repo.getById('nonexistent')).toBeNull();
    });
  });

  describe('list', () => {
    it('should return all conversations sorted by pinned then updatedAt', () => {
      const c1 = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      const c2 = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.update(c1.id, { pinned: true });

      const list = repo.list();

      expect(list).toHaveLength(2);
      // Pinned first
      expect(list[0].id).toBe(c1.id);
      expect(list[0].pinned).toBe(true);
    });

    it('should return empty array when no conversations', () => {
      expect(repo.list()).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update title', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      const updated = repo.update(conv.id, { title: 'My Chat' });

      expect(updated).toBeTruthy();
      expect(updated!.title).toBe('My Chat');
    });

    it('should update pinned status', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      const updated = repo.update(conv.id, { pinned: true });

      expect(updated).toBeTruthy();
      expect(updated!.pinned).toBe(true);
    });

    it('should update sdkSessionId', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      const updated = repo.update(conv.id, { sdkSessionId: 'sdk-123' });

      expect(updated).toBeTruthy();
      expect(updated!.sdkSessionId).toBe('sdk-123');
    });

    it('should update model', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      const updated = repo.update(conv.id, { model: 'claude-sonnet-4-5' });

      expect(updated).toBeTruthy();
      expect(updated!.model).toBe('claude-sonnet-4-5');
    });

    it('should return null for nonexistent id', () => {
      expect(repo.update('nonexistent', { title: 'x' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete conversation and its messages', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.addMessage(conv.id, { role: 'user', content: 'hello' });

      const result = repo.delete(conv.id);
      expect(result).toBe(true);
      expect(repo.getById(conv.id)).toBeNull();
    });

    it('should return false for nonexistent id', () => {
      expect(repo.delete('nonexistent')).toBe(false);
    });
  });

  describe('messages', () => {
    it('should add and retrieve messages', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.addMessage(conv.id, { role: 'user', content: 'hello' });
      repo.addMessage(conv.id, {
        role: 'assistant',
        content: 'hi there',
        metadata: { usage: { tokens: 10 } },
      });

      const messages = repo.getMessages(conv.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('hello');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].metadata).toEqual({ usage: { tokens: 10 } });
    });
  });

  describe('search', () => {
    it('should find messages by content', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.update(conv.id, { title: 'Test Chat' });
      repo.addMessage(conv.id, { role: 'user', content: 'how to use TypeScript generics' });

      const results = repo.search('TypeScript');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].conversationId).toBe(conv.id);
    });

    it('should return empty array when no match', () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.addMessage(conv.id, { role: 'user', content: 'hello world' });

      const results = repo.search('nonexistent-keyword-xyz');
      expect(results).toEqual([]);
    });
  });
});
