import { useEffect } from 'react';
import { useAppStore } from '../store';
import { skillsApi } from '../lib/prompts-api';
import { copilotApi } from '../lib/api';

export function useSkills() {
  const skillsLoaded = useAppStore((s) => s.skillsLoaded);
  const setSkills = useAppStore((s) => s.setSkills);
  const setSkillsLoaded = useAppStore((s) => s.setSkillsLoaded);

  const sdkCommandsLoaded = useAppStore((s) => s.sdkCommandsLoaded);
  const setSdkCommands = useAppStore((s) => s.setSdkCommands);
  const setSdkCommandsLoaded = useAppStore((s) => s.setSdkCommandsLoaded);

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

  useEffect(() => {
    if (sdkCommandsLoaded) return;

    let cancelled = false;

    copilotApi
      .listCommands()
      .then((commands) => {
        if (!cancelled) {
          setSdkCommands(commands);
          setSdkCommandsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSdkCommandsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sdkCommandsLoaded, setSdkCommands, setSdkCommandsLoaded]);
}
