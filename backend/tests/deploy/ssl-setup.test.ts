import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.resolve(import.meta.dirname, '../../../scripts/setup-ssl.sh');

describe('setup-ssl.sh', () => {
  let script: string;

  it('script file exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    script = fs.readFileSync(scriptPath, 'utf-8');
  });

  it('starts with bash shebang', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script.startsWith('#!/bin/bash') || script.startsWith('#!/usr/bin/env bash')).toBe(true);
  });

  it('installs certbot', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('certbot');
  });

  it('uses certbot with nginx plugin', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('--nginx');
  });

  it('has configurable domain variable', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toMatch(/DOMAIN/);
  });

  it('sets up auto-renewal', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('renew');
  });

  it('is executable', () => {
    const stat = fs.statSync(scriptPath);
    const isExecutable = (stat.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);
  });
});
