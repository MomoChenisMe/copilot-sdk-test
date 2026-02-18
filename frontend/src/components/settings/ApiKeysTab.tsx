import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { configApi } from '../../lib/api';

export function ApiKeysTab() {
  const { t } = useTranslation();

  const [braveKey, setBraveKey] = useState('');
  const [braveHasKey, setBraveHasKey] = useState(false);
  const [braveMasked, setBraveMasked] = useState('');
  const [braveToast, setBraveToast] = useState<string | null>(null);

  useEffect(() => {
    configApi.getBraveApiKey().then((res) => {
      setBraveHasKey(res.hasKey);
      setBraveMasked(res.maskedKey);
    }).catch(() => {});
  }, []);

  const handleSaveBraveKey = useCallback(async () => {
    try {
      await configApi.putBraveApiKey(braveKey);
      setBraveHasKey(!!braveKey);
      setBraveMasked(braveKey ? braveKey.slice(0, 4) + '****' : '');
      setBraveKey('');
      setBraveToast(t('settings.toast.saved', 'Saved'));
      setTimeout(() => setBraveToast(null), 2000);
    } catch {
      setBraveToast(t('settings.toast.saveFailed', 'Save failed'));
      setTimeout(() => setBraveToast(null), 2000);
    }
  }, [braveKey, t]);

  const handleClearBraveKey = useCallback(async () => {
    try {
      await configApi.putBraveApiKey('');
      setBraveHasKey(false);
      setBraveMasked('');
      setBraveKey('');
      setBraveToast(t('settings.toast.saved', 'Saved'));
      setTimeout(() => setBraveToast(null), 2000);
    } catch {
      setBraveToast(t('settings.toast.saveFailed', 'Save failed'));
      setTimeout(() => setBraveToast(null), 2000);
    }
  }, [t]);

  return (
    <div className="flex flex-col gap-4">
      {/* Brave Search API Key */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">
          {t('settings.general.braveApiKey', 'Brave Search API Key')}
        </h3>
        <p className="text-xs text-text-muted mb-2">
          {t('settings.general.braveApiKeyDesc', 'Enable web search by providing a Brave Search API key. Get one at search.brave.com.')}
        </p>
        {braveHasKey && (
          <div className="flex items-center gap-2 mb-2">
            <span data-testid="brave-masked-key" className="text-xs font-mono text-text-secondary bg-bg-secondary px-2 py-1 rounded">
              {braveMasked}
            </span>
            <button
              data-testid="brave-clear-key"
              onClick={handleClearBraveKey}
              className="text-xs text-error hover:underline"
            >
              {t('settings.general.clearKey', 'Clear')}
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            data-testid="brave-api-key-input"
            type="password"
            value={braveKey}
            onChange={(e) => setBraveKey(e.target.value)}
            placeholder={braveHasKey ? t('settings.general.braveKeyReplace', 'Enter new key to replace...') : t('settings.general.braveKeyPlaceholder', 'BSA_...')}
            className="flex-1 p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          />
          <button
            data-testid="brave-save-key"
            onClick={handleSaveBraveKey}
            disabled={!braveKey.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('settings.save', 'Save')}
          </button>
        </div>
        {braveToast && <span className="text-xs text-text-secondary mt-1">{braveToast}</span>}
      </section>
    </div>
  );
}
