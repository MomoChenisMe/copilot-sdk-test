import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OpenSpecChangeDetail } from '../../../src/components/openspec/OpenSpecChangeDetail';
import type { ChangeDetail } from '../../../src/lib/openspec-api';

const mockChange: ChangeDetail = {
  name: 'test-change',
  openspec: null,
  proposal: '# Proposal\nSome proposal content',
  design: '# Design\nSome design content',
  tasks:
    '## 1. Setup\n\n- [ ] 1.1 Create module\n- [x] 1.2 Add dependencies\n\n## 2. Core\n\n- [ ] 2.1 Implement feature\n- [x] 2.2 Add tests',
  specs: ['auth-security', 'chat-ui'],
};

describe('OpenSpecChangeDetail', () => {
  const defaultProps = {
    change: mockChange,
    onBack: vi.fn(),
    onTaskToggle: vi.fn(),
    onBatchToggle: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
  };

  describe('Task Checkbox Toggle', () => {
    it('calls onTaskToggle with line.text (not line.raw) when unchecking a checked task', () => {
      const onTaskToggle = vi.fn();
      render(<OpenSpecChangeDetail {...defaultProps} onTaskToggle={onTaskToggle} />);

      // Find checked checkboxes (1.2 Add dependencies, 2.2 Add tests)
      const checkboxes = screen.getAllByRole('checkbox');
      // checkbox[1] is "1.2 Add dependencies" (checked)
      const checkedCheckbox = checkboxes[1];
      expect(checkedCheckbox).toBeChecked();

      fireEvent.click(checkedCheckbox);

      // Should send line.text "1.2 Add dependencies", NOT line.raw "- [x] 1.2 Add dependencies"
      expect(onTaskToggle).toHaveBeenCalledWith('1.2 Add dependencies', false);
      expect(onTaskToggle).not.toHaveBeenCalledWith(
        expect.stringContaining('- ['),
        expect.anything(),
      );
    });

    it('calls onTaskToggle with line.text when checking an unchecked task', () => {
      const onTaskToggle = vi.fn();
      render(<OpenSpecChangeDetail {...defaultProps} onTaskToggle={onTaskToggle} />);

      // checkbox[0] is "1.1 Create module" (unchecked)
      const checkboxes = screen.getAllByRole('checkbox');
      const uncheckedCheckbox = checkboxes[0];
      expect(uncheckedCheckbox).not.toBeChecked();

      fireEvent.click(uncheckedCheckbox);

      expect(onTaskToggle).toHaveBeenCalledWith('1.1 Create module', true);
    });

    it('batch mark all complete uses line.text for taskLine', () => {
      const onBatchToggle = vi.fn();
      render(<OpenSpecChangeDetail {...defaultProps} onBatchToggle={onBatchToggle} />);

      // Click "Mark all complete" button
      const markAllBtn = screen.getByTitle('Mark all complete');
      fireEvent.click(markAllBtn);

      expect(onBatchToggle).toHaveBeenCalledWith([
        { taskLine: '1.1 Create module', checked: true },
        { taskLine: '2.1 Implement feature', checked: true },
      ]);
    });

    it('batch reset tasks uses line.text for taskLine', () => {
      const onBatchToggle = vi.fn();
      render(<OpenSpecChangeDetail {...defaultProps} onBatchToggle={onBatchToggle} />);

      // Click "Reset tasks" button
      const resetBtn = screen.getByTitle('Reset tasks');
      fireEvent.click(resetBtn);

      expect(onBatchToggle).toHaveBeenCalledWith([
        { taskLine: '1.2 Add dependencies', checked: false },
        { taskLine: '2.2 Add tests', checked: false },
      ]);
    });
  });
});
