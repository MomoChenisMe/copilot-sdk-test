import { useTranslation } from 'react-i18next';
import { BookOpen, X } from 'lucide-react';

interface OpenSpecHeaderProps {
  onClose: () => void;
}

export function OpenSpecHeader({ onClose }: OpenSpecHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
      <BookOpen size={18} className="text-accent shrink-0" />
      <h2 className="text-sm font-semibold text-text-primary flex-1">
        {t('openspecPanel.title', 'OpenSpec')}
      </h2>
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
