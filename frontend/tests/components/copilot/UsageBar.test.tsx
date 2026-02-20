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
      />,
    );
    const toggle = screen.getByTestId('usage-toggle');
    fireEvent.click(toggle); // expand
    expect(screen.getByText(/1,500/)).toBeTruthy(); // expanded detail
    fireEvent.click(toggle); // collapse
    // Collapsed view only shows total
    expect(screen.getByText(/2,300/)).toBeTruthy();
  });
});
