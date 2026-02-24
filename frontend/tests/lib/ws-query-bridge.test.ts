import { describe, it, expect, beforeEach } from 'vitest';
import { queryClient } from '../../src/lib/query-client';
import { queryKeys } from '../../src/lib/query-keys';
import {
  setMessagesInCache,
  appendMessageToCache,
  updateConversationInCache,
  addConversationToCache,
  setQuotaInCache,
  invalidateConversations,
  invalidateSkills,
  clearMessagesCache,
} from '../../src/lib/ws-query-bridge';
import type { Message, Conversation } from '../../src/lib/api';

const makeMessage = (id: string, content = 'test'): Message => ({
  id,
  conversationId: 'conv-1',
  role: 'user',
  content,
  metadata: null,
  createdAt: new Date().toISOString(),
});

const makeConversation = (id: string, title = 'Test'): Conversation => ({
  id,
  title,
  model: 'gpt-4o',
  cwd: '/tmp',
  pinned: false,
  sdkSessionId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('ws-query-bridge', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  describe('setMessagesInCache', () => {
    it('sets the full messages array for a conversation', () => {
      const msgs = [makeMessage('m1'), makeMessage('m2')];
      setMessagesInCache('conv-1', msgs);
      expect(queryClient.getQueryData(queryKeys.conversations.messages('conv-1'))).toEqual(msgs);
    });
  });

  describe('appendMessageToCache', () => {
    it('appends a message to existing cache', () => {
      const existing = [makeMessage('m1')];
      queryClient.setQueryData(queryKeys.conversations.messages('conv-1'), existing);

      appendMessageToCache('conv-1', makeMessage('m2'));
      const cached = queryClient.getQueryData<Message[]>(queryKeys.conversations.messages('conv-1'));
      expect(cached).toHaveLength(2);
      expect(cached![1].id).toBe('m2');
    });

    it('creates cache with single message when empty', () => {
      appendMessageToCache('conv-1', makeMessage('m1'));
      const cached = queryClient.getQueryData<Message[]>(queryKeys.conversations.messages('conv-1'));
      expect(cached).toHaveLength(1);
      expect(cached![0].id).toBe('m1');
    });

    it('deduplicates by message id', () => {
      const msg = makeMessage('m1');
      queryClient.setQueryData(queryKeys.conversations.messages('conv-1'), [msg]);

      appendMessageToCache('conv-1', makeMessage('m1'));
      const cached = queryClient.getQueryData<Message[]>(queryKeys.conversations.messages('conv-1'));
      expect(cached).toHaveLength(1);
    });
  });

  describe('updateConversationInCache', () => {
    it('updates a conversation in the list', () => {
      const convs = [makeConversation('c1', 'Old'), makeConversation('c2', 'Other')];
      queryClient.setQueryData(queryKeys.conversations.all, convs);

      updateConversationInCache('c1', { title: 'New Title' });
      const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
      expect(cached![0].title).toBe('New Title');
      expect(cached![1].title).toBe('Other');
    });
  });

  describe('addConversationToCache', () => {
    it('prepends a new conversation', () => {
      queryClient.setQueryData(queryKeys.conversations.all, [makeConversation('c1')]);

      addConversationToCache(makeConversation('c2', 'New'));
      const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
      expect(cached).toHaveLength(2);
      expect(cached![0].id).toBe('c2');
    });

    it('deduplicates by conversation id', () => {
      queryClient.setQueryData(queryKeys.conversations.all, [makeConversation('c1')]);

      addConversationToCache(makeConversation('c1', 'Duplicate'));
      const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
      expect(cached).toHaveLength(1);
    });

    it('creates cache when empty', () => {
      addConversationToCache(makeConversation('c1'));
      const cached = queryClient.getQueryData<Conversation[]>(queryKeys.conversations.all);
      expect(cached).toHaveLength(1);
    });
  });

  describe('setQuotaInCache', () => {
    it('sets quota data', () => {
      setQuotaInCache({ used: 5, total: 100, resetDate: '2026-03-01', unlimited: false });
      const cached = queryClient.getQueryData(queryKeys.quota.all);
      expect(cached).toEqual({ used: 5, total: 100, resetDate: '2026-03-01', unlimited: false });
    });
  });

  describe('invalidateConversations', () => {
    it('invalidates conversations query', async () => {
      queryClient.setQueryData(queryKeys.conversations.all, [makeConversation('c1')]);
      await invalidateConversations();
      const state = queryClient.getQueryState(queryKeys.conversations.all);
      expect(state?.isInvalidated).toBe(true);
    });
  });

  describe('invalidateSkills', () => {
    it('invalidates skills query', async () => {
      queryClient.setQueryData(queryKeys.skills.all, []);
      await invalidateSkills();
      const state = queryClient.getQueryState(queryKeys.skills.all);
      expect(state?.isInvalidated).toBe(true);
    });
  });

  describe('clearMessagesCache', () => {
    it('sets messages cache to empty array', () => {
      queryClient.setQueryData(queryKeys.conversations.messages('conv-1'), [makeMessage('m1')]);
      clearMessagesCache('conv-1');
      expect(queryClient.getQueryData(queryKeys.conversations.messages('conv-1'))).toEqual([]);
    });
  });
});
