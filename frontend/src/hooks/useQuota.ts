import { useEffect } from 'react';
import { apiGet } from '../lib/api';
import { useAppStore } from '../store/index';

const REFRESH_INTERVAL_MS = 30 * 1000; // 30 seconds

interface QuotaResponse {
  quota: {
    used: number;
    total: number;
    resetDate: string | null;
    unlimited: boolean;
    updatedAt: string;
  } | null;
}

function fetchAndSetQuota() {
  return apiGet<QuotaResponse>('/api/copilot/quota')
    .then((data) => {
      if (data.quota) {
        useAppStore.getState().setPremiumQuota({
          used: data.quota.used,
          total: data.quota.total,
          resetDate: data.quota.resetDate,
          unlimited: data.quota.unlimited,
        });
      }
    })
    .catch(() => {
      // Fetch failure — keep existing data
    });
}

export function useQuota() {
  useEffect(() => {
    fetchAndSetQuota();

    const interval = setInterval(fetchAndSetQuota, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
