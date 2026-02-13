export function autoApprovePermission(
  _request: { kind: string; [key: string]: unknown },
  _invocation: { sessionId: string },
) {
  return { kind: 'approved' as const };
}
