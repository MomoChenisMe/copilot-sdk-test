import { useQuery } from '@tanstack/react-query';
import { settingsApi, type AppSettings } from '../../lib/settings-api';
import { queryKeys } from '../../lib/query-keys';

export function useSettingsQuery() {
  return useQuery<AppSettings>({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsApi.get(),
    staleTime: 10 * 60 * 1000,
  });
}
