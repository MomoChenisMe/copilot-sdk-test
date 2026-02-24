import { useQuery } from '@tanstack/react-query';
import { skillsApi, type SkillItem } from '../../lib/prompts-api';
import { queryKeys } from '../../lib/query-keys';

export function useSkillsQuery() {
  return useQuery<SkillItem[]>({
    queryKey: queryKeys.skills.all,
    queryFn: () => skillsApi.list().then((r) => r.skills),
    staleTime: Infinity,
  });
}
