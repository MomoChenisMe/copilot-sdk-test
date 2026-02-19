import { useEffect, useCallback } from 'react';
import { apiGet } from '../lib/api';
import { useAppStore, type ModelInfo } from '../store/index';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

function fetchAndSetModels() {
  const { setModels, setModelsLoading, setModelsError, setModelsLastFetched } = useAppStore.getState();

  setModelsLoading(true);
  setModelsError(null);

  return apiGet<ModelInfo[]>('/api/copilot/models')
    .then((data) => {
      setModels(data);
      setModelsLastFetched(Date.now());
      // Validate saved model still exists in the fetched model list
      const saved = useAppStore.getState().lastSelectedModel;
      if (saved && !data.some((m) => m.id === saved)) {
        useAppStore.getState().setLastSelectedModel(data[0]?.id ?? '');
      }
      setModelsLoading(false);
    })
    .catch((err: Error) => {
      setModelsError(err.message);
      setModelsLoading(false);
    });
}

export function useModels() {
  const models = useAppStore((s) => s.models);
  const modelsLastFetched = useAppStore((s) => s.modelsLastFetched);

  useEffect(() => {
    const isStale = Date.now() - modelsLastFetched > REFRESH_INTERVAL_MS;
    if (models.length > 0 && !isStale) return;

    fetchAndSetModels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshModels = useCallback(() => {
    return fetchAndSetModels();
  }, []);

  return { refreshModels };
}
