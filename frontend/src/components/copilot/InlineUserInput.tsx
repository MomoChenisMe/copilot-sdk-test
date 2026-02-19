import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, Send } from 'lucide-react';

interface InlineUserInputProps {
  question: string;
  choices?: string[];
  allowFreeform?: boolean;
  multiSelect?: boolean;
  onSubmit: (answer: string, wasFreeform: boolean) => void;
}

export function InlineUserInput({
  question,
  choices,
  allowFreeform = true,
  multiSelect = false,
  onSubmit,
}: InlineUserInputProps) {
  const { t } = useTranslation();
  const [freeformText, setFreeformText] = useState('');
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());

  const handleRadioClick = (choice: string) => {
    onSubmit(choice, false);
  };

  const handleCheckboxToggle = (choice: string) => {
    setSelectedChoices((prev) => {
      const next = new Set(prev);
      if (next.has(choice)) {
        next.delete(choice);
      } else {
        next.add(choice);
      }
      return next;
    });
  };

  const handleMultiSubmit = () => {
    if (selectedChoices.size === 0) return;
    onSubmit(JSON.stringify([...selectedChoices]), false);
  };

  const handleFreeformSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = freeformText.trim();
    if (!trimmed) return;
    onSubmit(trimmed, true);
  };

  return (
    <div
      data-testid="inline-user-input"
      className="bg-bg-secondary border border-border rounded-xl p-4 my-3"
    >
      {/* Question header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-accent/10 shrink-0">
          <MessageCircleQuestion size={16} className="text-accent" />
        </div>
        <p className="text-sm text-text-primary leading-relaxed">{question}</p>
      </div>

      {/* Choices */}
      {choices && choices.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3 ml-9">
          {multiSelect
            ? choices.map((choice) => (
                <label
                  key={choice}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary hover:bg-bg-tertiary text-text-primary cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedChoices.has(choice)}
                    onChange={() => handleCheckboxToggle(choice)}
                    className="accent-accent"
                  />
                  {choice}
                </label>
              ))
            : choices.map((choice) => (
                <label
                  key={choice}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary hover:bg-bg-tertiary text-text-primary cursor-pointer transition-colors"
                  onClick={() => handleRadioClick(choice)}
                >
                  <input
                    type="radio"
                    name="user-input-choice"
                    className="accent-accent"
                    readOnly
                  />
                  {choice}
                </label>
              ))}
        </div>
      )}

      {/* Multi-select submit button */}
      {multiSelect && choices && choices.length > 0 && (
        <div className="ml-9 mb-3">
          <button
            data-testid="multi-submit-btn"
            type="button"
            onClick={handleMultiSubmit}
            disabled={selectedChoices.size === 0}
            className="px-4 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('userInput.submit')}
          </button>
        </div>
      )}

      {/* Freeform input */}
      {allowFreeform && (
        <form onSubmit={handleFreeformSubmit} className="flex gap-2 ml-9">
          <input
            type="text"
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            placeholder={t('userInput.typeResponse')}
            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!freeformText.trim()}
            className="px-2.5 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
}
