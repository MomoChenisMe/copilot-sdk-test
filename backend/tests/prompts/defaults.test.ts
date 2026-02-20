import { describe, it, expect } from 'vitest';
import { DEFAULT_SYSTEM_PROMPT } from '../../src/prompts/defaults.js';

describe('DEFAULT_SYSTEM_PROMPT', () => {
  it('should be a non-empty string', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toBeTruthy();
    expect(typeof DEFAULT_SYSTEM_PROMPT).toBe('string');
    expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should contain "CodeForge" and NOT "AI Terminal"', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('CodeForge');
    expect(DEFAULT_SYSTEM_PROMPT).not.toMatch(/AI Terminal/i);
  });

  it('should reference .codeforge.md project config', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('.codeforge.md');
  });

  // ── Section headings ──────────────────────────────────────────────
  it('should contain Identity & Role section', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Identity & Role');
  });

  it('should contain Safety & Ethics section', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Safety & Ethics');
  });

  it('should contain Response Guidelines section', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Response Guidelines');
  });

  it('should contain Tool Usage section', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Tool Usage');
  });

  it('should contain Workspace Context section', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('Workspace Context');
  });

  it('should be written in English', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/you are/i);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/assistant/i);
  });

  // ── Feature keywords ──────────────────────────────────────────────
  describe('feature coverage', () => {
    it('should mention multi-tab conversations', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/multi-tab/i);
    });

    it('should mention Plan Mode and Act Mode', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/plan mode/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/act mode/i);
    });

    it('should mention bash command execution', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/bash/i);
    });

    it('should mention file operations (read, write, search)', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/file/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/read/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/search/i);
    });

    it('should mention Git operations', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/git/i);
    });

    it('should mention artifacts (HTML, SVG, Mermaid, Markdown)', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/artifact/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/html/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/svg/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/mermaid/i);
    });

    it('should mention task management', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/task/i);
    });

    it('should mention the skill system with builtin skills', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/skill/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/brainstorming/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/conventional-commit/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/doc-coauthoring/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/frontend-design/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/openspec-workflow/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/skill-creator/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/tdd-workflow/i);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/ui-ux-pro-max/i);
    });

    it('should mention the memory system', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/memory/i);
    });

    it('should mention MCP (Model Context Protocol)', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/MCP/);
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/Model Context Protocol/i);
    });

    it('should mention web search', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/web.?search/i);
    });

    it('should mention cron / scheduled tasks', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toMatch(/cron|scheduled/i);
    });
  });

  // ── Length budget ─────────────────────────────────────────────────
  it('should be between 5,000 and 8,000 characters', () => {
    expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThanOrEqual(5000);
    expect(DEFAULT_SYSTEM_PROMPT.length).toBeLessThanOrEqual(8000);
  });
});
