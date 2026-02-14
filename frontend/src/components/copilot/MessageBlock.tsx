import { useTranslation } from 'react-i18next';
import type { Message } from '../../lib/api';
import { Markdown } from '../shared/Markdown';
import { Sparkles } from 'lucide-react';

interface MessageBlockProps {
  message: Message;
}

export function MessageBlock({ message }: MessageBlockProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          data-testid="user-bubble"
          className="max-w-[80%] bg-accent/10 rounded-2xl rounded-br-md px-4 py-3"
        >
          <p className="text-text-primary whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold uppercase text-text-muted">
          {t('chat.assistant')}
        </span>
      </div>
      <div className="pl-8 prose-container">
        <Markdown content={message.content} />
      </div>
    </div>
  );
}
