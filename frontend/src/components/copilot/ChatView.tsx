import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store';
import { MessageBlock } from './MessageBlock';
import { StreamingText } from './StreamingText';
import { ToolRecord } from './ToolRecord';
import { ReasoningBlock } from './ReasoningBlock';

export function ChatView() {
  const messages = useAppStore((s) => s.messages);
  const streamingText = useAppStore((s) => s.streamingText);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const toolRecords = useAppStore((s) => s.toolRecords);
  const reasoningText = useAppStore((s) => s.reasoningText);
  const copilotError = useAppStore((s) => s.copilotError);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 50;
    isAutoScrolling.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  // Auto-scroll on new content
  useEffect(() => {
    if (isAutoScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, toolRecords]);

  const showStreamingBlock = isStreaming || streamingText || toolRecords.length > 0;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {messages.length === 0 && !showStreamingBlock && (
        <div className="flex items-center justify-center h-full text-text-muted text-sm">
          Start a conversation...
        </div>
      )}

      {/* Historical messages */}
      {messages.map((msg) => (
        <MessageBlock key={msg.id} message={msg} />
      ))}

      {/* Active streaming block */}
      {showStreamingBlock && (
        <div className="py-4 px-4 bg-bg-secondary">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase text-success">
                Assistant
              </span>
            </div>

            {/* Reasoning */}
            <ReasoningBlock text={reasoningText} />

            {/* Tool records */}
            {toolRecords.map((record) => (
              <ToolRecord key={record.toolCallId} record={record} />
            ))}

            {/* Streaming text */}
            {(streamingText || isStreaming) && (
              <StreamingText text={streamingText} isStreaming={isStreaming} />
            )}

            {/* Error */}
            {copilotError && (
              <div className="mt-2 p-2 bg-error/10 border border-error/30 rounded text-error text-sm">
                {copilotError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
