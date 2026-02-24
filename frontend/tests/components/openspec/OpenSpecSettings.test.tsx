import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Trash2: (props: any) => <svg data-testid="trash-icon" {...props} />,
}));

import { OpenSpecSettings } from '../../../src/components/openspec/OpenSpecSettings';

describe('OpenSpecSettings', () => {
  const defaultProps = {
    onDeleteOpenspec: vi.fn(),
    deleting: false,
  };

  it('should render danger zone with delete button', () => {
    render(<OpenSpecSettings {...defaultProps} />);
    expect(screen.getByText(/Danger Zone|危險區域/i)).toBeTruthy();
    expect(screen.getByTestId('openspec-delete-button')).toBeTruthy();
  });

  it('should show "Delete OpenSpec" text on button', () => {
    render(<OpenSpecSettings {...defaultProps} />);
    expect(screen.getByTestId('openspec-delete-button').textContent).toMatch(/Delete OpenSpec|刪除 OpenSpec/);
  });

  it('should call onDeleteOpenspec when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<OpenSpecSettings {...defaultProps} onDeleteOpenspec={onDelete} />);
    fireEvent.click(screen.getByTestId('openspec-delete-button'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('should show deleting state when deleting is true', () => {
    render(<OpenSpecSettings {...defaultProps} deleting={true} />);
    expect(screen.getByTestId('openspec-delete-button').textContent).toMatch(/Deleting|刪除中/);
    expect(screen.getByTestId('openspec-delete-button')).toBeDisabled();
  });
});
