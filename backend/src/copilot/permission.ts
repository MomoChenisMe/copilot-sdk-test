export function autoApprovePermission(
  _request: { kind: string; [key: string]: unknown },
  _invocation: { sessionId: string },
) {
  return { kind: 'approved' as const };
}

export function createPermissionHandler(getMode: () => 'plan' | 'act') {
  return (
    _request: { kind: string; [key: string]: unknown },
    _invocation: { sessionId: string },
  ) => {
    if (getMode() === 'plan') return { kind: 'denied-by-rules' as const };
    return { kind: 'approved' as const };
  };
}
