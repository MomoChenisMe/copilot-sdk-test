import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiGet } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { useAppStore, type ModelInfo } from '../../store/index';

export function useModelsQuery() {
  const query = useQuery({
    queryKey: queryKeys.models.all,
    queryFn: () => apiGet<ModelInfo[]>('/api/copilot/models'),
    staleTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (!query.data) return;
    const saved = useAppStore.getState().lastSelectedModel;
    if (saved && !query.data.some((m) => m.id === saved)) {
      useAppStore.getState().setLastSelectedModel(query.data[0]?.id ?? '');
    }
  }, [query.data]);

  return query;
}
