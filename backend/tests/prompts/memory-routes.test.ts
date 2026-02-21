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

  // --- Preferences (deprecated shim — returns empty, appends to PROFILE.md) ---

  describe('GET /api/memory/preferences', () => {
    it('should return empty content (deprecated shim)', async () => {
      const res = await fetch(`${baseUrl}/api/memory/preferences`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe('');
    });
  });

  describe('PUT /api/memory/preferences', () => {
    it('should append content to PROFILE.md (deprecated shim)', async () => {
      const res = await fetch(`${baseUrl}/api/memory/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated prefs' }),
      });
      expect(res.status).toBe(200);
      const profile = fs.readFileSync(path.join(tmpDir, 'PROFILE.md'), 'utf-8');
      expect(profile).toContain('Updated prefs');
    });
  });

  // --- Projects (removed — should return 404) ---

  describe('projects routes (removed)', () => {
    it('GET /api/memory/projects should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/projects`);
      expect(res.status).toBe(404);
    });

    it('GET /api/memory/projects/:name should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/projects/my-app`);
      expect(res.status).toBe(404);
    });

    it('PUT /api/memory/projects/:name should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/projects/my-app`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'New app notes' }),
      });
      expect(res.status).toBe(404);
    });

    it('DELETE /api/memory/projects/:name should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/projects/to-delete`, { method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });

  // --- Solutions (removed — should return 404) ---

  describe('solutions routes (removed)', () => {
    it('GET /api/memory/solutions should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/solutions`);
      expect(res.status).toBe(404);
    });

    it('GET /api/memory/solutions/:name should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/solutions/fix-deploy`);
      expect(res.status).toBe(404);
    });

    it('PUT /api/memory/solutions/:name should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/solutions/fix-deploy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'New fix steps' }),
      });
      expect(res.status).toBe(404);
    });

    it('DELETE /api/memory/solutions/:name should return 404', async () => {
      const res = await fetch(`${baseUrl}/api/memory/solutions/to-delete`, { method: 'DELETE' });
      expect(res.status).toBe(404);
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
