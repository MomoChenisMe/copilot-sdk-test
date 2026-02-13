import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const scriptPath = path.resolve(import.meta.dirname, '../../../scripts/smoke-test.sh');

describe('smoke-test.sh', () => {
  let script: string;

  it('script file exists', () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    script = fs.readFileSync(scriptPath, 'utf-8');
  });

  it('starts with bash shebang', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script.startsWith('#!/bin/bash') || script.startsWith('#!/usr/bin/env bash')).toBe(true);
  });

  it('has configurable base URL', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toMatch(/BASE_URL/);
  });

  it('tests login endpoint', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('/api/auth/login');
  });

  it('tests conversation creation', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('/api/conversations');
  });

  it('tests WebSocket connectivity', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toMatch(/ws|websocat|curl.*upgrade/i);
  });

  it('tests auth status endpoint', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('/api/auth/status');
  });

  it('has pass/fail summary', () => {
    script = fs.readFileSync(scriptPath, 'utf-8');
    expect(script).toMatch(/pass|fail|PASS|FAIL|passed|failed/i);
  });

  it('is executable', () => {
    const stat = fs.statSync(scriptPath);
    const isExecutable = (stat.mode & 0o111) !== 0;
    expect(isExecutable).toBe(true);
  });
});
