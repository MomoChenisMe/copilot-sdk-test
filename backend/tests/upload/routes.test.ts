import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Server } from 'node:http';

// We'll import once the module exists
// import { createUploadRoutes } from '../../src/upload/routes.js';

describe('upload routes', () => {
  let tmpDir: string;
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-routes-'));

    app = express();
    app.use(express.json());

    // Dynamic import to allow test to fail gracefully during red phase
    const { createUploadRoutes } = await import('../../src/upload/routes.js');
    app.use('/api/upload', createUploadRoutes(tmpDir));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('POST /api/upload', () => {
    it('should upload a file successfully and return file reference', async () => {
      const content = 'Hello, World!';
      const blob = new Blob([content], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('files', blob, 'test.txt');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.files).toHaveLength(1);
      expect(body.files[0]).toMatchObject({
        originalName: 'test.txt',
        mimeType: 'text/plain',
      });
      expect(body.files[0].id).toBeDefined();
      expect(body.files[0].size).toBeGreaterThan(0);
      expect(body.files[0].path).toBeDefined();
    });

    it('should upload multiple files', async () => {
      const formData = new FormData();
      formData.append('files', new Blob(['file1'], { type: 'text/plain' }), 'a.txt');
      formData.append('files', new Blob(['file2'], { type: 'text/plain' }), 'b.txt');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.files).toHaveLength(2);
      expect(body.files[0].originalName).toBe('a.txt');
      expect(body.files[1].originalName).toBe('b.txt');
    });

    it('should return 400 when no files are provided', async () => {
      const formData = new FormData();

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('should reject files exceeding size limit (10MB)', async () => {
      // Create a buffer just over 10MB
      const bigContent = Buffer.alloc(11 * 1024 * 1024, 'x');
      const blob = new Blob([bigContent], { type: 'application/octet-stream' });
      const formData = new FormData();
      formData.append('files', blob, 'big.bin');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      // Multer returns 413 or 400 for file too large
      expect([400, 413, 500]).toContain(res.status);
    });

    it('should store uploaded files on disk', async () => {
      const content = 'stored content';
      const blob = new Blob([content], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('files', blob, 'stored.txt');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      const filePath = body.files[0].path;
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should accept image files', async () => {
      // Create a minimal PNG-like blob
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const blob = new Blob([pngHeader], { type: 'image/png' });
      const formData = new FormData();
      formData.append('files', blob, 'image.png');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.files[0].mimeType).toBe('image/png');
    });
  });
});
