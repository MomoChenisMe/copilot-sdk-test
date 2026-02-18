import { describe, it, expect } from 'vitest';
import { autoApprovePermission, createPermissionHandler } from '../../src/copilot/permission.js';

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

describe('createPermissionHandler', () => {
  it('should deny all requests in plan mode', () => {
    let mode: 'plan' | 'act' = 'plan';
    const handler = createPermissionHandler(() => mode);

    const result = handler(
      { kind: 'shell', toolCallId: 'tc-1' },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'denied-by-rules' });
  });

  it('should approve all requests in act mode', () => {
    let mode: 'plan' | 'act' = 'act';
    const handler = createPermissionHandler(() => mode);

    const result = handler(
      { kind: 'shell', toolCallId: 'tc-1' },
      { sessionId: 's-1' },
    );
    expect(result).toEqual({ kind: 'approved' });
  });

  it('should dynamically switch between modes via closure', () => {
    let mode: 'plan' | 'act' = 'act';
    const handler = createPermissionHandler(() => mode);

    // Act mode → approved
    expect(handler({ kind: 'shell' }, { sessionId: 's-1' })).toEqual({ kind: 'approved' });

    // Switch to plan
    mode = 'plan';
    expect(handler({ kind: 'shell' }, { sessionId: 's-1' })).toEqual({ kind: 'denied-by-rules' });

    // Switch back to act
    mode = 'act';
    expect(handler({ kind: 'write' }, { sessionId: 's-1' })).toEqual({ kind: 'approved' });
  });

  it('should deny all permission kinds in plan mode', () => {
    const handler = createPermissionHandler(() => 'plan');
    const kinds = ['shell', 'write', 'read', 'mcp', 'url'];

    for (const kind of kinds) {
      expect(handler({ kind }, { sessionId: 's-1' })).toEqual({ kind: 'denied-by-rules' });
    }
  });
});
