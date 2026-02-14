import type { Message } from '../../lib/api';
import { Markdown } from '../shared/Markdown';

interface MessageBlockProps {
  message: Message;
}

export function MessageBlock({ message }: MessageBlockProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          data-testid="user-bubble"
          className="max-w-[80%] bg-user-message-bg rounded-2xl rounded-br-md px-4 py-3"
        >
          <p className="text-text-primary whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="mb-4">
      <span className="text-xs font-semibold uppercase text-text-muted mb-1 block">
        Assistant
      </span>
      <div className="prose-container">
        <Markdown content={message.content} />
      </div>
    </div>
  );
}
