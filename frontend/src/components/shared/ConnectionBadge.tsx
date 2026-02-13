import type { WsStatus } from '../../lib/ws-types';

interface ConnectionBadgeProps {
  status: WsStatus;
}

const statusConfig: Record<WsStatus, { color: string; label: string }> = {
  connected: { color: 'bg-success', label: '已連線' },
  connecting: { color: 'bg-warning', label: '連線中' },
  disconnected: { color: 'bg-error', label: '已斷線' },
};

export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  const { color, label } = statusConfig[status];

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-text-muted hidden sm:inline">{label}</span>
    </div>
  );
}
