import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from '../shared/ToggleSwitch';

interface ToolConfig {
  skills?: boolean;
  selfControlTools?: boolean;
  memoryTools?: boolean;
  webSearchTool?: boolean;
  taskTools?: boolean;
  mcpTools?: boolean;
  disabledSkills?: string[];
  mcpServers?: Record<string, boolean>;
}

interface CronJobToolConfigProps {
  config: ToolConfig;
  onChange: (config: ToolConfig) => void;
}

const TOOL_OPTION_KEYS = [
  { key: 'skills' as const, labelKey: 'cron.tools.skills', descKey: 'cron.tools.skillsDesc' },
  { key: 'selfControlTools' as const, labelKey: 'cron.tools.selfControl', descKey: 'cron.tools.selfControlDesc' },
  { key: 'memoryTools' as const, labelKey: 'cron.tools.memory', descKey: 'cron.tools.memoryDesc' },
  { key: 'webSearchTool' as const, labelKey: 'cron.tools.webSearch', descKey: 'cron.tools.webSearchDesc' },
  { key: 'taskTools' as const, labelKey: 'cron.tools.taskTools', descKey: 'cron.tools.taskToolsDesc' },
  { key: 'mcpTools' as const, labelKey: 'cron.tools.mcpTools', descKey: 'cron.tools.mcpToolsDesc' },
];

export function CronJobToolConfig({ config, onChange }: CronJobToolConfigProps) {
  const { t } = useTranslation();

  const handleToggle = (key: keyof ToolConfig) => {
    onChange({ ...config, [key]: !config[key] });
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-text-secondary">{t('cron.toolConfig')}</label>
      <div className="flex flex-col gap-1">
        {TOOL_OPTION_KEYS.map(({ key, labelKey, descKey }) => (
          <div
            key={key}
            className="flex items-center gap-2 px-2 py-1.5 rounded bg-bg-secondary"
          >
            <ToggleSwitch
              checked={!!config[key]}
              onChange={() => handleToggle(key)}
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-text-primary">{t(labelKey)}</span>
              <span className="text-xs text-text-secondary ml-2">{t(descKey)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
