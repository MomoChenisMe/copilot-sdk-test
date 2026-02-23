import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Tooltip } from '../shared/Tooltip';

interface WebSearchToggleProps {
  forced: boolean;
  onToggle: (forced: boolean) => void;
  disabled?: boolean;
}

export default function WebSearchToggle({ forced, onToggle, disabled }: WebSearchToggleProps) {
  const { t } = useTranslation();
  return (
    <Tooltip label={t('webSearch.toggleTitle')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(!forced)}
        className={`p-1.5 rounded-lg transition-colors ${
          forced
            ? 'text-accent'
            : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Search size={14} />
      </button>
    </Tooltip>
  );
}
