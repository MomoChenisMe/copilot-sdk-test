import { useState } from 'react';
import { MessageCircleQuestion, Send } from 'lucide-react';

interface UserInputDialogProps {
  question: string;
  choices?: string[];
  allowFreeform?: boolean;
  onSubmit: (answer: string, wasFreeform: boolean) => void;
}

export function UserInputDialog({ question, choices, allowFreeform = true, onSubmit }: UserInputDialogProps) {
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
        {/* Question */}
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-0.5 p-2 rounded-lg bg-accent/10">
            <MessageCircleQuestion size={20} className="text-accent" />
          </div>
          <p className="text-sm text-text-primary leading-relaxed pt-1.5">{question}</p>
        </div>

        {/* Choices */}
        {choices && choices.length > 0 && (
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

        {/* Freeform input */}
        {allowFreeform && (
          <form onSubmit={handleFreeformSubmit} className="flex gap-2">
            <input
              type="text"
              value={freeformText}
              onChange={(e) => setFreeformText(e.target.value)}
              placeholder="Type your response..."
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
      </div>
    </div>
  );
}
