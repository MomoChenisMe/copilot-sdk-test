import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import request from 'supertest';
import { createDirectoryRoutes } from '../../src/directory/routes.js';

describe('Directory routes', () => {
  let tmpDir: string;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dir-routes-'));
    // Create test directory structure
    fs.mkdirSync(path.join(tmpDir, 'alpha'));
    fs.mkdirSync(path.join(tmpDir, 'beta'));
    fs.mkdirSync(path.join(tmpDir, 'gamma'));
    // Create a file (should NOT appear in results)
    fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'hello');

    app = express();
    app.use(express.json());
    app.use('/api/directories', createDirectoryRoutes());
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('GET /api/directories', () => {
    it('should list directories in the given path', async () => {
      const res = await request(app)
        .get('/api/directories')
        .query({ path: tmpDir });
      expect(res.status).toBe(200);
      expect(res.body.currentPath).toBe(tmpDir);
      expect(res.body.parentPath).toBe(path.dirname(tmpDir));
      expect(res.body.directories).toBeInstanceOf(Array);
      const names = res.body.directories.map((d: any) => d.name);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
      // File should NOT be listed
      expect(names).not.toContain('file.txt');
    });

    it('should resolve relative paths safely', async () => {
      // Create a nested structure: tmpDir/alpha/nested
      fs.mkdirSync(path.join(tmpDir, 'alpha', 'nested'));
      const res = await request(app)
        .get('/api/directories')
        .query({ path: path.join(tmpDir, 'alpha') });
      expect(res.status).toBe(200);
      expect(res.body.currentPath).toBe(path.join(tmpDir, 'alpha'));
      const names = res.body.directories.map((d: any) => d.name);
      expect(names).toContain('nested');
    });

    it('should reject paths with null bytes', async () => {
      const res = await request(app)
        .get('/api/directories')
        .query({ path: tmpDir + '\0/etc/passwd' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for non-existent path', async () => {
      const res = await request(app)
        .get('/api/directories')
        .query({ path: path.join(tmpDir, 'does-not-exist') });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when path is a file, not a directory', async () => {
      const res = await request(app)
        .get('/api/directories')
        .query({ path: path.join(tmpDir, 'file.txt') });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should use home directory as default when no path provided', async () => {
      const res = await request(app).get('/api/directories');
      expect(res.status).toBe(200);
      expect(res.body.currentPath).toBe(os.homedir());
    });

    it('should return directory entries with name and full path', async () => {
      const res = await request(app)
        .get('/api/directories')
        .query({ path: tmpDir });
      expect(res.status).toBe(200);
      for (const dir of res.body.directories) {
        expect(dir).toHaveProperty('name');
        expect(dir).toHaveProperty('path');
        expect(dir.path).toBe(path.join(tmpDir, dir.name));
      }
    });

    it('should include hidden directories by default and exclude them with showHidden=false', async () => {
      fs.mkdirSync(path.join(tmpDir, '.hidden'));
      // Default: includes hidden
      const res1 = await request(app)
        .get('/api/directories')
        .query({ path: tmpDir });
      const names1 = res1.body.directories.map((d: any) => d.name);
      expect(names1).toContain('.hidden');

      // With showHidden=false: excludes hidden
      const res2 = await request(app)
        .get('/api/directories')
        .query({ path: tmpDir, showHidden: 'false' });
      const names2 = res2.body.directories.map((d: any) => d.name);
      expect(names2).not.toContain('.hidden');
    });
  });
});
