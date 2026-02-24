import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../src/test-utils/query-wrapper';

const mockGetMessages = vi.fn();

vi.mock('../../../src/lib/api', () => ({
  conversationApi: {
    getMessages: (...args: unknown[]) => mockGetMessages(...args),
  },
}));

import { useMessagesQuery } from '../../../src/hooks/queries/useMessagesQuery';

const makeMessage = (overrides: Record<string, unknown> = {}) => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user' as const,
  content: 'Hello',
  metadata: null,
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('useMessagesQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches messages when conversationId is provided', async () => {
    const msgs = [makeMessage()];
    mockGetMessages.mockResolvedValue(msgs);
    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(msgs);
    expect(mockGetMessages).toHaveBeenCalledWith('conv-1');
  });

  it('is disabled when conversationId is null', () => {
    const { result } = renderHook(() => useMessagesQuery(null), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMessages).not.toHaveBeenCalled();
  });

  it('is disabled when conversationId is undefined', () => {
    const { result } = renderHook(() => useMessagesQuery(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetMessages).not.toHaveBeenCalled();
  });

  it('fixes stale running tool records via select', async () => {
    const msgs = [
      makeMessage({
        id: 'msg-1',
        role: 'assistant',
        metadata: {
          toolRecords: [{ toolCallId: 't1', toolName: 'test', status: 'running' }],
        },
      }),
      makeMessage({ id: 'msg-2', role: 'user', content: 'next' }),
    ];
    mockGetMessages.mockResolvedValue(msgs);
    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const fixed = result.current.data!;
    const meta = fixed[0].metadata as { toolRecords: Array<{ status: string }> };
    expect(meta.toolRecords[0].status).toBe('success');
  });

  it('does not fix running tools on the last message', async () => {
    const msgs = [
      makeMessage({
        id: 'msg-1',
        role: 'assistant',
        metadata: {
          toolRecords: [{ toolCallId: 't1', toolName: 'test', status: 'running' }],
        },
      }),
    ];
    mockGetMessages.mockResolvedValue(msgs);
    const { result } = renderHook(() => useMessagesQuery('conv-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const meta = result.current.data![0].metadata as { toolRecords: Array<{ status: string }> };
    expect(meta.toolRecords[0].status).toBe('running');
  });
});
