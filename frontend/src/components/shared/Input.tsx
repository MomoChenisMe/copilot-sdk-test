import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square } from 'lucide-react';

interface InputProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function Input({ onSend, onAbort, isStreaming, disabled }: InputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
  }, [text, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative bg-bg-elevated border border-border rounded-2xl shadow-[var(--shadow-input)] transition-shadow focus-within:border-border-focus focus-within:shadow-[var(--shadow-md)]">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('input.placeholder')}
        disabled={disabled}
        rows={1}
        className="w-full resize-none bg-transparent text-text-primary px-4 pt-3 pb-10 text-sm placeholder:text-text-muted focus:outline-none overflow-y-auto"
        style={{ maxHeight: '200px' }}
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {isStreaming ? (
          <button
            onClick={onAbort}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-error hover:text-white transition-colors text-text-secondary"
            aria-label={t('input.stop')}
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className="p-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('input.send')}
          >
            <ArrowUp size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
