import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Archive: (props: any) => <svg data-testid="archive-icon" {...props} />,
}));

import { OpenSpecArchived } from '../../../src/components/openspec/OpenSpecArchived';

describe('OpenSpecArchived', () => {
  const onSelect = vi.fn();

  describe('conditional date display', () => {
    it('should render date badge when archivedAt is present', () => {
      const archived = [{ name: 'my-change', archivedAt: '2025-06-15T10:00:00Z' }];
      render(<OpenSpecArchived archived={archived} onSelect={onSelect} />);
      expect(screen.getByText('my-change')).toBeTruthy();
      // Date should be rendered
      expect(screen.getByText(/Jun.*15.*2025|2025.*6.*15/)).toBeTruthy();
    });

    it('should NOT render date badge when archivedAt is undefined', () => {
      const archived = [{ name: 'no-date-change', archivedAt: undefined as any }];
      render(<OpenSpecArchived archived={archived} onSelect={onSelect} />);
      expect(screen.getByText('no-date-change')).toBeTruthy();
      // No date badge should be present — only the name and the icon
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(1);
      // The date span should not exist
      const nameEl = screen.getByText('no-date-change');
      const button = nameEl.closest('button')!;
      const spans = button.querySelectorAll('span.text-\\[10px\\]');
      expect(spans.length).toBe(0);
    });

    it('should NOT render date badge when archivedAt is empty string', () => {
      const archived = [{ name: 'empty-date', archivedAt: '' }];
      render(<OpenSpecArchived archived={archived} onSelect={onSelect} />);
      expect(screen.getByText('empty-date')).toBeTruthy();
      const nameEl = screen.getByText('empty-date');
      const button = nameEl.closest('button')!;
      const spans = button.querySelectorAll('span.text-\\[10px\\]');
      expect(spans.length).toBe(0);
    });

    it('should show empty state when no archived items', () => {
      render(<OpenSpecArchived archived={[]} onSelect={onSelect} />);
      expect(screen.getByText(/No archived|沒有已封存/i)).toBeTruthy();
    });
  });
});
