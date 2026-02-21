import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBlock } from '../../../src/components/copilot/MessageBlock';
import type { Message } from '../../../src/lib/api';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback }),
}));

vi.mock('../../../src/store', () => ({
  useAppStore: (selector: any) => {
    const state = {
      skills: [],
      activeTabId: null,
    };
    return selector(state);
  },
}));

vi.mock('../../../src/components/shared/LightboxContext', () => ({
  useLightbox: () => ({ openLightbox: vi.fn() }),
}));

vi.mock('../../../src/components/shared/Markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>,
}));

describe('MessageBlock contextFiles', () => {
  const baseUserMessage: Message = {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Explain this code',
    metadata: null,
    createdAt: '2024-01-01T00:00:00Z',
  };

  it('should display contextFiles chips when metadata has contextFiles', () => {
    const message: Message = {
      ...baseUserMessage,
      metadata: {
        contextFiles: ['/project/src/app.ts', '/project/src/utils.ts'],
      },
    };

    render(<MessageBlock message={message} />);

    const chipsContainer = screen.getByTestId('context-files-chips');
    expect(chipsContainer).toBeTruthy();
    expect(screen.getByText('@app.ts')).toBeTruthy();
    expect(screen.getByText('@utils.ts')).toBeTruthy();
  });

  it('should not display contextFiles chips when metadata has no contextFiles', () => {
    render(<MessageBlock message={baseUserMessage} />);
    expect(screen.queryByTestId('context-files-chips')).toBeNull();
  });

  it('should not display contextFiles chips when contextFiles array is empty', () => {
    const message: Message = {
      ...baseUserMessage,
      metadata: {
        contextFiles: [],
      },
    };

    render(<MessageBlock message={message} />);
    expect(screen.queryByTestId('context-files-chips')).toBeNull();
  });

  it('should show full path in title attribute', () => {
    const message: Message = {
      ...baseUserMessage,
      metadata: {
        contextFiles: ['/project/deep/nested/file.ts'],
      },
    };

    render(<MessageBlock message={message} />);
    const chip = screen.getByText('@file.ts');
    expect(chip.closest('[title]')?.getAttribute('title')).toBe('/project/deep/nested/file.ts');
  });
});
