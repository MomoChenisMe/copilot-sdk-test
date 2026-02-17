import { GitBranch } from 'lucide-react';

interface BashPromptProps {
  user: string;
  hostname: string;
  cwd: string;
  gitBranch?: string;
}

// M365Princess Theme Colors
const PLUM = '#9A348E';
const BLUSH = '#DA627D';
const SALMON = '#FCA17D';

const SEGMENT_H = 22;
const ARROW_W = 10;

/** Shorten path to last 2 segments with ~ for home */
function shortenPath(cwd: string): string {
  const homePath = cwd.replace(/^\/(?:Users|home)\/[^/]+/, '~');
  const parts = homePath.split('/').filter(Boolean);
  if (parts.length <= 2) return homePath;
  return `\u2026/${parts.slice(-2).join('/')}`;
}

/**
 * SVG-based powerline chevron arrow.
 * - Between two segments: draws a rect with `nextColor` and an arrow with `color` on top.
 * - Trailing arrow (no nextColor): just the arrow pointing into the background.
 */
function PowerlineArrow({ color, nextColor }: { color: string; nextColor?: string }) {
  return (
    <svg
      className="powerline-arrow shrink-0"
      width={ARROW_W}
      height={SEGMENT_H}
      viewBox={`0 0 ${ARROW_W} ${SEGMENT_H}`}
      style={{ display: 'block' }}
    >
      {nextColor && <rect width={ARROW_W} height={SEGMENT_H} fill={nextColor} />}
      <path d={`M0,0 L${ARROW_W},${SEGMENT_H / 2} L0,${SEGMENT_H} Z`} fill={color} />
    </svg>
  );
}

export function BashPrompt({ user, hostname, cwd, gitBranch }: BashPromptProps) {
  const displayPath = shortenPath(cwd);
  const hasGit = !!gitBranch;

  return (
    <div data-testid="bash-prompt" className="flex items-center text-xs font-mono mb-1 select-none flex-wrap">
      {/* User@host segment — Plum (rounded left edge) */}
      <span
        data-testid="bash-prompt-user"
        className="inline-flex items-center px-2 text-white leading-none"
        style={{ backgroundColor: PLUM, height: SEGMENT_H, borderRadius: '4px 0 0 4px' }}
      >
        {user}@{hostname}
      </span>
      <PowerlineArrow color={PLUM} nextColor={BLUSH} />

      {/* CWD segment — Blush */}
      <span
        data-testid="bash-prompt-cwd"
        className="inline-flex items-center px-2 text-white leading-none"
        style={{ backgroundColor: BLUSH, height: SEGMENT_H }}
      >
        {displayPath}
      </span>

      {hasGit ? (
        <>
          <PowerlineArrow color={BLUSH} nextColor={SALMON} />
          {/* Git branch segment — Salmon */}
          <span
            data-testid="bash-prompt-git"
            className="inline-flex items-center gap-1 px-2 leading-none"
            style={{ backgroundColor: SALMON, height: SEGMENT_H, color: '#3D1308' }}
          >
            <GitBranch size={11} />
            {gitBranch}
          </span>
          <PowerlineArrow color={SALMON} />
        </>
      ) : (
        <PowerlineArrow color={BLUSH} />
      )}

      {/* $ prompt */}
      <span className="ml-2 text-text-muted">$</span>
    </div>
  );
}
