import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { writePlanFile, extractTopicFromContent } from '../../src/copilot/plan-writer.js';

describe('plan-writer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-writer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('writePlanFile', () => {
    it('should create .codeforge/plans directory', () => {
      writePlanFile(tmpDir, '# Plan\nSome content', 'my plan');
      const plansDir = path.join(tmpDir, '.codeforge', 'plans');
      expect(fs.existsSync(plansDir)).toBe(true);
    });

    it('should generate file with date-slug format', () => {
      const filePath = writePlanFile(tmpDir, '# Plan', 'My Great Plan');
      const fileName = path.basename(filePath);
      // Should match YYYY-MM-DD-slug.md pattern
      expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}-my-great-plan\.md$/);
    });

    it('should slugify topic: lowercase, replace non-alphanumeric with hyphens, strip trailing hyphens', () => {
      const filePath = writePlanFile(tmpDir, '# Plan', 'Hello World! (v2)');
      const fileName = path.basename(filePath);
      expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}-hello-world-v2\.md$/);
    });

    it('should truncate slug to 50 characters', () => {
      const longTopic = 'a'.repeat(100);
      const filePath = writePlanFile(tmpDir, '# Plan', longTopic);
      const fileName = path.basename(filePath);
      // Date (10) + dash (1) + slug (50) + .md (3) = 64
      const slug = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it('should write the content to the file', () => {
      const content = '# My Plan\n\n## Step 1\nDo the thing';
      const filePath = writePlanFile(tmpDir, content, 'plan');
      const written = fs.readFileSync(filePath, 'utf-8');
      expect(written).toBe(content);
    });

    it('should return the full file path', () => {
      const filePath = writePlanFile(tmpDir, '# Plan', 'test');
      expect(path.isAbsolute(filePath)).toBe(true);
      expect(filePath.startsWith(tmpDir)).toBe(true);
      expect(filePath.endsWith('.md')).toBe(true);
    });

    it('should strip CJK characters from slug and fallback to "plan"', () => {
      const filePath = writePlanFile(tmpDir, '# 計畫', '重構資料庫');
      const fileName = path.basename(filePath);
      // CJK characters are stripped; only English alphanumeric kept
      expect(fileName).not.toContain('重構');
      expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}-plan\.md$/);
    });

    it('should not fail when directory already exists', () => {
      writePlanFile(tmpDir, '# First', 'first');
      // Second call should not throw
      const filePath = writePlanFile(tmpDir, '# Second', 'second');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

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
