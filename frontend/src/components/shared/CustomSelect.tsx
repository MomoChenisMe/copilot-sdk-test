import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  /** Optional right-side badge text */
  badge?: string;
  /** Optional badge color class (e.g. 'text-green-500') */
  badgeColor?: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Optional header text shown at top of dropdown */
  header?: string;
  placeholder?: string;
}

export function CustomSelect({ value, options, onChange, header, placeholder }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary hover:bg-bg-tertiary transition-colors"
      >
        <span className="truncate">{selected?.label || placeholder || ''}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selected?.badge && (
            <span className={`text-xs font-medium ${selected.badgeColor || 'text-text-muted'}`}>
              {selected.badge}
            </span>
          )}
          <ChevronDown size={14} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50">
          {header && (
            <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-border">
              {header}
            </div>
          )}
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-accent bg-accent-soft'
                    : 'text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                {isActive && <Check size={14} className="shrink-0 mr-2" />}
                <span className="truncate">{opt.label}</span>
                {opt.badge && (
                  <span className={`ml-auto text-xs font-medium ${opt.badgeColor || 'text-text-muted'}`}>
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
