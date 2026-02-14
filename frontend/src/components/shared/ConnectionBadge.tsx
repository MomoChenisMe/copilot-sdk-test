import { useTranslation } from 'react-i18next';
import type { WsStatus } from '../../lib/ws-types';

interface ConnectionBadgeProps {
  status: WsStatus;
}

const statusConfig: Record<WsStatus, { color: string; labelKey: string }> = {
  connected: { color: 'bg-success', labelKey: 'connection.connected' },
  connecting: { color: 'bg-warning', labelKey: 'connection.connecting' },
  disconnected: { color: 'bg-error', labelKey: 'connection.disconnected' },
};

export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  const { t } = useTranslation();
  const { color, labelKey } = statusConfig[status];
  const label = t(labelKey);

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-text-muted hidden sm:inline">{label}</span>
    </div>
  );
}
