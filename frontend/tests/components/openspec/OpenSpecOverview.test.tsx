import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock Markdown component
vi.mock('../../../src/components/shared/Markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div data-testid="markdown-render">{content}</div>,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  GitBranch: (props: any) => <svg data-testid="git-branch-icon" {...props} />,
  FileText: (props: any) => <svg data-testid="file-text-icon" {...props} />,
  Archive: (props: any) => <svg data-testid="archive-icon" {...props} />,
}));

import { OpenSpecOverview } from '../../../src/components/openspec/OpenSpecOverview';

describe('OpenSpecOverview', () => {
  it('should NOT render danger zone in overview', () => {
    const overview = {
      changesCount: 2,
      specsCount: 5,
      archivedCount: 1,
      config: null,
    };
    render(<OpenSpecOverview overview={overview} />);
    // Danger zone should not be present
    expect(screen.queryByText(/Danger Zone|危險區域/i)).toBeNull();
    expect(screen.queryByText(/Delete OpenSpec|刪除 OpenSpec/i)).toBeNull();
  });

  it('should render stat cards', () => {
    const overview = {
      changesCount: 2,
      specsCount: 5,
      archivedCount: 1,
      config: null,
    };
    render(<OpenSpecOverview overview={overview} />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });
});
