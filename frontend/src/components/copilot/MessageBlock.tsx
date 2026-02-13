import type { Message } from '../../lib/api';
import { Markdown } from '../shared/Markdown';

interface MessageBlockProps {
  message: Message;
}

export function MessageBlock({ message }: MessageBlockProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`py-4 px-4 ${isUser ? 'bg-bg-primary' : 'bg-bg-secondary'}`}>
      <div className="max-w-3xl mx-auto">
        {/* Role label */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-semibold uppercase ${
              isUser ? 'text-accent' : 'text-success'
            }`}
          >
            {isUser ? 'You' : 'Assistant'}
          </span>
        </div>

        {/* Content */}
        {isUser ? (
          <p className="text-text-primary whitespace-pre-wrap">{message.content}</p>
        ) : (
          <Markdown content={message.content} />
        )}
      </div>
    </div>
  );
}
