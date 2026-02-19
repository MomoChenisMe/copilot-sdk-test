import { useEffect } from 'react';
import { apiGet } from '../lib/api';
import { useAppStore, type ModelInfo } from '../store/index';

export function useModels() {
  const models = useAppStore((s) => s.models);
  const setModels = useAppStore((s) => s.setModels);
  const setModelsLoading = useAppStore((s) => s.setModelsLoading);
  const setModelsError = useAppStore((s) => s.setModelsError);

  useEffect(() => {
    if (models.length > 0) return;

    setModelsLoading(true);
    setModelsError(null);

    apiGet<ModelInfo[]>('/api/copilot/models')
      .then((data) => {
        setModels(data);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
