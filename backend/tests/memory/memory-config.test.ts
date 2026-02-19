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
    // LLM intelligence defaults
    expect(DEFAULT_MEMORY_CONFIG.llmGatingEnabled).toBe(false);
    expect(DEFAULT_MEMORY_CONFIG.llmGatingModel).toBe('gpt-4o-mini');
    expect(DEFAULT_MEMORY_CONFIG.llmExtractionEnabled).toBe(false);
    expect(DEFAULT_MEMORY_CONFIG.llmExtractionModel).toBe('gpt-4o-mini');
    expect(DEFAULT_MEMORY_CONFIG.llmExtractionMaxMessages).toBe(20);
    expect(DEFAULT_MEMORY_CONFIG.llmCompactionEnabled).toBe(false);
    expect(DEFAULT_MEMORY_CONFIG.llmCompactionModel).toBe('gpt-4o-mini');
    expect(DEFAULT_MEMORY_CONFIG.llmCompactionFactThreshold).toBe(30);
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
      llmGatingEnabled: true,
      llmGatingModel: 'gpt-4o',
      llmExtractionEnabled: true,
      llmExtractionModel: 'gpt-4o',
      llmExtractionMaxMessages: 30,
      llmCompactionEnabled: true,
      llmCompactionModel: 'gpt-4o',
      llmCompactionFactThreshold: 50,
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
    // New LLM fields should use defaults when missing from file
    expect(config.llmGatingEnabled).toBe(false);
    expect(config.llmGatingModel).toBe('gpt-4o-mini');
    expect(config.llmExtractionEnabled).toBe(false);
    expect(config.llmCompactionEnabled).toBe(false);
    expect(config.llmCompactionFactThreshold).toBe(30);
  });

  it('readMemoryConfig handles corrupted file gracefully', () => {
    fs.writeFileSync(path.join(tmpDir, 'memory-config.json'), 'not json!', 'utf-8');
    const config = readMemoryConfig(tmpDir);
    expect(config).toEqual(DEFAULT_MEMORY_CONFIG);
  });
});
