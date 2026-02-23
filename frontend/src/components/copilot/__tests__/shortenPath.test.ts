import { describe, it, expect } from 'vitest';
import { shortenPath } from '../CwdSelector';

describe('shortenPath', () => {
  it('returns / for root path', () => {
    expect(shortenPath('/')).toBe('/');
  });

  it('replaces /Users/<user> with ~', () => {
    expect(shortenPath('/Users/john')).toBe('~');
  });

  it('replaces /home/<user> with ~', () => {
    expect(shortenPath('/home/john')).toBe('~');
  });

  it('shows full short path (≤3 segments)', () => {
    expect(shortenPath('/Users/john/project')).toBe('~/project');
  });

  it('shows ~/…/parent/last for long paths', () => {
    expect(shortenPath('/Users/john/Documents/GitHub/copilot-sdk-test')).toBe(
      '~/\u2026/GitHub/copilot-sdk-test',
    );
  });

  it('handles 4-segment path with home dir', () => {
    expect(shortenPath('/Users/john/Documents/GitHub')).toBe('~/\u2026/Documents/GitHub');
  });

  it('handles non-home paths with many segments', () => {
    expect(shortenPath('/var/lib/data/myapp/storage')).toBe('/var/\u2026/myapp/storage');
  });

  it('handles short non-home paths', () => {
    expect(shortenPath('/var/log')).toBe('/var/log');
  });
});
