import { useTranslation } from 'react-i18next';
import type { Message, MessageMetadata } from '../../lib/api';
import { Markdown } from '../shared/Markdown';
import { ReasoningBlock } from './ReasoningBlock';
import { ToolRecord } from './ToolRecord';
import { Sparkles } from 'lucide-react';

interface MessageBlockProps {
  message: Message;
}

export function MessageBlock({ message }: MessageBlockProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-6">
        <div
          data-testid="user-bubble"
          className="max-w-[85%] bg-user-msg-bg border border-user-msg-border rounded-2xl rounded-br-sm px-4 py-3"
        >
          <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // Parse metadata for assistant messages
  const metadata = message.metadata as MessageMetadata | null | undefined;
  const toolRecords = metadata?.toolRecords;
  const reasoning = metadata?.reasoning;

  // Assistant message
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-text-muted mb-2 block">
            {t('chat.assistant')}
          </span>
          {reasoning && (
            <ReasoningBlock text={reasoning} isStreaming={false} />
          )}
          {toolRecords && toolRecords.map((record) => (
            <ToolRecord key={record.toolCallId} record={record} />
          ))}
          {message.content && (
            <div className="text-sm leading-relaxed">
              <Markdown content={message.content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
