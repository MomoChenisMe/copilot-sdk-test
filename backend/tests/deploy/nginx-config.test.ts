import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(import.meta.dirname, '../../../nginx/ai-terminal.conf');

describe('Nginx config', () => {
  let config: string;

  it('config file exists', () => {
    expect(fs.existsSync(configPath)).toBe(true);
    config = fs.readFileSync(configPath, 'utf-8');
  });

  it('has HTTP to HTTPS redirect', () => {
    config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('return 301 https://');
  });

  it('listens on port 443 with ssl', () => {
    config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toMatch(/listen\s+443\s+ssl/);
  });

  it('has SSL certificate paths', () => {
    config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('ssl_certificate');
    expect(config).toContain('ssl_certificate_key');
  });

  it('proxies /api to backend', () => {
    config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('proxy_pass http://');
    expect(config).toMatch(/location\s+\/api/);
  });

  it('proxies /ws with WebSocket upgrade', () => {
    config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('Upgrade');
    expect(config).toContain('Connection');
    expect(config).toMatch(/location\s+\/ws/);
  });

  it('serves static files with try_files fallback', () => {
    config = fs.readFileSync(configPath, 'utf-8');
    expect(config).toContain('try_files');
  });
});
