import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { createCommandsRoute } from '../../src/copilot/commands-route.js';

describe('GET /api/copilot/commands', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    app = express();
    app.use('/api/copilot', createCommandsRoute());
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(() => {
    server?.close();
  });

  it('should return an array of commands', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/commands`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('should return commands with name and description fields', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/commands`);
    const body = await res.json();
    for (const cmd of body) {
      expect(cmd.name).toBeDefined();
      expect(typeof cmd.name).toBe('string');
      expect(cmd.description).toBeDefined();
      expect(typeof cmd.description).toBe('string');
    }
  });

  it('should include common Copilot CLI commands', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/commands`);
    const body = await res.json();
    const names = body.map((c: any) => c.name);
    expect(names).toContain('explain');
    expect(names).toContain('fix');
    expect(names).toContain('test');
  });
});
