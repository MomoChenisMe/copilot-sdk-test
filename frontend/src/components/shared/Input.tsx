import { useState, useRef, useCallback, useEffect } from 'react';

interface InputProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function Input({ onSend, onAbort, isStreaming, disabled }: InputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const maxHeight = window.innerHeight / 3;
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
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
    <div className="flex items-end gap-2 p-3 bg-bg-secondary border-t border-border">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Send a message..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-bg-input text-text-primary px-3 py-2 rounded border border-border text-sm placeholder:text-text-muted focus:outline-none focus:border-accent overflow-y-auto"
        style={{ maxHeight: `${window.innerHeight / 3}px` }}
      />
      {isStreaming ? (
        <button
          onClick={onAbort}
          className="px-4 py-2 bg-error text-white rounded text-sm font-medium hover:bg-red-600 transition-colors shrink-0"
        >
          Stop
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="px-4 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          Send
        </button>
      )}
    </div>
  );
}
