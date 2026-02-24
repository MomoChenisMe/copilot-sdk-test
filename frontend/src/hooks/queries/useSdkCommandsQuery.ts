import { useQuery } from '@tanstack/react-query';
import { copilotApi, type SdkCommand } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';

export function useSdkCommandsQuery() {
  return useQuery<SdkCommand[]>({
    queryKey: queryKeys.sdkCommands.all,
    queryFn: () => copilotApi.listCommands(),
    staleTime: Infinity,
  });
}
