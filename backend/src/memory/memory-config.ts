import fs from 'node:fs';
import path from 'node:path';

export interface MemoryConfig {
  enabled: boolean;
  autoExtract: boolean;
  flushThreshold: number;
  extractIntervalSeconds: number;
  minNewMessages: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  enabled: true,
  autoExtract: true,
  flushThreshold: 0.75,
  extractIntervalSeconds: 60,
  minNewMessages: 4,
};

const CONFIG_FILE = 'memory-config.json';

export function readMemoryConfig(basePath: string): MemoryConfig {
  const filePath = path.join(basePath, CONFIG_FILE);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MEMORY_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_MEMORY_CONFIG };
  }
}

export function writeMemoryConfig(basePath: string, config: MemoryConfig): void {
  fs.mkdirSync(basePath, { recursive: true });
  fs.writeFileSync(
    path.join(basePath, CONFIG_FILE),
    JSON.stringify(config, null, 2),
    'utf-8',
  );
}
