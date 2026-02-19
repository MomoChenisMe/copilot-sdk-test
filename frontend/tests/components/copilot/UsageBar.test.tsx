import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageBar } from '../../../src/components/copilot/UsageBar';

describe('UsageBar', () => {
  const defaults = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    contextWindowUsed: 0,
    contextWindowMax: 0,
    premiumRequestsUsed: 0,
    premiumRequestsTotal: 0,
    premiumResetDate: null as string | null,
    model: null as string | null,
  };

  it('should not render when there is no usage data', () => {
    const { container } = render(<UsageBar {...defaults} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render collapsed view with token summary', () => {
    render(<UsageBar {...defaults} inputTokens={1500} outputTokens={800} />);
    // Should show total token count in collapsed view
    expect(screen.getByText(/2,300/)).toBeTruthy();
  });

  it('should render context window bar in collapsed view', () => {
    render(
      <UsageBar {...defaults} contextWindowUsed={25600} contextWindowMax={128000} />,
    );
    const bar = screen.getByTestId('context-bar');
    expect(bar).toBeTruthy();
    expect(bar.className).toMatch(/bg-emerald/);
  });

  it('should show yellow bar when usage is 50-80%', () => {
    render(
      <UsageBar {...defaults} contextWindowUsed={76800} contextWindowMax={128000} />,
    );
    const bar = screen.getByTestId('context-bar');
    expect(bar.className).toMatch(/bg-amber/);
  });

  it('should show red bar when usage is > 80%', () => {
    render(
      <UsageBar {...defaults} contextWindowUsed={115200} contextWindowMax={128000} />,
    );
    const bar = screen.getByTestId('context-bar');
    expect(bar.className).toMatch(/bg-red/);
  });

  it('should expand on click to show details', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={1500}
        outputTokens={800}
        cacheReadTokens={300}
        cacheWriteTokens={100}
        contextWindowUsed={64000}
        contextWindowMax={128000}
      />,
    );
    // Click to expand
    fireEvent.click(screen.getByTestId('usage-toggle'));
    // Should now show individual token breakdown
    expect(screen.getByText(/1,500/)).toBeTruthy(); // input
    expect(screen.getByText(/800/)).toBeTruthy(); // output
  });

  it('should display premium request progress when data is present', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={5}
        premiumRequestsTotal={300}
      />,
    );
    // Click to expand
    fireEvent.click(screen.getByTestId('usage-toggle'));
    // Should show premium request info
    expect(screen.getByTestId('premium-bar')).toBeTruthy();
    expect(screen.getByText(/5 \/ 300/)).toBeTruthy();
  });

  it('should show premium reset date when available', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={10}
        premiumRequestsTotal={300}
        premiumResetDate="2026-03-01T00:00:00Z"
      />,
    );
    fireEvent.click(screen.getByTestId('usage-toggle'));
    expect(screen.getByText(/2026/)).toBeTruthy();
  });

  it('should show model name when available', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        model="gpt-4o"
      />,
    );
    fireEvent.click(screen.getByTestId('usage-toggle'));
    expect(screen.getByText(/gpt-4o/)).toBeTruthy();
  });

  it('should collapse back on second click', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={1500}
        outputTokens={800}
        premiumRequestsUsed={5}
        premiumRequestsTotal={300}
      />,
    );
    const toggle = screen.getByTestId('usage-toggle');
    fireEvent.click(toggle); // expand
    expect(screen.getByTestId('premium-bar')).toBeTruthy();
    fireEvent.click(toggle); // collapse
    expect(screen.queryByTestId('premium-bar')).toBeNull();
  });

  it('should show premium requests in collapsed view when available', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={5}
        premiumRequestsTotal={300}
      />,
    );
    // In collapsed view, show PR count
    expect(screen.getByText(/5.*PR/i)).toBeTruthy();
  });

  it('should use red color for premium bar when > 90%', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={285}
        premiumRequestsTotal={300}
      />,
    );
    fireEvent.click(screen.getByTestId('usage-toggle'));
    const premiumBar = screen.getByTestId('premium-bar');
    expect(premiumBar.className).toMatch(/bg-red/);
  });

  it('should use amber color for premium bar when 70-90%', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={240}
        premiumRequestsTotal={300}
      />,
    );
    fireEvent.click(screen.getByTestId('usage-toggle'));
    const premiumBar = screen.getByTestId('premium-bar');
    expect(premiumBar.className).toMatch(/bg-amber/);
  });

  it('should show unlimited premium requests without progress bar', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={42}
        premiumRequestsTotal={0}
        premiumUnlimited={true}
      />,
    );
    // Collapsed: should show "42 PR"
    expect(screen.getByText(/42 PR/)).toBeTruthy();
    // Expand
    fireEvent.click(screen.getByTestId('usage-toggle'));
    // Should show "Unlimited" text
    expect(screen.getByText(/Unlimited/)).toBeTruthy();
    // Should NOT show progress bar for unlimited
    expect(screen.queryByTestId('premium-bar')).toBeNull();
  });

  it('should NOT show premium section when no subscription quota data exists', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={0}
        premiumRequestsLocal={3}
        premiumRequestsTotal={0}
      />,
    );
    // No subscription means premiumRequestsTotal=0 and premiumUnlimited=false
    // Should NOT show premium even if local count > 0
    expect(screen.queryByText(/PR/)).toBeNull();
  });

  it('should show premium section when subscription quota data exists', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={5}
        premiumRequestsTotal={300}
      />,
    );
    expect(screen.getByText(/5\/300 PR/)).toBeTruthy();
  });

  it('should use premiumRequestsLocal when higher than premiumRequestsUsed', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={0}
        premiumRequestsLocal={3}
        premiumRequestsTotal={300}
      />,
    );
    // Should show local count (3) not SDK count (0)
    expect(screen.getByText(/3\/300 PR/)).toBeTruthy();
  });

  it('should use premiumRequestsUsed when higher than premiumRequestsLocal', () => {
    render(
      <UsageBar
        {...defaults}
        inputTokens={100}
        outputTokens={50}
        premiumRequestsUsed={10}
        premiumRequestsLocal={3}
        premiumRequestsTotal={300}
      />,
    );
    // Should show SDK count (10) not local count (3)
    expect(screen.getByText(/10\/300 PR/)).toBeTruthy();
  });
});
