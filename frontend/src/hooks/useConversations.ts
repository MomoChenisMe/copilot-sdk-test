import { useState, useEffect, useCallback } from 'react';
import { conversationApi, type Conversation, type SearchResult } from '../lib/api';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await conversationApi.list();
      setConversations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (model: string, cwd: string) => {
      const conv = await conversationApi.create(model, cwd);
      setConversations((prev) => [conv, ...prev]);
      return conv;
    },
    [],
  );

  const update = useCallback(
    async (id: string, updates: { title?: string; pinned?: boolean; model?: string; cwd?: string; sdkSessionId?: string | null }) => {
      const updated = await conversationApi.update(id, updates);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [],
  );

  const remove = useCallback(
    async (id: string) => {
      await conversationApi.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    },
    [],
  );

  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    return conversationApi.search(query);
  }, []);

  return {
    conversations,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    search,
  };
}
