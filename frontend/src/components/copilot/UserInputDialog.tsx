import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, Send, SkipForward, AlertTriangle, X } from 'lucide-react';

interface UserInputDialogProps {
  question: string;
  choices?: string[];
  allowFreeform?: boolean;
  timedOut?: boolean;
  onSubmit: (answer: string, wasFreeform: boolean) => void;
  onSkip?: () => void;
  onDismissTimeout?: () => void;
}

export function UserInputDialog({ question, choices, allowFreeform = true, timedOut, onSubmit, onSkip, onDismissTimeout }: UserInputDialogProps) {
  const { t } = useTranslation();
  const [freeformText, setFreeformText] = useState('');

  const handleChoiceClick = (choice: string) => {
    onSubmit(choice, false);
  };

  const handleFreeformSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = freeformText.trim();
    if (!trimmed) return;
    onSubmit(trimmed, true);
  };

  return (
    <div
      data-testid="user-input-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-md mx-4 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] p-6">
        {/* Timeout banner */}
        {timedOut && (
          <div data-testid="timeout-banner" className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
            <p className="text-xs text-yellow-600 dark:text-yellow-400 flex-1">{t('userInput.timedOut')}</p>
            {onDismissTimeout && (
              <button
                data-testid="dismiss-timeout"
                type="button"
                onClick={onDismissTimeout}
                className="p-1 rounded hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Question */}
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 p-2 rounded-lg bg-accent/10">
            <MessageCircleQuestion size={20} className="text-accent" />
          </div>
          <p className="text-sm text-text-primary leading-relaxed pt-1.5">{question}</p>
        </div>

        {/* Choices — hidden when timed out */}
        {!timedOut && choices && choices.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {choices.map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => handleChoiceClick(choice)}
                className="w-full text-left px-4 py-2.5 text-sm rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary transition-colors"
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* Freeform input — hidden when timed out */}
        {!timedOut && allowFreeform && (
          <form onSubmit={handleFreeformSubmit} className="flex gap-2">
            <input
              type="text"
              value={freeformText}
              onChange={(e) => setFreeformText(e.target.value)}
              placeholder={t('userInput.typeResponse')}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
            <button
              type="submit"
              disabled={!freeformText.trim()}
              className="px-3 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        )}

        {/* Skip button — shown when not timed out and onSkip is provided */}
        {!timedOut && onSkip && (
          <button
            data-testid="skip-button"
            type="button"
            onClick={onSkip}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-text-tertiary hover:text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <SkipForward size={12} />
            {t('userInput.skip')}
          </button>
        )}
      </div>
    </div>
  );
}
