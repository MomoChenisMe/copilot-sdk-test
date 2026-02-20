import { describe, it, expect } from 'vitest';
import { MODEL_MULTIPLIERS, getModelMultiplier } from '../../src/copilot/model-multipliers.js';

describe('MODEL_MULTIPLIERS', () => {
  it('is a Record<string, number>', () => {
    expect(typeof MODEL_MULTIPLIERS).toBe('object');
    for (const [key, value] of Object.entries(MODEL_MULTIPLIERS)) {
      expect(typeof key).toBe('string');
      expect(typeof value).toBe('number');
    }
  });

  it('contains expected free tier models (0x)', () => {
    expect(MODEL_MULTIPLIERS['gpt-4.1']).toBe(0);
    expect(MODEL_MULTIPLIERS['gpt-4o']).toBe(0);
    expect(MODEL_MULTIPLIERS['gpt-5-mini']).toBe(0);
  });

  it('contains expected discount tier models (0.33x)', () => {
    expect(MODEL_MULTIPLIERS['claude-haiku-4.5']).toBe(0.33);
    expect(MODEL_MULTIPLIERS['gemini-3-flash']).toBe(0.33);
    expect(MODEL_MULTIPLIERS['gpt-5.1-codex-mini']).toBe(0.33);
    expect(MODEL_MULTIPLIERS['raptor-mini']).toBe(0.33);
  });

  it('contains expected standard tier models (1x)', () => {
    expect(MODEL_MULTIPLIERS['claude-sonnet-4']).toBe(1);
    expect(MODEL_MULTIPLIERS['claude-sonnet-4.5']).toBe(1);
    expect(MODEL_MULTIPLIERS['claude-sonnet-4.6']).toBe(1);
    expect(MODEL_MULTIPLIERS['gpt-5']).toBe(1);
    expect(MODEL_MULTIPLIERS['gpt-5.1']).toBe(1);
  });

  it('contains expected premium tier models (3x)', () => {
    expect(MODEL_MULTIPLIERS['claude-opus-4.5']).toBe(3);
    expect(MODEL_MULTIPLIERS['claude-opus-4.6']).toBe(3);
  });

  it('contains expected ultra tier models (9x)', () => {
    expect(MODEL_MULTIPLIERS['claude-opus-4.6-fast']).toBe(9);
  });
});

describe('getModelMultiplier', () => {
  it('returns correct multiplier for known model IDs', () => {
    expect(getModelMultiplier('claude-haiku-4.5')).toBe(0.33);
    expect(getModelMultiplier('gpt-4o')).toBe(0);
    expect(getModelMultiplier('claude-sonnet-4.5')).toBe(1);
    expect(getModelMultiplier('claude-opus-4.6')).toBe(3);
    expect(getModelMultiplier('claude-opus-4.6-fast')).toBe(9);
  });

  it('returns null for unknown model IDs', () => {
    expect(getModelMultiplier('unknown-model')).toBeNull();
    expect(getModelMultiplier('')).toBeNull();
    expect(getModelMultiplier('gpt-99')).toBeNull();
  });

  it('returns 0 (not null) for free tier models', () => {
    const result = getModelMultiplier('gpt-4o');
    expect(result).toBe(0);
    expect(result).not.toBeNull();
  });

  it('strips -preview suffix for normalized matching', () => {
    expect(getModelMultiplier('gemini-3-pro-preview')).toBe(1);
  });

  it('matches newly added codex models', () => {
    expect(getModelMultiplier('gpt-5.2-codex')).toBe(1);
    expect(getModelMultiplier('gpt-5.3-codex')).toBe(1);
  });
});
