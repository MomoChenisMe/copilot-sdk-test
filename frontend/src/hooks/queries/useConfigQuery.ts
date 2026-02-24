import { useQuery } from '@tanstack/react-query';
import { configApi } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';

export function useBraveApiKeyQuery() {
  return useQuery({
    queryKey: queryKeys.config.braveApiKey,
    queryFn: () => configApi.getBraveApiKey(),
    staleTime: 10 * 60 * 1000,
  });
}
