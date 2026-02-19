import { useTranslation } from 'react-i18next';
import { Lightbulb, Zap } from 'lucide-react';

interface PlanActToggleProps {
  planMode: boolean;
  onToggle: (planMode: boolean) => void;
  disabled?: boolean;
}

export default function PlanActToggle({ planMode, onToggle, disabled }: PlanActToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(true)}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${
          planMode
            ? 'border-accent text-accent bg-accent/10'
            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Lightbulb size={12} />
        {t('planMode.plan')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(false)}
        className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${
          !planMode
            ? 'border-accent text-accent bg-accent/10'
            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Zap size={12} />
        {t('planMode.act')}
      </button>
    </div>
  );
}
