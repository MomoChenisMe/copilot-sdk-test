import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Server } from 'node:http';
import { PromptFileStore } from '../../src/prompts/file-store.js';
import { createMemoryRoutes } from '../../src/prompts/memory-routes.js';

describe('memory routes', () => {
  let tmpDir: string;
  let store: PromptFileStore;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-routes-'));
    store = new PromptFileStore(tmpDir);
    store.ensureDirectories();

    app = express();
    app.use(express.json());
    app.use('/api/memory', createMemoryRoutes(store));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Preferences ---

  describe('GET /api/memory/preferences', () => {
    it('should return preferences content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'memory', 'preferences.md'), 'My preferences');
      const res = await fetch(`${baseUrl}/api/memory/preferences`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe('My preferences');
    });
  });

  describe('PUT /api/memory/preferences', () => {
    it('should update preferences content', async () => {
      const res = await fetch(`${baseUrl}/api/memory/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated prefs' }),
      });
      expect(res.status).toBe(200);
      expect(fs.readFileSync(path.join(tmpDir, 'memory', 'preferences.md'), 'utf-8')).toBe('Updated prefs');
    });
  });

  // --- Projects ---

  describe('GET /api/memory/projects', () => {
    it('should list all projects', async () => {
      fs.writeFileSync(path.join(tmpDir, 'memory', 'projects', 'my-app.md'), 'App notes');
      fs.writeFileSync(path.join(tmpDir, 'memory', 'projects', 'infra.md'), 'Infra notes');

      const res = await fetch(`${baseUrl}/api/memory/projects`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toHaveLength(2);
      const names = body.items.map((i: { name: string }) => i.name);
      expect(names).toContain('my-app');
      expect(names).toContain('infra');
    });
  });

  describe('GET /api/memory/projects/:name', () => {
    it('should return project content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'memory', 'projects', 'my-app.md'), 'App notes');
      const res = await fetch(`${baseUrl}/api/memory/projects/my-app`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('my-app');
      expect(body.content).toBe('App notes');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await fetch(`${baseUrl}/api/memory/projects/nonexistent`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Not found');
    });
  });

  describe('PUT /api/memory/projects/:name', () => {
    it('should create or update a project', async () => {
      const res = await fetch(`${baseUrl}/api/memory/projects/my-app`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'New app notes' }),
      });
      expect(res.status).toBe(200);
      expect(fs.readFileSync(path.join(tmpDir, 'memory', 'projects', 'my-app.md'), 'utf-8')).toBe('New app notes');
    });
  });

  describe('DELETE /api/memory/projects/:name', () => {
    it('should delete a project', async () => {
      fs.writeFileSync(path.join(tmpDir, 'memory', 'projects', 'to-delete.md'), 'content');
      const res = await fetch(`${baseUrl}/api/memory/projects/to-delete`, { method: 'DELETE' });
      expect(res.status).toBe(200);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'projects', 'to-delete.md'))).toBe(false);
    });
  });

  // --- Solutions ---

  describe('GET /api/memory/solutions', () => {
    it('should list all solutions', async () => {
      fs.writeFileSync(path.join(tmpDir, 'memory', 'solutions', 'fix-deploy.md'), 'Fix steps');
      const res = await fetch(`${baseUrl}/api/memory/solutions`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toHaveLength(1);
      expect(body.items[0].name).toBe('fix-deploy');
    });
  });

  describe('GET /api/memory/solutions/:name', () => {
    it('should return solution content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'memory', 'solutions', 'fix-deploy.md'), 'Fix steps');
      const res = await fetch(`${baseUrl}/api/memory/solutions/fix-deploy`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('fix-deploy');
      expect(body.content).toBe('Fix steps');
    });

    it('should return 404 for non-existent solution', async () => {
      const res = await fetch(`${baseUrl}/api/memory/solutions/nonexistent`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/memory/solutions/:name', () => {
    it('should create or update a solution', async () => {
      const res = await fetch(`${baseUrl}/api/memory/solutions/fix-deploy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'New fix steps' }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/memory/solutions/:name', () => {
    it('should delete a solution', async () => {
      fs.writeFileSync(path.join(tmpDir, 'memory', 'solutions', 'to-delete.md'), 'content');
      const res = await fetch(`${baseUrl}/api/memory/solutions/to-delete`, { method: 'DELETE' });
      expect(res.status).toBe(200);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'solutions', 'to-delete.md'))).toBe(false);
    });
  });

  // --- Name validation ---

  describe('name validation', () => {
    it('should return 400 for path traversal in project name', async () => {
      const res = await fetch(`${baseUrl}/api/memory/projects/%2E%2Eetc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hack' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid name');
    });

    it('should return 400 for empty solution name', async () => {
      const res = await fetch(`${baseUrl}/api/memory/solutions/%20`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hack' }),
      });
      expect(res.status).toBe(400);
    });
  });

  // --- Directory initialization ---

  describe('directory initialization', () => {
    it('should have memory directories created by ensureDirectories', () => {
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'preferences.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'projects'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'solutions'))).toBe(true);
    });
  });
});
