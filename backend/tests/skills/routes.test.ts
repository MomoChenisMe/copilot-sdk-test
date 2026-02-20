import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Server } from 'node:http';
import AdmZip from 'adm-zip';
import { SkillFileStore } from '../../src/skills/file-store.js';
import { BuiltinSkillStore } from '../../src/skills/builtin-store.js';
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

// --- With builtinStore ---
describe('skills routes with builtinStore', () => {
  let tmpDir: string;
  let builtinDir: string;
  let userStore: SkillFileStore;
  let builtinStore: BuiltinSkillStore;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-routes-builtin-'));
    const userDir = path.join(tmpDir, 'user');
    builtinDir = path.join(tmpDir, 'builtin');
    fs.mkdirSync(userDir, { recursive: true });
    fs.mkdirSync(builtinDir, { recursive: true });

    // Create a builtin skill
    const builtinSkillDir = path.join(builtinDir, 'sys-skill');
    fs.mkdirSync(builtinSkillDir);
    fs.writeFileSync(
      path.join(builtinSkillDir, 'SKILL.md'),
      '---\nname: sys-skill\ndescription: "A system skill"\n---\n\n# System Skill',
    );

    userStore = new SkillFileStore(userDir);
    userStore.ensureDirectory();
    builtinStore = new BuiltinSkillStore(builtinDir);

    app = express();
    app.use(express.json());
    app.use('/api/skills', createSkillsRoutes(userStore, builtinStore));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GET /api/skills (merged)', () => {
    it('should return builtin and user skills merged with builtin flag', async () => {
      userStore.writeSkill('user-skill', 'User desc', '# User Skill');

      const res = await fetch(`${baseUrl}/api/skills`);
      expect(res.status).toBe(200);
      const body = await res.json();

      // Builtin should be first
      const builtinSkills = body.skills.filter((s: any) => s.builtin === true);
      const userSkills = body.skills.filter((s: any) => !s.builtin);

      expect(builtinSkills).toHaveLength(1);
      expect(builtinSkills[0].name).toBe('sys-skill');
      expect(userSkills).toHaveLength(1);
      expect(userSkills[0].name).toBe('user-skill');
    });

    it('should mark user skills with builtin: false', async () => {
      userStore.writeSkill('my-skill', 'Desc', '# Skill');

      const res = await fetch(`${baseUrl}/api/skills`);
      const body = await res.json();
      const userSkill = body.skills.find((s: any) => s.name === 'my-skill');
      expect(userSkill.builtin).toBe(false);
    });
  });

  describe('GET /api/skills/:name (priority)', () => {
    it('should return builtin skill with builtin: true', async () => {
      const res = await fetch(`${baseUrl}/api/skills/sys-skill`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('sys-skill');
      expect(body.builtin).toBe(true);
    });

    it('should return user skill with builtin: false', async () => {
      userStore.writeSkill('user-only', 'Desc', '# Content');

      const res = await fetch(`${baseUrl}/api/skills/user-only`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('user-only');
      expect(body.builtin).toBe(false);
    });
  });

  describe('PUT /api/skills/:name (builtin protection)', () => {
    it('should return 403 when trying to update a builtin skill', async () => {
      const res = await fetch(`${baseUrl}/api/skills/sys-skill`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'hacked' }),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Cannot modify built-in skills');
    });

    it('should allow creating user skills normally', async () => {
      const res = await fetch(`${baseUrl}/api/skills/new-user-skill`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'New', content: '# New' }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/skills/:name (builtin protection)', () => {
    it('should return 403 when trying to delete a builtin skill', async () => {
      const res = await fetch(`${baseUrl}/api/skills/sys-skill`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Cannot delete built-in skills');
    });

    it('should allow deleting user skills normally', async () => {
      userStore.writeSkill('to-delete', 'Del', '# Del');

      const res = await fetch(`${baseUrl}/api/skills/to-delete`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
    });
  });
});

// --- POST /api/skills/upload ---
describe('POST /api/skills/upload', () => {
  let tmpDir: string;
  let store: SkillFileStore;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-upload-'));
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

  it('should install skill from uploaded ZIP', async () => {
    const zip = new AdmZip();
    const content = '---\nname: uploaded-skill\ndescription: "Uploaded"\n---\n\n# Uploaded Skill';
    zip.addFile('SKILL.md', Buffer.from(content));
    const zipBuffer = zip.toBuffer();

    const formData = new FormData();
    formData.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'skill.zip');

    const res = await fetch(`${baseUrl}/api/skills/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.name).toBe('uploaded-skill');
    expect(body.description).toBe('Uploaded');

    // Verify skill was installed on disk
    expect(fs.existsSync(path.join(tmpDir, 'uploaded-skill', 'SKILL.md'))).toBe(true);
  });

  it('should return 400 when no file provided', async () => {
    const res = await fetch(`${baseUrl}/api/skills/upload`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('No file provided');
  });

  it('should return 400 when ZIP has no SKILL.md', async () => {
    const zip = new AdmZip();
    zip.addFile('README.md', Buffer.from('No skill'));
    const zipBuffer = zip.toBuffer();

    const formData = new FormData();
    formData.append('file', new Blob([zipBuffer], { type: 'application/zip' }), 'bad.zip');

    const res = await fetch(`${baseUrl}/api/skills/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('SKILL.md');
  });
});

// --- POST /api/skills/install-url ---
describe('POST /api/skills/install-url', () => {
  let tmpDir: string;
  let store: SkillFileStore;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-install-url-'));
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
    vi.restoreAllMocks();
  });

  it('should return 400 when URL is missing', async () => {
    const res = await fetch(`${baseUrl}/api/skills/install-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('URL is required');
  });

  it('should install skill from a text URL (SKILL.md)', async () => {
    // Spin up a small server to serve the SKILL.md content
    const contentApp = express();
    const skillContent = '---\nname: remote-skill\ndescription: "Remote"\n---\n\n# Remote Skill';
    contentApp.get('/skill.md', (_req, res) => {
      res.type('text/plain').send(skillContent);
    });
    const contentServer = contentApp.listen(0);
    const contentAddr = contentServer.address();
    const contentPort = typeof contentAddr === 'object' && contentAddr ? contentAddr.port : 0;

    try {
      const res = await fetch(`${baseUrl}/api/skills/install-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `http://localhost:${contentPort}/skill.md` }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.name).toBe('remote-skill');
      expect(body.description).toBe('Remote');
    } finally {
      contentServer.close();
    }
  });

  it('should install skill from a ZIP URL', async () => {
    const contentApp = express();
    const zip = new AdmZip();
    const skillContent = '---\nname: zip-remote\ndescription: "ZIP Remote"\n---\n\n# ZIP Remote Skill';
    zip.addFile('SKILL.md', Buffer.from(skillContent));
    const zipBuffer = zip.toBuffer();

    contentApp.get('/skill.zip', (_req, res) => {
      res.type('application/zip').send(zipBuffer);
    });
    const contentServer = contentApp.listen(0);
    const contentAddr = contentServer.address();
    const contentPort = typeof contentAddr === 'object' && contentAddr ? contentAddr.port : 0;

    try {
      const res = await fetch(`${baseUrl}/api/skills/install-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `http://localhost:${contentPort}/skill.zip` }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.name).toBe('zip-remote');
    } finally {
      contentServer.close();
    }
  });

  it('should handle GitHub tree URL conversion', async () => {
    // We test the conversion logic indirectly — the fetch will fail
    // but the URL conversion should have happened
    const res = await fetch(`${baseUrl}/api/skills/install-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://github.com/user/repo/tree/main/skills/my-skill' }),
    });
    // Should fail with a network error (host not reachable), not a 400 URL-is-required
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Failed to download');
  });
});
