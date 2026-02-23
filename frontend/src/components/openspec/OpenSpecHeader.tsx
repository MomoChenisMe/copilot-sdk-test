import { useTranslation } from 'react-i18next';
import { BookOpen, RefreshCw, X } from 'lucide-react';

interface OpenSpecHeaderProps {
  onClose: () => void;
  onRefresh: () => void;
  loading: boolean;
}

export function OpenSpecHeader({ onClose, onRefresh, loading }: OpenSpecHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
      <BookOpen size={18} className="text-accent shrink-0" />
      <h2 className="text-sm font-semibold text-text-primary flex-1">
        {t('openspecPanel.title', 'OpenSpec')}
      </h2>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-40 transition-colors"
        aria-label={t('openspecPanel.refresh', 'Refresh')}
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      </button>
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        aria-label={t('openspecPanel.close', 'Close')}
      >
        <X size={16} />
      </button>
    </div>
  );
}
