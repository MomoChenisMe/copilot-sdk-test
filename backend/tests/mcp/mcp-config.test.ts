import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseMcpConfig, type McpServerConfig } from '../../src/mcp/mcp-config.js';

describe('parseMcpConfig', () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-config-'));
    configPath = path.join(tmpDir, '.mcp.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should parse valid .mcp.json with stdio servers', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-server-filesystem', '/tmp'],
          transport: 'stdio',
        },
      },
    }));

    const config = parseMcpConfig(configPath);
    expect(config).toHaveLength(1);
    expect(config[0].name).toBe('filesystem');
    expect(config[0].transport).toBe('stdio');
    expect(config[0].command).toBe('npx');
    expect(config[0].args).toEqual(['-y', '@anthropic/mcp-server-filesystem', '/tmp']);
  });

  it('should parse HTTP transport servers', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        'custom-api': {
          url: 'http://localhost:3001/mcp',
          transport: 'http',
        },
      },
    }));

    const config = parseMcpConfig(configPath);
    expect(config).toHaveLength(1);
    expect(config[0].name).toBe('custom-api');
    expect(config[0].transport).toBe('http');
    expect(config[0].url).toBe('http://localhost:3001/mcp');
  });

  it('should expand environment variables in args', () => {
    process.env.MCP_TEST_PATH = '/custom/path';
    fs.writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        test: {
          command: 'node',
          args: ['${MCP_TEST_PATH}/server.js'],
          transport: 'stdio',
        },
      },
    }));

    const config = parseMcpConfig(configPath);
    expect(config[0].args![0]).toBe('/custom/path/server.js');
    delete process.env.MCP_TEST_PATH;
  });

  it('should return empty array when file does not exist', () => {
    const config = parseMcpConfig('/nonexistent/.mcp.json');
    expect(config).toEqual([]);
  });

  it('should return empty array for malformed JSON', () => {
    fs.writeFileSync(configPath, '{ invalid json }');
    const config = parseMcpConfig(configPath);
    expect(config).toEqual([]);
  });

  it('should parse multiple servers', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        fs: { command: 'fs-server', transport: 'stdio' },
        web: { url: 'http://localhost:8080', transport: 'http' },
      },
    }));

    const config = parseMcpConfig(configPath);
    expect(config).toHaveLength(2);
  });
});
