import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createWrapper, createTestQueryClient } from '../../../src/test-utils/query-wrapper';
import type { Conversation } from '../../../src/lib/api';
import { queryKeys } from '../../../src/lib/query-keys';

const mockConversationApi = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  search: vi.fn(),
};

vi.mock('../../../src/lib/api', () => ({
  conversationApi: {
    list: (...args: unknown[]) => mockConversationApi.list(...args),
    create: (...args: unknown[]) => mockConversationApi.create(...args),
    update: (...args: unknown[]) => mockConversationApi.update(...args),
    delete: (...args: unknown[]) => mockConversationApi.delete(...args),
    search: (...args: unknown[]) => mockConversationApi.search(...args),
  },
}));

import {
  useConversationsQuery,
  useConversationSearchQuery,
  useCreateConversation,
  useUpdateConversation,
  useDeleteConversation,
} from '../../../src/hooks/queries/useConversationsQuery';

const mockConversation = {
  id: 'conv-1',
  title: 'Test',
  sdkSessionId: null,
  model: 'claude-3',
  cwd: '/tmp',
  pinned: false,
  cronEnabled: false,
  cronScheduleType: null,
  cronScheduleValue: null,
  cronPrompt: null,
  cronModel: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('useConversationsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches conversations list', async () => {
    mockConversationApi.list.mockResolvedValue([mockConversation]);
    const { result } = renderHook(() => useConversationsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([mockConversation]);
    expect(mockConversationApi.list).toHaveBeenCalledTimes(1);
  });

  it('handles error', async () => {
    mockConversationApi.list.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useConversationsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});

describe('useConversationSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches when query is non-empty', async () => {
    const results = [{ conversationId: 'conv-1', conversationTitle: 'Test', snippet: 'hello' }];
    mockConversationApi.search.mockResolvedValue(results);
    const { result } = renderHook(() => useConversationSearchQuery('hello'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(results);
  });

  it('is disabled when query is empty', () => {
    const { result } = renderHook(() => useConversationSearchQuery(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockConversationApi.search).not.toHaveBeenCalled();
  });
});

describe('useCreateConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates conversation and updates cache', async () => {
    mockConversationApi.list.mockResolvedValue([]);
    mockConversationApi.create.mockResolvedValue(mockConversation);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result: listResult } = renderHook(() => useConversationsQuery(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result } = renderHook(() => useCreateConversation(), { wrapper });
    result.current.mutate({ model: 'claude-3', cwd: '/tmp' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
    expect(cached).toEqual([mockConversation]);
  });
});

describe('useUpdateConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates conversation and updates cache', async () => {
    mockConversationApi.list.mockResolvedValue([mockConversation]);
    const updated = { ...mockConversation, title: 'Updated' };
    mockConversationApi.update.mockResolvedValue(updated);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result: listResult } = renderHook(() => useConversationsQuery(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result } = renderHook(() => useUpdateConversation(), { wrapper });
    result.current.mutate({ id: 'conv-1', updates: { title: 'Updated' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
    expect(cached?.[0].title).toBe('Updated');
  });
});

describe('useDeleteConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes conversation and removes from cache', async () => {
    mockConversationApi.list.mockResolvedValue([mockConversation]);
    mockConversationApi.delete.mockResolvedValue({ ok: true });

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result: listResult } = renderHook(() => useConversationsQuery(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result } = renderHook(() => useDeleteConversation(), { wrapper });
    result.current.mutate('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
    expect(cached).toEqual([]);
  });
});
