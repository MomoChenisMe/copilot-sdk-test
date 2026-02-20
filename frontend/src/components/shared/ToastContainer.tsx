import { useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAppStore } from '../../store';

const TOAST_DURATION = 5000;

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
};

const iconColorMap = {
  success: 'text-green-500 dark:text-green-400',
  error: 'text-red-500 dark:text-red-400',
  info: 'text-blue-500 dark:text-blue-400',
};

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  const handleRemove = useCallback(
    (id: string) => removeToast(id),
    [removeToast],
  );

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <ToastItem
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClick={toast.onClick}
            onRemove={handleRemove}
          />
        );
      })}
    </div>
  );
}

function ToastItem({
  id,
  type,
  title,
  message,
  onClick,
  onRemove,
}: {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  onClick?: () => void;
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const Icon = iconMap[type];

  return (
    <div
      className={`flex items-start gap-3 p-3 border rounded-lg shadow-lg animate-in slide-in-from-right ${colorMap[type]} ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColorMap[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {message && <p className="text-xs mt-0.5 opacity-80">{message}</p>}
      </div>
      <button
        className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(id);
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
