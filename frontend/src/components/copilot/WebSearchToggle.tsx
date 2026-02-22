import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

interface WebSearchToggleProps {
  forced: boolean;
  onToggle: (forced: boolean) => void;
  disabled?: boolean;
}

export default function WebSearchToggle({ forced, onToggle, disabled }: WebSearchToggleProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!forced)}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-colors ${
        forced
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-text-muted hover:bg-bg-tertiary'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={t('webSearch.toggleTitle')}
    >
      <Search size={12} />
    </button>
  );
}
