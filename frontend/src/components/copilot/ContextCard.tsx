import { useTranslation } from 'react-i18next';

interface ContextLayer {
  name: string;
  active: boolean;
  charCount: number;
}

interface SkillInfo {
  name: string;
  description: string;
  enabled: boolean;
}

interface McpServer {
  name: string;
  transport: string;
  toolCount: number;
}

export interface ContextData {
  systemPrompt: {
    layers: ContextLayer[];
    totalChars: number;
    maxChars: number;
  };
  skills: {
    builtin: SkillInfo[];
    user: SkillInfo[];
  };
  mcp: {
    servers: McpServer[];
  };
  model: string | null;
  sdkVersion: string | null;
}

function barColor(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function dotColor(category: string): string {
  switch (category) {
    case 'prompt': return 'bg-blue-500';
    case 'skills': return 'bg-purple-500';
    case 'mcp': return 'bg-emerald-500';
    default: return 'bg-gray-500';
  }
}

export function ContextCard({ data, currentModel }: { data: ContextData; currentModel?: string }) {
  const { t } = useTranslation();
  const model = currentModel || data.model || 'unknown';
  const totalTokens = Math.ceil(data.systemPrompt.totalChars / 4);
  const maxTokens = Math.ceil(data.systemPrompt.maxChars / 4);
  const usagePct = data.systemPrompt.maxChars > 0
    ? Math.round((data.systemPrompt.totalChars / data.systemPrompt.maxChars) * 100)
    : 0;

  const totalSkills = data.skills.builtin.length + data.skills.user.length;
  const enabledSkills = [...data.skills.builtin, ...data.skills.user].filter((s) => s.enabled).length;

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4 my-2 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-text-primary font-medium">{model}</span>
        <span className="text-text-muted text-xs">
          {totalTokens.toLocaleString()}/{maxTokens.toLocaleString()} tokens ({usagePct}%)
        </span>
        <span className="text-[10px] text-text-muted italic">{t('context.estimated', 'Estimated')}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${barColor(usagePct)}`}
          style={{ width: `${Math.min(usagePct, 100)}%` }}
        />
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-3">
        {/* System Prompt */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColor('prompt')}`} />
            <span className="font-medium text-text-primary">{t('context.systemPromptLabel', 'System Prompt')}</span>
            <span className="text-xs text-text-muted">
              {data.systemPrompt.totalChars.toLocaleString()} chars
            </span>
          </div>
          <div className="ml-4 flex flex-col gap-0.5">
            {data.systemPrompt.layers.map((layer, i) => {
              const isLast = i === data.systemPrompt.layers.length - 1;
              const prefix = isLast ? '└' : '├';
              return (
                <div key={layer.name} className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="text-text-muted font-mono">{prefix}</span>
                  <span className="truncate">{layer.name}</span>
                  <span className="tabular-nums">{layer.charCount.toLocaleString()}</span>
                  <span className={layer.active ? 'text-emerald-500' : 'text-text-muted'}>
                    {layer.active ? t('context.active', 'active') : t('context.inactive', 'inactive')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Skills */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColor('skills')}`} />
            <span className="font-medium text-text-primary">{t('context.skillsLabel', 'Skills')}</span>
            <span className="text-xs text-text-muted">
              {enabledSkills}/{totalSkills} {t('context.enabled', 'enabled')}
            </span>
          </div>
          <div className="ml-4 flex flex-col gap-0.5 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-mono">├</span>
              <span>{t('slashCommand.systemSkills', 'System Skills')}: {data.skills.builtin.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-mono">└</span>
              <span>{t('slashCommand.userSkills', 'User Skills')}: {data.skills.user.length}</span>
            </div>
          </div>
        </div>

        {/* MCP Servers */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${dotColor('mcp')}`} />
            <span className="font-medium text-text-primary">{t('context.mcpLabel', 'MCP Servers')}</span>
            <span className="text-xs text-text-muted">{data.mcp.servers.length}</span>
          </div>
          {data.mcp.servers.length > 0 && (
            <div className="ml-4 flex flex-col gap-0.5">
              {data.mcp.servers.map((server, i) => {
                const isLast = i === data.mcp.servers.length - 1;
                const prefix = isLast ? '└' : '├';
                return (
                  <div key={server.name} className="flex items-center gap-2 text-xs text-text-secondary">
                    <span className="text-text-muted font-mono">{prefix}</span>
                    <span className="truncate">{server.name}</span>
                    <span className="text-text-muted">({server.transport})</span>
                    <span className="tabular-nums">{server.toolCount} tools</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-border-subtle text-xs text-text-muted">
        SDK {data.sdkVersion || 'unknown'}
      </div>
    </div>
  );
}
