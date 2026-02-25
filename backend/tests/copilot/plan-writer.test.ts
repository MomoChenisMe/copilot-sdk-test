import { describe, it, expect } from 'vitest';
import { extractTopicFromContent } from '../../src/copilot/plan-utils.js';

describe('plan-utils', () => {
  describe('extractTopicFromContent', () => {
    it('should extract first markdown heading as topic', () => {
      const content = '# My Plan for Refactoring\n\nSome text here';
      expect(extractTopicFromContent(content)).toBe('My Plan for Refactoring');
    });

    it('should fall back to first line for h2 heading (only h1 is recognized)', () => {
      const content = '## Phase 1: Database Migration\n\nDetails...';
      // The regex /^#\s+(.+)/m only matches `# ` (h1), not `## ` (h2)
      // So it falls back to the first line
      expect(extractTopicFromContent(content)).toBe('## Phase 1: Database Migration');
    });

    it('should fall back to first line when no heading', () => {
      const content = 'This is a plan without a heading\nSecond line';
      expect(extractTopicFromContent(content)).toBe('This is a plan without a heading');
    });

    it('should truncate first line to 50 chars', () => {
      const content = 'A'.repeat(80);
      const topic = extractTopicFromContent(content);
      expect(topic.length).toBeLessThanOrEqual(50);
    });

    it('should return "plan" for empty content', () => {
      expect(extractTopicFromContent('')).toBe('plan');
    });
  });
});
