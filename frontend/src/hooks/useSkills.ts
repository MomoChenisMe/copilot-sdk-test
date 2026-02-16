import { useEffect } from 'react';
import { useAppStore } from '../store';
import { skillsApi } from '../lib/prompts-api';

export function useSkills() {
  const skillsLoaded = useAppStore((s) => s.skillsLoaded);
  const setSkills = useAppStore((s) => s.setSkills);
  const setSkillsLoaded = useAppStore((s) => s.setSkillsLoaded);

  useEffect(() => {
    if (skillsLoaded) return;

    let cancelled = false;

    skillsApi
      .list()
      .then(({ skills }) => {
        if (!cancelled) {
          setSkills(skills);
          setSkillsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSkillsLoaded(true); // prevent infinite retries
        }
      });

    return () => {
      cancelled = true;
    };
  }, [skillsLoaded, setSkills, setSkillsLoaded]);
}
