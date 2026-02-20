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

  // --- System Prompt ---

  describe('GET /api/prompts/system-prompt', () => {
    it('should return system prompt content', async () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), 'My system prompt');
      const res = await fetch(`${baseUrl}/api/prompts/system-prompt`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toBe('My system prompt');
    });

    it('should return default content when system prompt has not been customized', async () => {
      // ensureDirectories creates SYSTEM_PROMPT.md with default content
      const res = await fetch(`${baseUrl}/api/prompts/system-prompt`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toContain('Identity & Role');
    });
  });

  describe('PUT /api/prompts/system-prompt', () => {
    it('should update system prompt content', async () => {
      const res = await fetch(`${baseUrl}/api/prompts/system-prompt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated system prompt' }),
      });
      expect(res.status).toBe(200);
      expect(fs.readFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), 'utf-8')).toBe('Updated system prompt');
    });
  });

  describe('POST /api/prompts/system-prompt/reset', () => {
    it('should reset to default system prompt', async () => {
      // First write custom content
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), 'Custom content');

      const res = await fetch(`${baseUrl}/api/prompts/system-prompt/reset`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.content).toContain('Identity & Role');
      // Verify file was actually updated
      const fileContent = fs.readFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), 'utf-8');
      expect(fileContent).toContain('Identity & Role');
    });
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

});
