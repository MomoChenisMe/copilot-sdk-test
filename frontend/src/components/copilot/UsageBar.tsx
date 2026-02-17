import { useTranslation } from 'react-i18next';

interface UsageBarProps {
  inputTokens: number;
  outputTokens: number;
  contextWindowUsed: number;
  contextWindowMax: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function UsageBar({
  inputTokens,
  outputTokens,
  contextWindowUsed,
  contextWindowMax,
}: UsageBarProps) {
  const { t } = useTranslation();
  const hasTokens = inputTokens > 0 || outputTokens > 0;
  const hasContext = contextWindowMax > 0;

  if (!hasTokens && !hasContext) return null;

  const pct = hasContext ? Math.round((contextWindowUsed / contextWindowMax) * 100) : 0;
  const barColor =
    pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-text-muted select-none">
      {hasTokens && (
        <span>
          {t('usage.tokens', { defaultValue: 'Tokens' })}:{' '}
          <span className="text-text-secondary">{formatNumber(inputTokens)}</span>
          {' / '}
          <span className="text-text-secondary">{formatNumber(outputTokens)}</span>
        </span>
      )}
      {hasContext && (
        <span className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="shrink-0">{t('usage.context', { defaultValue: 'Context' })}</span>
          <span className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
            <span
              data-testid="context-bar"
              className={`block h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </span>
          <span className="shrink-0 tabular-nums">{pct}%</span>
        </span>
      )}
    </div>
  );
}
