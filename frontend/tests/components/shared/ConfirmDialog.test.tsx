import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
}));

import { ConfirmDialog } from '../../../src/components/shared/ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Test Title',
    description: 'Test description',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('i18n: confirm button labels', () => {
    it('should display translated confirm label from common.confirm when no custom confirmLabel is provided', () => {
      render(<ConfirmDialog {...defaultProps} />);
      // Default fallback text is 'Confirm' (from t('common.confirm', 'Confirm'))
      const confirmBtn = screen.getByRole('button', { name: /Confirm|確認/i });
      expect(confirmBtn).toBeTruthy();
    });

    it('should display custom confirmLabel when provided', () => {
      render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" />);
      const confirmBtn = screen.getByRole('button', { name: 'Delete' });
      expect(confirmBtn).toBeTruthy();
    });

    it('should display processing text when loading is true', () => {
      render(<ConfirmDialog {...defaultProps} loading={true} />);
      // Default fallback text is 'Processing...' (from t('common.processing', 'Processing...'))
      const confirmBtn = screen.getByRole('button', { name: /Processing|處理中/i });
      expect(confirmBtn).toBeTruthy();
    });

    it('should display translated cancel label from common.cancel', () => {
      render(<ConfirmDialog {...defaultProps} />);
      const cancelBtn = screen.getByRole('button', { name: /Cancel|取消/i });
      expect(cancelBtn).toBeTruthy();
    });

    it('should display custom cancelLabel when provided', () => {
      render(<ConfirmDialog {...defaultProps} cancelLabel="Dismiss" />);
      const cancelBtn = screen.getByRole('button', { name: 'Dismiss' });
      expect(cancelBtn).toBeTruthy();
    });

    it('should disable confirm button when loading is true', () => {
      render(<ConfirmDialog {...defaultProps} loading={true} />);
      const confirmBtn = screen.getByRole('button', { name: /Processing|處理中/i });
      expect(confirmBtn).toBeDisabled();
    });
  });
});
