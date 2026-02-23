interface CodeForgeLogoProps {
  size?: number;
  className?: string;
}

export function CodeForgeLogo({ size = 24, className }: CodeForgeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Left angle bracket */}
      <polyline points="4 8 1 12 4 16" />
      {/* Right angle bracket */}
      <polyline points="20 8 23 12 20 16" />
      {/* Anvil body */}
      <path d="M8 20h8" />
      <path d="M10 20v-4h4v4" />
      <path d="M7 16h10" />
      {/* Hammer head */}
      <rect x="9" y="7" width="6" height="3" rx="0.5" />
      {/* Hammer handle */}
      <line x1="12" y1="10" x2="12" y2="16" />
      {/* Spark */}
      <line x1="15" y1="4" x2="16.5" y2="2.5" />
      <line x1="17" y1="5.5" x2="18.5" y2="4" />
    </svg>
  );
}
