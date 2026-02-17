import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  MemoryConfig,
  DEFAULT_MEMORY_CONFIG,
  readMemoryConfig,
  writeMemoryConfig,
} from '../../src/memory/memory-config.js';

describe('MemoryConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-cfg-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('DEFAULT_MEMORY_CONFIG has expected defaults', () => {
    expect(DEFAULT_MEMORY_CONFIG.enabled).toBe(true);
    expect(DEFAULT_MEMORY_CONFIG.autoExtract).toBe(true);
    expect(DEFAULT_MEMORY_CONFIG.flushThreshold).toBe(0.75);
    expect(DEFAULT_MEMORY_CONFIG.extractIntervalSeconds).toBe(60);
    expect(DEFAULT_MEMORY_CONFIG.minNewMessages).toBe(4);
  });

  it('readMemoryConfig returns defaults when no config file exists', () => {
    const config = readMemoryConfig(tmpDir);
    expect(config).toEqual(DEFAULT_MEMORY_CONFIG);
  });

  it('writeMemoryConfig writes and readMemoryConfig reads back', () => {
    const custom: MemoryConfig = {
      enabled: false,
      autoExtract: false,
      flushThreshold: 0.5,
      extractIntervalSeconds: 120,
      minNewMessages: 8,
    };
    writeMemoryConfig(tmpDir, custom);
    const read = readMemoryConfig(tmpDir);
    expect(read).toEqual(custom);
  });

  it('readMemoryConfig merges partial config with defaults', () => {
    const partial = { enabled: false };
    fs.writeFileSync(
      path.join(tmpDir, 'memory-config.json'),
      JSON.stringify(partial),
      'utf-8',
    );
    const config = readMemoryConfig(tmpDir);
    expect(config.enabled).toBe(false);
    expect(config.autoExtract).toBe(DEFAULT_MEMORY_CONFIG.autoExtract);
    expect(config.flushThreshold).toBe(DEFAULT_MEMORY_CONFIG.flushThreshold);
  });

  it('readMemoryConfig handles corrupted file gracefully', () => {
    fs.writeFileSync(path.join(tmpDir, 'memory-config.json'), 'not json!', 'utf-8');
    const config = readMemoryConfig(tmpDir);
    expect(config).toEqual(DEFAULT_MEMORY_CONFIG);
  });
});
