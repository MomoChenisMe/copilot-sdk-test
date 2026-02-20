import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

// Use vi.hoisted to avoid hoisting issues
const { mockExecFile, mockExistsSync } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
  mockExistsSync: vi.fn().mockReturnValue(false),
}));

vi.mock('node:child_process', () => ({
  execFile: mockExecFile,
}));

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
}));

import { createGithubRoutes } from '../../src/github/routes.js';

describe('github routes', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    mockExecFile.mockReset();
    mockExistsSync.mockReset().mockReturnValue(false);

    app = express();
    app.use(express.json());
    app.use('/api/github', createGithubRoutes());

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
  });

  // --- Status ---

  describe('GET /api/github/status', () => {
    it('should return available: true when gh is authenticated', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: '', stderr: '' });
      });

      const res = await fetch(`${baseUrl}/api/github/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.available).toBe(true);
    });

    it('should return available: false when gh is not available', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(new Error('gh not found'));
      });

      const res = await fetch(`${baseUrl}/api/github/status`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.available).toBe(false);
    });
  });

  // --- Repos ---

  describe('GET /api/github/repos', () => {
    it('should return repo list from gh CLI', async () => {
      const repos = [
        { name: 'repo1', nameWithOwner: 'user/repo1', description: 'Desc', isPrivate: false, url: 'https://github.com/user/repo1' },
        { name: 'repo2', nameWithOwner: 'user/repo2', description: null, isPrivate: true, url: 'https://github.com/user/repo2' },
      ];
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: JSON.stringify(repos), stderr: '' });
      });

      const res = await fetch(`${baseUrl}/api/github/repos`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.repos).toHaveLength(2);
      expect(body.repos[0].nameWithOwner).toBe('user/repo1');
      expect(body.repos[1].isPrivate).toBe(true);
    });

    it('should return 500 when gh fails', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(new Error('gh error'));
      });

      const res = await fetch(`${baseUrl}/api/github/repos`);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Failed to list repositories');
    });
  });

  // --- Clone ---

  describe('POST /api/github/clone', () => {
    it('should clone repo and return path', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: '', stderr: '' });
      });

      const res = await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameWithOwner: 'user/repo1' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.path).toContain('user');
      expect(body.path).toContain('repo1');
      expect(body.alreadyExists).toBe(false);
    });

    it('should return alreadyExists when path exists', async () => {
      mockExistsSync.mockReturnValue(true);

      const res = await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameWithOwner: 'user/repo1' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.alreadyExists).toBe(true);
      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('should return 400 when nameWithOwner is missing', async () => {
      const res = await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid nameWithOwner format', async () => {
      const res = await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameWithOwner: '../etc/passwd' }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid nameWithOwner format');
    });

    it('should reject nameWithOwner with shell metacharacters', async () => {
      const res = await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameWithOwner: 'user/repo;rm -rf /' }),
      });
      expect(res.status).toBe(400);
    });

    it('should return 500 when clone fails', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(new Error('clone failed'));
      });

      const res = await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameWithOwner: 'user/repo1' }),
      });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Failed to clone repository');
    });

    it('should use execFile for command injection safety', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: '', stderr: '' });
      });

      await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameWithOwner: 'user/repo1' }),
      });

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['repo', 'clone', 'user/repo1']),
        expect.objectContaining({ timeout: 60000 }),
        expect.any(Function),
      );
    });

    it('should use custom targetPath when provided', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
        cb(null, { stdout: '', stderr: '' });
      });

      const res = await fetch(`${baseUrl}/api/github/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameWithOwner: 'user/repo1', targetPath: '/tmp/my-project' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.path).toBe('/tmp/my-project');
      expect(body.alreadyExists).toBe(false);

      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['repo', 'clone', 'user/repo1', '/tmp/my-project']),
        expect.objectContaining({ timeout: 60000 }),
        expect.any(Function),
      );
    });
  });
});
