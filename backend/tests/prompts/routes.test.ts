import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Server } from 'node:http';
import { PromptFileStore } from '../../src/prompts/file-store.js';
import { createPromptsRoutes } from '../../src/prompts/routes.js';

describe('prompts routes', () => {
  let tmpDir: string;
  let store: PromptFileStore;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompts-routes-'));
    store = new PromptFileStore(tmpDir);
    store.ensureDirectories();

    app = express();
    app.use(express.json());
    app.use('/api/prompts', createPromptsRoutes(store));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Profile ---

  describe('GET /api/prompts/profile', () => {
    it('should return profile content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'My profile');
      const res = await fetch(`${baseUrl}/api/prompts/profile`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe('My profile');
    });

    it('should return empty string when profile is empty', async () => {
      const res = await fetch(`${baseUrl}/api/prompts/profile`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe('');
    });
  });

  describe('PUT /api/prompts/profile', () => {
    it('should update profile content', async () => {
      const res = await fetch(`${baseUrl}/api/prompts/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated profile' }),
      });
      expect(res.status).toBe(200);
      expect(fs.readFileSync(path.join(tmpDir, 'PROFILE.md'), 'utf-8')).toBe('Updated profile');
    });
  });

  // --- Agent ---

  describe('GET /api/prompts/agent', () => {
    it('should return agent content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'AGENT.md'), 'Agent rules');
      const res = await fetch(`${baseUrl}/api/prompts/agent`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe('Agent rules');
    });
  });

  describe('PUT /api/prompts/agent', () => {
    it('should update agent content', async () => {
      const res = await fetch(`${baseUrl}/api/prompts/agent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'New agent rules' }),
      });
      expect(res.status).toBe(200);
      expect(fs.readFileSync(path.join(tmpDir, 'AGENT.md'), 'utf-8')).toBe('New agent rules');
    });
  });

  // --- Presets ---

  describe('GET /api/prompts/presets', () => {
    it('should list all presets', async () => {
      fs.writeFileSync(path.join(tmpDir, 'presets', 'code-review.md'), 'Review');
      fs.writeFileSync(path.join(tmpDir, 'presets', 'devops.md'), 'Ops');

      const res = await fetch(`${baseUrl}/api/prompts/presets`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.presets).toHaveLength(2);
      const names = body.presets.map((p: { name: string }) => p.name);
      expect(names).toContain('code-review');
      expect(names).toContain('devops');
    });
  });

  describe('GET /api/prompts/presets/:name', () => {
    it('should return preset content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'presets', 'code-review.md'), 'Review rules');
      const res = await fetch(`${baseUrl}/api/prompts/presets/code-review`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('code-review');
      expect(body.content).toBe('Review rules');
    });

    it('should return 404 for non-existent preset', async () => {
      const res = await fetch(`${baseUrl}/api/prompts/presets/nonexistent`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Preset not found');
    });
  });

  describe('PUT /api/prompts/presets/:name', () => {
    it('should create or update a preset', async () => {
      const res = await fetch(`${baseUrl}/api/prompts/presets/my-preset`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'My preset content' }),
      });
      expect(res.status).toBe(200);
      expect(fs.readFileSync(path.join(tmpDir, 'presets', 'my-preset.md'), 'utf-8')).toBe('My preset content');
    });
  });

  describe('DELETE /api/prompts/presets/:name', () => {
    it('should delete a preset', async () => {
      fs.writeFileSync(path.join(tmpDir, 'presets', 'to-delete.md'), 'content');
      const res = await fetch(`${baseUrl}/api/prompts/presets/to-delete`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      expect(fs.existsSync(path.join(tmpDir, 'presets', 'to-delete.md'))).toBe(false);
    });
  });

  // --- Validation ---

  describe('name validation', () => {
    it('should return 400 for path traversal in preset name', async () => {
      // Use %2E%2E to encode '..' so Express doesn't normalize the path
      const res = await fetch(`${baseUrl}/api/prompts/presets/%2E%2Eetc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hack' }),
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty preset name', async () => {
      const res = await fetch(`${baseUrl}/api/prompts/presets/%20`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hack' }),
      });
      expect(res.status).toBe(400);
    });
  });
});
