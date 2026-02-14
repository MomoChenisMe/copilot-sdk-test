import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useAppStore } from '../../store';
import { MessageBlock } from './MessageBlock';
import { StreamingText } from './StreamingText';
import { ToolRecord } from './ToolRecord';
import { ReasoningBlock } from './ReasoningBlock';

interface ChatViewProps {
  onNewConversation: () => void;
}

export function ChatView({ onNewConversation }: ChatViewProps) {
  const { t } = useTranslation();
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const messages = useAppStore((s) => s.messages);
  const streamingText = useAppStore((s) => s.streamingText);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const toolRecords = useAppStore((s) => s.toolRecords);
  const reasoningText = useAppStore((s) => s.reasoningText);
  const copilotError = useAppStore((s) => s.copilotError);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 50;
    isAutoScrolling.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (isAutoScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, toolRecords]);

  const showStreamingBlock = isStreaming || streamingText || toolRecords.length > 0 || copilotError;

  // Welcome screen — no active conversation
  if (!activeConversationId) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Sparkles size={32} className="text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">{t('chat.welcomeTitle')}</h2>
          <p className="text-text-secondary mb-6 max-w-md">
            {t('chat.welcomeDescription')}
          </p>
          <button
            onClick={onNewConversation}
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors"
          >
            {t('chat.startConversation')}
          </button>
        </div>
      </div>
    );
  }

  // Empty conversation prompt
  if (messages.length === 0 && !showStreamingBlock) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center">
        <p className="text-text-muted text-sm">{t('chat.emptyPrompt')}</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {/* Centered conversation column */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Historical messages */}
        {messages.map((msg) => (
          <MessageBlock key={msg.id} message={msg} />
        ))}

        {/* Active streaming block */}
        {showStreamingBlock && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase text-text-muted">
                {t('chat.assistant')}
              </span>
            </div>

            {/* Reasoning */}
            <ReasoningBlock text={reasoningText} isStreaming={isStreaming} />

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
              <div className="mt-2 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm">
                {copilotError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
