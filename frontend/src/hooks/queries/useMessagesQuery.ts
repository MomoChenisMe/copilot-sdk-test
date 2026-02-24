import { useQuery } from '@tanstack/react-query';
import { conversationApi, type Message, type MessageMetadata, type ToolRecord, type TurnSegment } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';

/**
 * Fix stale "running" tool records in historical messages.
 * If a message is followed by another, any "running" tools must have completed.
 */
function fixStaleToolRecords(messages: Message[]): Message[] {
  return messages.map((msg, i) => {
    const meta = msg.metadata as MessageMetadata | null;
    if (msg.role !== 'assistant' || !meta?.toolRecords) return msg;
    const hasNext = i < messages.length - 1;
    if (!hasNext) return msg;
    const hasRunning = meta.toolRecords.some((r) => r.status === 'running');
    if (!hasRunning) return msg;
    return {
      ...msg,
      metadata: {
        ...meta,
        toolRecords: meta.toolRecords.map((r: ToolRecord) =>
          r.status === 'running' ? { ...r, status: 'success' as const } : r,
        ),
        ...(meta.turnSegments
          ? {
              turnSegments: meta.turnSegments.map((s: TurnSegment) =>
                s.type === 'tool' && s.status === 'running'
                  ? { ...s, status: 'success' as const }
                  : s,
              ),
            }
          : {}),
      },
    };
  });
}

export function useMessagesQuery(conversationId: string | null | undefined) {
  return useQuery<Message[]>({
    queryKey: queryKeys.conversations.messages(conversationId ?? ''),
    queryFn: () => conversationApi.getMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000,
    select: fixStaleToolRecords,
  });
}
