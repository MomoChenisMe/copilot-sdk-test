import { describe, it, expect } from 'vitest';
import { autoApprovePermission } from '../../src/copilot/permission.js';

describe('autoApprovePermission', () => {
  it('should approve shell permission', () => {
    const result = autoApprovePermission(
      { kind: 'shell', toolCallId: 'tc-1' },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'approved' });
  });

  it('should approve write permission', () => {
    const result = autoApprovePermission(
      { kind: 'write', toolCallId: 'tc-2' },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'approved' });
  });

  it('should approve read permission', () => {
    const result = autoApprovePermission(
      { kind: 'read', toolCallId: 'tc-3' },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'approved' });
  });

  it('should approve mcp permission', () => {
    const result = autoApprovePermission(
      { kind: 'mcp', toolCallId: 'tc-4' },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'approved' });
  });

  it('should approve url permission', () => {
    const result = autoApprovePermission(
      { kind: 'url', toolCallId: 'tc-5' },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'approved' });
  });

  it('should approve any unknown permission kind', () => {
    const result = autoApprovePermission(
      { kind: 'unknown-future-kind' as any },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'approved' });
  });
});
