import { describe, it, expect } from 'vitest';
import { queryKeys } from '../../src/lib/query-keys';

describe('queryKeys', () => {
  it('should have static keys for models', () => {
    expect(queryKeys.models.all).toEqual(['models']);
  });

  it('should have static keys for skills', () => {
    expect(queryKeys.skills.all).toEqual(['skills']);
  });

  it('should have static keys for sdkCommands', () => {
    expect(queryKeys.sdkCommands.all).toEqual(['sdkCommands']);
  });

  it('should have static keys for settings', () => {
    expect(queryKeys.settings.all).toEqual(['settings']);
  });

  it('should have static keys for quota', () => {
    expect(queryKeys.quota.all).toEqual(['quota']);
  });

  it('should have static keys for config', () => {
    expect(queryKeys.config.all).toEqual(['config']);
    expect(queryKeys.config.braveApiKey).toEqual(['config', 'braveApiKey']);
  });

  it('should have static key for conversations.all', () => {
    expect(queryKeys.conversations.all).toEqual(['conversations']);
  });

  it('should generate dynamic key for conversations.detail', () => {
    expect(queryKeys.conversations.detail('abc-123')).toEqual(['conversations', 'abc-123']);
  });

  it('should generate dynamic key for conversations.messages', () => {
    expect(queryKeys.conversations.messages('abc-123')).toEqual(['conversations', 'abc-123', 'messages']);
  });

  it('should generate dynamic key for conversations.search', () => {
    expect(queryKeys.conversations.search('hello')).toEqual(['conversations', 'search', 'hello']);
  });

  it('should return different references for different conversation ids', () => {
    const key1 = queryKeys.conversations.messages('id-1');
    const key2 = queryKeys.conversations.messages('id-2');
    expect(key1).not.toEqual(key2);
  });
});
