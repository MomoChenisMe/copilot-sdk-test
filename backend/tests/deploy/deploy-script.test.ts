import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.resolve(import.meta.dirname, '../../../scripts/deploy.sh');

describe('deploy.sh', () => {
  let script: string;

  it('script file exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    script = fs.readFileSync(scriptPath, 'utf-8');
  });

  it('starts with bash shebang', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script.startsWith('#!/bin/bash') || script.startsWith('#!/usr/bin/env bash')).toBe(true);
  });

  it('uses set -euo pipefail', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('set -euo pipefail');
  });

  it('uses rsync to upload files', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('rsync');
  });

  it('runs npm install --production or npm ci', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toMatch(/npm (install|ci)/);
  });

  it('runs npm run build', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('npm run build');
  });

  it('restarts systemd service', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('systemctl restart');
  });

  it('has configurable remote host variable', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toMatch(/REMOTE_HOST/);
  });

  it('is executable', () => {
    const stat = fs.statSync(scriptPath);
    const isExecutable = (stat.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);
  });
});
