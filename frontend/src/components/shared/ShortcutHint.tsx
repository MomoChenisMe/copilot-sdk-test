interface ShortcutHintProps {
  keys: readonly string[];
  className?: string;
}

export function ShortcutHint({ keys, className = '' }: ShortcutHintProps) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-bg-tertiary border border-border text-[10px] font-mono text-text-muted"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
