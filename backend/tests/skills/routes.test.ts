import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Server } from 'node:http';
import { SkillFileStore } from '../../src/skills/file-store.js';
import { createSkillsRoutes } from '../../src/skills/routes.js';

describe('skills routes', () => {
  let tmpDir: string;
  let store: SkillFileStore;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-routes-'));
    store = new SkillFileStore(tmpDir);
    store.ensureDirectory();

    app = express();
    app.use(express.json());
    app.use('/api/skills', createSkillsRoutes(store));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- GET /api/skills ---
  describe('GET /api/skills', () => {
    it('should return empty array when no skills exist', async () => {
      const res = await fetch(`${baseUrl}/api/skills`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.skills).toEqual([]);
    });

    it('should list all skills', async () => {
      store.writeSkill('my-skill', 'My skill desc', '# My Skill');
      store.writeSkill('other-skill', 'Other desc', '# Other');

      const res = await fetch(`${baseUrl}/api/skills`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.skills).toHaveLength(2);
      const names = body.skills.map((s: { name: string }) => s.name);
      expect(names).toContain('my-skill');
      expect(names).toContain('other-skill');
    });
  });

  // --- GET /api/skills/:name ---
  describe('GET /api/skills/:name', () => {
    it('should return skill with parsed frontmatter', async () => {
      store.writeSkill('test-skill', 'A test skill', '# Test Content');

      const res = await fetch(`${baseUrl}/api/skills/test-skill`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('test-skill');
      expect(body.description).toBe('A test skill');
      expect(body.content).toBe('# Test Content');
    });

    it('should return 404 for non-existent skill', async () => {
      const res = await fetch(`${baseUrl}/api/skills/nonexistent`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('Skill not found');
    });
  });

  // --- PUT /api/skills/:name ---
  describe('PUT /api/skills/:name', () => {
    it('should create a new skill with description and content', async () => {
      const res = await fetch(`${baseUrl}/api/skills/new-skill`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'A new skill', content: '# New Skill Content' }),
      });
      expect(res.status).toBe(200);

      const skill = store.readSkill('new-skill');
      expect(skill).not.toBeNull();
      expect(skill!.description).toBe('A new skill');
      expect(skill!.content).toBe('# New Skill Content');
    });

    it('should update an existing skill', async () => {
      store.writeSkill('existing', 'Original desc', '# Original');

      const res = await fetch(`${baseUrl}/api/skills/existing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Updated desc', content: '# Updated' }),
      });
      expect(res.status).toBe(200);

      const skill = store.readSkill('existing');
      expect(skill!.description).toBe('Updated desc');
      expect(skill!.content).toBe('# Updated');
    });
  });

  // --- DELETE /api/skills/:name ---
  describe('DELETE /api/skills/:name', () => {
    it('should delete a skill', async () => {
      store.writeSkill('to-delete', 'Delete me', '# Delete me');

      const res = await fetch(`${baseUrl}/api/skills/to-delete`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      expect(store.readSkill('to-delete')).toBeNull();
    });

    it('should return 200 even when deleting non-existent skill', async () => {
      const res = await fetch(`${baseUrl}/api/skills/nonexistent`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
    });
  });

  // --- Name validation ---
  describe('name validation', () => {
    it('should return 400 for path traversal in skill name', async () => {
      const res = await fetch(`${baseUrl}/api/skills/%2E%2Eetc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hack' }),
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 for empty skill name', async () => {
      const res = await fetch(`${baseUrl}/api/skills/%20`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hack' }),
      });
      expect(res.status).toBe(400);
    });
  });
});
