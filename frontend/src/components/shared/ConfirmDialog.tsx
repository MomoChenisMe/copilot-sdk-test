import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  /** If set, the user must type this exact text to enable the confirm button (double-check). */
  requiredInput?: string;
  /** Placeholder text for the required input field. */
  inputPlaceholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Use destructive (red) styling for the confirm button. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  requiredInput,
  inputPlaceholder,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (open) {
      setInputValue('');
      // Focus input if requiredInput mode
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Escape key to cancel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onCancel();
    },
    [onCancel],
  );

  const canConfirm = requiredInput ? inputValue === requiredInput : true;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (canConfirm && !loading) onConfirm();
    },
    [canConfirm, loading, onConfirm],
  );

  if (!open) return null;

  const confirmBtnBase =
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40';
  const confirmBtnStyle = destructive
    ? `${confirmBtnBase} bg-red-500 text-white hover:bg-red-600 disabled:hover:bg-red-500`
    : `${confirmBtnBase} bg-accent text-white hover:bg-accent/90 disabled:hover:bg-accent`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm mx-4 rounded-xl border border-border bg-bg-primary shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          {destructive && (
            <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Required input */}
        {requiredInput && (
          <div className="px-5 pb-3">
            <label className="block text-xs text-text-muted mb-1.5">
              {inputPlaceholder || t('common.typeToConfirm', `Type "${requiredInput}" to confirm`)}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-secondary text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder={requiredInput}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-text-secondary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            {cancelLabel || t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={!canConfirm || loading}
            className={confirmBtnStyle}
          >
            {loading
              ? t('common.processing', 'Processing...')
              : confirmLabel || t('common.confirm', 'Confirm')}
          </button>
        </div>
      </form>
    </div>
  );
}
