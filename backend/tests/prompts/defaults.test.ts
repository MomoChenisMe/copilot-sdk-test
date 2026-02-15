import { describe, it, expect } from 'vitest';
import { DEFAULT_SYSTEM_PROMPT } from '../../src/prompts/defaults.js';

describe('DEFAULT_SYSTEM_PROMPT', () => {
  it('should be a non-empty string', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toBeTruthy();
    expect(typeof DEFAULT_SYSTEM_PROMPT).toBe('string');
    expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

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
    // Check for common English keywords
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/you are/i);
    expect(DEFAULT_SYSTEM_PROMPT).toMatch(/assistant/i);
  });
});
