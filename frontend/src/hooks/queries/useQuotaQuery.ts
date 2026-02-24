import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';

interface QuotaSnapshot {
  used: number;
  total: number;
  resetDate: string | null;
  unlimited: boolean;
}

interface QuotaResponse {
  quota?: {
    used: number;
    total: number;
    resetDate: string | null;
    unlimited: boolean;
  };
}

export function useQuotaQuery() {
  return useQuery<QuotaSnapshot | null>({
    queryKey: queryKeys.quota.all,
    queryFn: async () => {
      const data = await apiGet<QuotaResponse>('/api/copilot/quota');
      if (data.quota) {
        return {
          used: data.quota.used,
          total: data.quota.total,
          resetDate: data.quota.resetDate,
          unlimited: data.quota.unlimited,
        };
      }
      return null;
    },
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });
}
