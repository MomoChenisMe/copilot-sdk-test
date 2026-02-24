import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationApi, type Conversation, type SearchResult } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';

export function useConversationsQuery() {
  return useQuery<Conversation[]>({
    queryKey: queryKeys.conversations.all,
    queryFn: () => conversationApi.list(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useConversationSearchQuery(query: string) {
  return useQuery<SearchResult[]>({
    queryKey: queryKeys.conversations.search(query),
    queryFn: () => conversationApi.search(query),
    enabled: query.length > 0,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ model, cwd }: { model: string; cwd: string }) =>
      conversationApi.create(model, cwd),
    onSuccess: (newConv) => {
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old) => (old ? [newConv, ...old] : [newConv]),
      );
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { title?: string; pinned?: boolean; model?: string; cwd?: string; sdkSessionId?: string | null };
    }) => conversationApi.update(id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old) => old?.map((c) => (c.id === updated.id ? updated : c)) ?? [],
      );
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => conversationApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old) => old?.filter((c) => c.id !== id) ?? [],
      );
    },
  });
}
