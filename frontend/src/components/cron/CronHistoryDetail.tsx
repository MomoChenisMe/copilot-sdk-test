import { useTranslation } from 'react-i18next';
import type { CronHistory } from '../../lib/api';

interface CronHistoryDetailProps {
  history: CronHistory;
}

export function CronHistoryDetail({ history }: CronHistoryDetailProps) {
  const { t } = useTranslation();
  const usage = history.usage;
  const toolRecords = history.toolRecords as Array<{ toolCallId: string; toolName: string; status: string; result?: string; error?: string }> | null;
  const turnSegments = history.turnSegments as Array<{ type: string; content?: string; toolName?: string }> | null;

  return (
    <div className="px-3 pb-3 border-t border-border-subtle flex flex-col gap-2">
      {/* Prompt */}
      {history.prompt && (
        <div>
          <h4 className="text-xs font-medium text-text-secondary mt-2 mb-1">{t('cron.prompt')}</h4>
          <div className="text-sm text-text-primary px-2 py-1 rounded bg-bg-secondary">{history.prompt}</div>
        </div>
      )}

      {/* Content */}
      {history.content && (
        <div>
          <h4 className="text-xs font-medium text-text-secondary mt-1 mb-1">{t('cron.response')}</h4>
          <div className="text-sm text-text-primary px-2 py-1 rounded bg-bg-secondary whitespace-pre-wrap max-h-64 overflow-y-auto">
            {history.content}
          </div>
        </div>
      )}

      {/* Tool Records */}
      {toolRecords && toolRecords.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-text-secondary mt-1 mb-1">
            {t('cron.toolCalls')} ({toolRecords.length})
          </h4>
          <div className="flex flex-col gap-1">
            {toolRecords.map((tr, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-bg-secondary">
                <span
                  className={`text-xs font-medium ${tr.status === 'success' ? 'text-emerald-500' : 'text-error'}`}
                >
                  {tr.status}
                </span>
                <span className="text-xs font-mono text-text-primary">{tr.toolName}</span>
                <span className="text-xs text-text-secondary truncate flex-1">
                  {tr.status === 'success' ? tr.result?.slice(0, 80) : tr.error?.slice(0, 80)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {history.reasoning && (
        <div>
          <h4 className="text-xs font-medium text-text-secondary mt-1 mb-1">{t('cron.reasoning')}</h4>
          <div className="text-xs text-text-secondary px-2 py-1 rounded bg-bg-secondary italic max-h-32 overflow-y-auto">
            {history.reasoning}
          </div>
        </div>
      )}

      {/* Usage */}
      {usage && (
        <div>
          <h4 className="text-xs font-medium text-text-secondary mt-1 mb-1">{t('cron.tokenUsage')}</h4>
          <div className="flex gap-4 text-xs text-text-secondary px-2">
            <span>{t('cron.inputTokens')}: <span className="text-text-primary font-medium">{usage.inputTokens.toLocaleString()}</span></span>
            <span>{t('cron.outputTokens')}: <span className="text-text-primary font-medium">{usage.outputTokens.toLocaleString()}</span></span>
            {usage.cacheReadTokens > 0 && (
              <span>{t('cron.cacheRead')}: <span className="text-text-primary font-medium">{usage.cacheReadTokens.toLocaleString()}</span></span>
            )}
          </div>
        </div>
      )}

      {/* Turn Segments */}
      {turnSegments && turnSegments.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-text-secondary hover:text-text-primary mt-1">
            {t('cron.turnSegments')} ({turnSegments.length})
          </summary>
          <div className="mt-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
            {turnSegments.map((seg, i) => (
              <div key={i} className="flex gap-2 px-2 py-1 rounded bg-bg-secondary">
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded shrink-0">
                  {seg.type}
                </span>
                <span className="text-text-primary truncate">
                  {seg.content?.slice(0, 100) || seg.toolName || ''}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Timing */}
      <div className="flex gap-4 text-xs text-text-secondary mt-1 px-2">
        <span>{t('cron.started')}: {new Date(history.startedAt).toLocaleString()}</span>
        {history.finishedAt && (
          <span>{t('cron.finished')}: {new Date(history.finishedAt).toLocaleString()}</span>
        )}
        {history.finishedAt && (
          <span>
            {t('cron.duration')}: {((new Date(history.finishedAt).getTime() - new Date(history.startedAt).getTime()) / 1000).toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
}
