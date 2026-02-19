import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../../lib/api';
import { ArrowUpCircle, X } from 'lucide-react';

interface VersionInfo {
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
}

export function SdkUpdateBanner() {
  const { t } = useTranslation();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    apiGet<VersionInfo>('/api/copilot/sdk-version')
      .then(setVersionInfo)
      .catch(() => {});
  }, []);

  if (!versionInfo?.updateAvailable || dismissed) return null;

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await apiPost('/api/copilot/sdk-update');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      data-testid="sdk-update-banner"
      className="flex items-center gap-3 px-4 py-2 bg-accent/10 border-b border-accent/20 text-sm"
    >
      <ArrowUpCircle size={16} className="shrink-0 text-accent" />
      <span className="flex-1">
        SDK update available: <strong>{versionInfo.currentVersion}</strong> → <strong>{versionInfo.latestVersion}</strong>
      </span>
      <button
        data-testid="sdk-update-btn"
        onClick={handleUpdate}
        disabled={updating}
        className="px-3 py-1 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50"
      >
        {updating ? '...' : 'Update'}
      </button>
      <button
        data-testid="sdk-update-dismiss"
        onClick={() => setDismissed(true)}
        className="text-text-muted hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}
