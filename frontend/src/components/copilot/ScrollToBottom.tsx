import { ArrowDown } from 'lucide-react';

interface ScrollToBottomProps {
  visible: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function ScrollToBottom({ visible, unreadCount, onClick }: ScrollToBottomProps) {
  return (
    <button
      data-testid="scroll-to-bottom"
      onClick={onClick}
      className={`
        absolute bottom-4 left-1/2 -translate-x-1/2 z-10
        flex items-center gap-1.5 px-3 py-2
        bg-bg-elevated border border-border rounded-full shadow-[var(--shadow-md)]
        text-text-secondary hover:text-text-primary hover:bg-bg-tertiary
        transition-all duration-200
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
      `}
      aria-label="Scroll to bottom"
    >
      <ArrowDown size={16} />
      {unreadCount > 0 && (
        <span
          data-testid="unread-badge"
          className="px-1.5 py-0.5 text-xs font-medium bg-accent text-white rounded-full min-w-5 text-center"
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
}
