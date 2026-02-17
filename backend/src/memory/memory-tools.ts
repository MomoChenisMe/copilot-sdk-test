import type { Tool } from '@github/copilot-sdk';
import type { MemoryStore } from './memory-store.js';
import type { MemoryIndex } from './memory-index.js';

export function createMemoryTools(store: MemoryStore, index: MemoryIndex): Tool[] {
  const readMemory: Tool = {
    name: 'read_memory',
    description: 'Read the auto-memory file (MEMORY.md). Returns accumulated facts and knowledge learned across conversations.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      return { content: store.readMemory() };
    },
  };

  const appendMemory: Tool = {
    name: 'append_memory',
    description: 'Append a new fact or piece of knowledge to MEMORY.md. Use this to persistently remember important information about the user or project.',
    parameters: {
      type: 'object',
      properties: {
        fact: { type: 'string', description: 'The fact to remember (a single line, no bullet prefix needed)' },
      },
      required: ['fact'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      const fact = args.fact.trim();
      const current = store.readMemory();
      const newLine = `- ${fact}`;
      store.writeMemory(current ? `${current}\n${newLine}` : newLine);
      index.addFact(fact, 'general', 'MEMORY.md');
      return { ok: true };
    },
  };

  const searchMemory: Tool = {
    name: 'search_memory',
    description: 'Search the memory index for relevant facts. Returns matching facts ranked by relevance.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query keywords' },
        limit: { type: 'number', description: 'Maximum number of results (default 5)' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      const results = index.searchBM25(args.query, args.limit ?? 5);
      return {
        results: results.map((r) => ({
          content: r.content,
          category: r.category,
          source: r.source,
        })),
      };
    },
  };

  const appendDailyLog: Tool = {
    name: 'append_daily_log',
    description: 'Append an entry to a daily log file. Useful for recording notable events, decisions, or progress.',
    parameters: {
      type: 'object',
      properties: {
        entry: { type: 'string', description: 'The log entry text' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (defaults to today)' },
      },
      required: ['entry'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      const date = args.date ?? new Date().toISOString().slice(0, 10);
      store.appendDailyLog(date, `- ${args.entry.trim()}`);
      return { ok: true };
    },
  };

  return [readMemory, appendMemory, searchMemory, appendDailyLog];
}
