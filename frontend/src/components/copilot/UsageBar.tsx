import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UsageBarProps {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  contextWindowUsed: number;
  contextWindowMax: number;
  model: string | null;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function contextBarColor(pct: number): string {
  if (pct > 80) return 'bg-red-500';
  if (pct > 50) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function UsageBar({
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheWriteTokens,
  contextWindowUsed,
  contextWindowMax,
  model,
}: UsageBarProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const hasTokens = inputTokens > 0 || outputTokens > 0;
  const hasContext = contextWindowMax > 0;

  if (!hasTokens && !hasContext) return null;

  const totalTokens = inputTokens + outputTokens;
  const contextPct = hasContext ? Math.round((contextWindowUsed / contextWindowMax) * 100) : 0;

  return (
    <div className="px-3 py-1.5 text-[10px] text-text-muted select-none">
      {/* Collapsed view */}
      <button
        data-testid="usage-toggle"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-3 w-full text-left"
      >
        {hasTokens && (
          <span className="shrink-0">
            {formatNumber(totalTokens)} {t('usage.tokens', { defaultValue: 'tokens' })}
          </span>
        )}
        {hasContext && (
          <span className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
              <span
                data-testid="context-bar"
                className={`block h-full rounded-full transition-all ${contextBarColor(contextPct)}`}
                style={{ width: `${Math.min(contextPct, 100)}%` }}
              />
            </span>
            <span className="shrink-0 tabular-nums">{contextPct}%</span>
          </span>
        )}
        <span className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/* Expanded view */}
      {expanded && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border-subtle pt-2">
          {/* Token breakdown */}
          {hasTokens && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>{t('usage.input', { defaultValue: 'Input' })}</span>
              <span className="text-text-secondary text-right tabular-nums">{formatNumber(inputTokens)}</span>
              <span>{t('usage.output', { defaultValue: 'Output' })}</span>
              <span className="text-text-secondary text-right tabular-nums">{formatNumber(outputTokens)}</span>
              {cacheReadTokens > 0 && (
                <>
                  <span>{t('usage.cacheRead', { defaultValue: 'Cache Read' })}</span>
                  <span className="text-text-secondary text-right tabular-nums">{formatNumber(cacheReadTokens)}</span>
                </>
              )}
              {cacheWriteTokens > 0 && (
                <>
                  <span>{t('usage.cacheWrite', { defaultValue: 'Cache Write' })}</span>
                  <span className="text-text-secondary text-right tabular-nums">{formatNumber(cacheWriteTokens)}</span>
                </>
              )}
            </div>
          )}

          {/* Context Window */}
          {hasContext && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span>{t('usage.contextWindow', { defaultValue: 'Context Window' })}</span>
                <span className="text-text-secondary tabular-nums">{contextPct}%</span>
              </div>
              <span className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                <span
                  className={`block h-full rounded-full transition-all ${contextBarColor(contextPct)}`}
                  style={{ width: `${Math.min(contextPct, 100)}%` }}
                />
              </span>
            </div>
          )}

          {/* Model */}
          {model && (
            <div className="flex items-center justify-between">
              <span>{t('usage.model', { defaultValue: 'Model' })}</span>
              <span className="text-text-secondary font-mono">{model}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
