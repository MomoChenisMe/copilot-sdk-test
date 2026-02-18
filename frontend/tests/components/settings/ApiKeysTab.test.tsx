import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/lib/api', () => ({
  configApi: {
    getBraveApiKey: vi.fn().mockResolvedValue({ hasKey: false, maskedKey: '' }),
    putBraveApiKey: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { configApi } from '../../../src/lib/api';
import { ApiKeysTab } from '../../../src/components/settings/ApiKeysTab';

describe('ApiKeysTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (configApi.getBraveApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ hasKey: false, maskedKey: '' });
  });

  it('should render Brave API key input field', async () => {
    render(<ApiKeysTab />);
    await waitFor(() => {
      expect(screen.getByTestId('brave-api-key-input')).toBeTruthy();
    });
  });

  it('should show save button disabled when input is empty', async () => {
    render(<ApiKeysTab />);
    await waitFor(() => {
      const saveBtn = screen.getByTestId('brave-save-key');
      expect(saveBtn.hasAttribute('disabled')).toBe(true);
    });
  });

  it('should call putBraveApiKey when save is clicked', async () => {
    render(<ApiKeysTab />);
    await waitFor(() => {
      expect(screen.getByTestId('brave-api-key-input')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('brave-api-key-input'), {
      target: { value: 'BSA_test123' },
    });
    fireEvent.click(screen.getByTestId('brave-save-key'));
    await waitFor(() => {
      expect(configApi.putBraveApiKey).toHaveBeenCalledWith('BSA_test123');
    });
  });

  it('should show masked key and clear button when key exists', async () => {
    (configApi.getBraveApiKey as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      hasKey: true,
      maskedKey: 'BSA_****',
    });
    render(<ApiKeysTab />);
    await waitFor(() => {
      expect(screen.getByTestId('brave-masked-key')).toBeTruthy();
      expect(screen.getByTestId('brave-clear-key')).toBeTruthy();
    });
  });

  it('should clear key when clear button is clicked', async () => {
    (configApi.getBraveApiKey as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      hasKey: true,
      maskedKey: 'BSA_****',
    });
    render(<ApiKeysTab />);
    await waitFor(() => {
      expect(screen.getByTestId('brave-clear-key')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('brave-clear-key'));
    await waitFor(() => {
      expect(configApi.putBraveApiKey).toHaveBeenCalledWith('');
    });
  });

  it('should show saved toast after successful save', async () => {
    render(<ApiKeysTab />);
    await waitFor(() => {
      expect(screen.getByTestId('brave-api-key-input')).toBeTruthy();
    });
    fireEvent.change(screen.getByTestId('brave-api-key-input'), {
      target: { value: 'BSA_newkey' },
    });
    fireEvent.click(screen.getByTestId('brave-save-key'));
    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeTruthy();
    });
  });
});
