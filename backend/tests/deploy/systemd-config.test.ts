import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const servicePath = path.resolve(import.meta.dirname, '../../../systemd/ai-terminal.service');

describe('systemd service config', () => {
  let config: string;

  it('service file exists', () => {
    expect(fs.existsSync(servicePath)).toBe(true);
    config = fs.readFileSync(servicePath, 'utf-8');
  });

  it('has [Unit] section with description', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toContain('[Unit]');
    expect(config).toContain('Description=');
  });

  it('has [Service] section', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toContain('[Service]');
  });

  it('has ExecStart with node', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toMatch(/ExecStart=.*node/);
  });

  it('has Restart=on-failure', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toContain('Restart=on-failure');
  });

  it('has EnvironmentFile', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toContain('EnvironmentFile=');
  });

  it('has WorkingDirectory', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toContain('WorkingDirectory=');
  });

  it('has [Install] section with WantedBy', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toContain('[Install]');
    expect(config).toContain('WantedBy=multi-user.target');
  });

  it('sets NODE_ENV=production', () => {
    config = fs.readFileSync(servicePath, 'utf-8');
    expect(config).toContain('NODE_ENV=production');
  });
});
