import { describe, it, expect } from 'vitest';
import { getModelCapabilities, modelSupportsAttachments } from '../../src/lib/model-capabilities';

describe('model-capabilities', () => {
  describe('getModelCapabilities', () => {
    it('gpt-4o supports attachments', () => {
      expect(getModelCapabilities('gpt-4o').supportsAttachments).toBe(true);
    });

    it('gpt-4o-mini supports attachments', () => {
      expect(getModelCapabilities('gpt-4o-mini').supportsAttachments).toBe(true);
    });

    it('gpt-4-turbo supports attachments (vision)', () => {
      expect(getModelCapabilities('gpt-4-turbo').supportsAttachments).toBe(true);
    });

    it('o1-mini does NOT support attachments', () => {
      expect(getModelCapabilities('o1-mini').supportsAttachments).toBe(false);
    });

    it('o1-preview does NOT support attachments', () => {
      expect(getModelCapabilities('o1-preview').supportsAttachments).toBe(false);
    });

    it('o3-mini does NOT support attachments', () => {
      expect(getModelCapabilities('o3-mini').supportsAttachments).toBe(false);
    });

    it('claude-3.5-sonnet supports attachments', () => {
      expect(getModelCapabilities('claude-3.5-sonnet').supportsAttachments).toBe(true);
    });

    it('unknown model returns default (supports attachments)', () => {
      expect(getModelCapabilities('unknown-model-xyz').supportsAttachments).toBe(true);
    });

    it('prefix matching works for versioned models like gpt-4o-2024-08-06', () => {
      expect(getModelCapabilities('gpt-4o-2024-08-06').supportsAttachments).toBe(true);
    });

    it('prefix matching works for o1-mini-2024-09-12', () => {
      expect(getModelCapabilities('o1-mini-2024-09-12').supportsAttachments).toBe(false);
    });
  });

  describe('modelSupportsAttachments', () => {
    it('returns true for gpt-4o', () => {
      expect(modelSupportsAttachments('gpt-4o')).toBe(true);
    });

    it('returns false for o1-mini', () => {
      expect(modelSupportsAttachments('o1-mini')).toBe(false);
    });

    it('returns true for empty string (default)', () => {
      expect(modelSupportsAttachments('')).toBe(true);
    });
  });
});
