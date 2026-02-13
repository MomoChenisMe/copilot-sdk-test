import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import Database from 'better-sqlite3';
import { initDb } from '../../src/conversation/db.js';
import { ConversationRepository } from '../../src/conversation/repository.js';
import { createConversationRoutes } from '../../src/conversation/routes.js';
import type { Server } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('conversation routes', () => {
  let db: Database.Database;
  let repo: ConversationRepository;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `test-routes-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    db = initDb(dbPath);
    repo = new ConversationRepository(db);

    app = express();
    app.use(express.json());
    app.use('/api/conversations', createConversationRoutes(repo));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
    db.close();
    try { fs.unlinkSync(dbPath); } catch { /* ignore */ }
  });

  describe('POST /api/conversations', () => {
    it('should create a new conversation', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-5', cwd: '/home/user' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.model).toBe('gpt-5');
      expect(body.cwd).toBe('/home/user');
      expect(body.title).toBe('New Conversation');
    });

    it('should return 400 when model is missing', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cwd: '/tmp' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });

    it('should return 400 when cwd is missing', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-5' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });
  });

  describe('GET /api/conversations', () => {
    it('should return all conversations', async () => {
      repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.create({ model: 'gpt-5', cwd: '/home' });

      const res = await fetch(`${baseUrl}/api/conversations`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });

    it('should return empty array when no conversations', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('should return conversation by id', async () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });

      const res = await fetch(`${baseUrl}/api/conversations/${conv.id}`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(conv.id);
      expect(body.model).toBe('gpt-5');
    });

    it('should return 404 for nonexistent id', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/nonexistent`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Conversation not found');
    });
  });

  describe('PATCH /api/conversations/:id', () => {
    it('should update title', async () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });

      const res = await fetch(`${baseUrl}/api/conversations/${conv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Chat' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.title).toBe('My Chat');
    });

    it('should update pinned status', async () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });

      const res = await fetch(`${baseUrl}/api/conversations/${conv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: true }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pinned).toBe(true);
    });

    it('should return 404 for nonexistent id', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/nonexistent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    it('should delete conversation', async () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });

      const res = await fetch(`${baseUrl}/api/conversations/${conv.id}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: true });

      // Verify deleted
      const getRes = await fetch(`${baseUrl}/api/conversations/${conv.id}`);
      expect(getRes.status).toBe(404);
    });

    it('should return 404 for nonexistent id', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/nonexistent`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    it('should return messages for conversation', async () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.addMessage(conv.id, { role: 'user', content: 'hello' });
      repo.addMessage(conv.id, { role: 'assistant', content: 'hi' });

      const res = await fetch(`${baseUrl}/api/conversations/${conv.id}/messages`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
      expect(body[0].role).toBe('user');
      expect(body[1].role).toBe('assistant');
    });

    it('should return 404 for nonexistent conversation', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/nonexistent/messages`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/conversations/search', () => {
    it('should find conversations by message content', async () => {
      const conv = repo.create({ model: 'gpt-5', cwd: '/tmp' });
      repo.update(conv.id, { title: 'TypeScript Chat' });
      repo.addMessage(conv.id, { role: 'user', content: 'how to use TypeScript generics' });

      const res = await fetch(`${baseUrl}/api/conversations/search?q=TypeScript`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].conversationId).toBe(conv.id);
    });

    it('should return 400 when query is missing', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/search`);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });
  });
});
