import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

interface OpenSpecSettingsProps {
  onDeleteOpenspec: () => void;
  deleting: boolean;
}

export function OpenSpecSettings({ onDeleteOpenspec, deleting }: OpenSpecSettingsProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 space-y-4">
      {/* Danger zone — Delete OpenSpec */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-red-400">
              {t('openspecPanel.dangerZone', 'Danger Zone')}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {t('openspecPanel.deleteDesc', 'Permanently delete the openspec folder and all its contents.')}
            </p>
          </div>
          <button
            data-testid="openspec-delete-button"
            onClick={onDeleteOpenspec}
            disabled={deleting}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/10 disabled:opacity-40 transition-colors"
          >
            <Trash2 size={12} />
            {deleting
              ? t('openspecPanel.deleting', 'Deleting...')
              : t('openspecPanel.deleteFolder', 'Delete OpenSpec')}
          </button>
        </div>
      </div>
    </div>
  );
}
