import { useTranslation } from 'react-i18next';
import type { Message, MessageMetadata, TurnSegment } from '../../lib/api';
import { Markdown } from '../shared/Markdown';
import { ReasoningBlock } from './ReasoningBlock';
import { ToolRecord } from './ToolRecord';
import { ToolRecordErrorBoundary } from './ToolRecordErrorBoundary';
import { ToolResultBlock } from './ToolResultBlock';
import { Sparkles } from 'lucide-react';

const INLINE_RESULT_TOOLS = ['bash', 'shell', 'execute', 'run'];

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
  const turnSegments = metadata?.turnSegments;
  const toolRecords = metadata?.toolRecords;
  const reasoning = metadata?.reasoning;

  // Render content area based on turnSegments availability
  const renderContent = () => {
    // New path: ordered turnSegments rendering
    if (turnSegments && turnSegments.length > 0) {
      // Canonical order: reasoning first, then tools/text in original order
      const reasoningSegments = turnSegments.filter(s => s.type === 'reasoning');
      const nonReasoningSegments = turnSegments.filter(s => s.type !== 'reasoning');

      return (
        <>
          {/* Legacy fallback: turnSegments has no reasoning entry but metadata.reasoning exists */}
          {reasoningSegments.length === 0 && reasoning && (
            <ReasoningBlock text={reasoning} isStreaming={false} />
          )}
          {/* Always render reasoning first */}
          {reasoningSegments.map((segment, index) => (
            <ReasoningBlock key={`reasoning-${index}`} text={segment.content} isStreaming={false} />
          ))}
          {/* Then tools and text in their original order */}
          {nonReasoningSegments.map((segment, index) => {
            switch (segment.type) {
              case 'text':
                return (
                  <div key={`text-${index}`} className="text-sm leading-relaxed">
                    <Markdown content={segment.content} />
                  </div>
                );
              case 'tool': {
                const toolSeg = segment as TurnSegment & { type: 'tool' };
                const isInlineTool = INLINE_RESULT_TOOLS.includes(toolSeg.toolName);
                const showResult = isInlineTool &&
                  toolSeg.status !== 'running' &&
                  (toolSeg.result != null || toolSeg.error != null);
                const resultValue = toolSeg.result ?? toolSeg.error;
                return (
                  <div key={`tool-${toolSeg.toolCallId}`}>
                    <ToolRecordErrorBoundary>
                      <ToolRecord record={toolSeg} />
                    </ToolRecordErrorBoundary>
                    {showResult && (
                      <ToolResultBlock result={resultValue} toolName={toolSeg.toolName} status={toolSeg.status} />
                    )}
                  </div>
                );
              }
              default:
                return null;
            }
          })}
        </>
      );
    }

    // Fallback: old rendering order (reasoning → tools → text)
    return (
      <>
        {reasoning && (
          <ReasoningBlock text={reasoning} isStreaming={false} />
        )}
        {toolRecords && toolRecords.map((record) => (
          <ToolRecordErrorBoundary key={record.toolCallId}>
            <ToolRecord record={record} />
          </ToolRecordErrorBoundary>
        ))}
        {message.content && (
          <div className="text-sm leading-relaxed">
            <Markdown content={message.content} />
          </div>
        )}
      </>
    );
  };

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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
