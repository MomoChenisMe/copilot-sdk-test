import { queryClient } from './query-client';
import { queryKeys } from './query-keys';
import type { Message, Conversation } from './api';

/**
 * WebSocket-to-Query Bridge
 *
 * Centralizes all WebSocket event → TanStack Query cache synchronization.
 * Used by useTabCopilot and other handlers to keep query caches fresh
 * without triggering refetches.
 */

/** Replace the full messages cache for a conversation */
export function setMessagesInCache(conversationId: string, messages: Message[]): void {
  queryClient.setQueryData(queryKeys.conversations.messages(conversationId), messages);
}

/** Append a single message to the cache (with dedup by id) */
export function appendMessageToCache(conversationId: string, message: Message): void {
  queryClient.setQueryData<Message[]>(
    queryKeys.conversations.messages(conversationId),
    (old) => {
      if (!old) return [message];
      if (old.some((m) => m.id === message.id)) return old;
      return [...old, message];
    },
  );
}

/** Update a conversation in the list cache */
export function updateConversationInCache(
  id: string,
  updates: Partial<Pick<Conversation, 'title' | 'pinned' | 'model' | 'cwd'>>,
): void {
  queryClient.setQueryData<Conversation[]>(
    queryKeys.conversations.all,
    (old) => old?.map((c) => (c.id === id ? { ...c, ...updates } : c)) ?? [],
  );
}

/** Add a new conversation to the top of the list cache */
export function addConversationToCache(conversation: Conversation): void {
  queryClient.setQueryData<Conversation[]>(
    queryKeys.conversations.all,
    (old) => {
      if (!old) return [conversation];
      if (old.some((c) => c.id === conversation.id)) return old;
      return [conversation, ...old];
    },
  );
}

/** Set quota data in cache (from copilot:quota event) */
export function setQuotaInCache(quota: {
  used: number;
  total: number;
  resetDate: string | null;
  unlimited: boolean;
}): void {
  queryClient.setQueryData(queryKeys.quota.all, quota);
}

/** Invalidate conversations list (triggers refetch) */
export function invalidateConversations(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
}

/** Invalidate skills (triggers refetch after install/delete) */
export function invalidateSkills(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
}

/** Invalidate SDK commands (triggers refetch) */
export function invalidateSdkCommands(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.sdkCommands.all });
}

/** Invalidate messages for a specific conversation */
export function invalidateMessages(conversationId: string): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.conversations.messages(conversationId) });
}

/** Clear messages cache for a conversation (e.g., on clear conversation) */
export function clearMessagesCache(conversationId: string): void {
  queryClient.setQueryData(queryKeys.conversations.messages(conversationId), []);
}
