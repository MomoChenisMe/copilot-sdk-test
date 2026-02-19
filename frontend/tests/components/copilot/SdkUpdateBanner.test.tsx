import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/lib/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

import { apiGet, apiPost } from '../../../src/lib/api';
import { SdkUpdateBanner } from '../../../src/components/copilot/SdkUpdateBanner';

describe('SdkUpdateBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when no update is available', async () => {
    (apiGet as any).mockResolvedValue({
      currentVersion: '0.2.0',
      latestVersion: '0.2.0',
      updateAvailable: false,
    });

    const { container } = render(<SdkUpdateBanner />);
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith('/api/copilot/sdk-version');
    });
    expect(container.firstChild).toBeNull();
  });

  it('should render update banner when update is available', async () => {
    (apiGet as any).mockResolvedValue({
      currentVersion: '0.1.23',
      latestVersion: '0.2.0',
      updateAvailable: true,
    });

    render(<SdkUpdateBanner />);
    await waitFor(() => {
      expect(screen.getByTestId('sdk-update-banner')).toBeTruthy();
    });
    expect(screen.getByText(/0\.1\.23/)).toBeTruthy();
    expect(screen.getByText(/0\.2\.0/)).toBeTruthy();
  });

  it('should dismiss banner when dismiss button is clicked', async () => {
    (apiGet as any).mockResolvedValue({
      currentVersion: '0.1.23',
      latestVersion: '0.2.0',
      updateAvailable: true,
    });

    render(<SdkUpdateBanner />);
    await waitFor(() => {
      expect(screen.getByTestId('sdk-update-banner')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('sdk-update-dismiss'));
    expect(screen.queryByTestId('sdk-update-banner')).toBeNull();
  });

  it('should call update API when update button is clicked', async () => {
    (apiGet as any).mockResolvedValue({
      currentVersion: '0.1.23',
      latestVersion: '0.2.0',
      updateAvailable: true,
    });
    (apiPost as any).mockResolvedValue({ success: true });

    render(<SdkUpdateBanner />);
    await waitFor(() => {
      expect(screen.getByTestId('sdk-update-btn')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('sdk-update-btn'));
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/api/copilot/sdk-update');
    });
  });
});
