import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageBar } from '../../../src/components/copilot/UsageBar';

describe('UsageBar', () => {
  const defaults = {
    inputTokens: 0,
    outputTokens: 0,
    contextWindowUsed: 0,
    contextWindowMax: 0,
  };

  it('should not render when there is no usage data', () => {
    const { container } = render(<UsageBar {...defaults} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render token counts when tokens are present', () => {
    render(<UsageBar {...defaults} inputTokens={1500} outputTokens={800} />);
    expect(screen.getByText(/1,500/)).toBeTruthy();
    expect(screen.getByText(/800/)).toBeTruthy();
  });

  it('should render context window bar when contextWindowMax > 0', () => {
    render(
      <UsageBar
        {...defaults}
        contextWindowUsed={25600}
        contextWindowMax={128000}
      />,
    );
    const bar = screen.getByTestId('context-bar');
    expect(bar).toBeTruthy();
    // 20% usage → green
    expect(bar.className).toMatch(/bg-emerald/);
  });

  it('should show yellow bar when usage is 50-80%', () => {
    render(
      <UsageBar
        {...defaults}
        contextWindowUsed={76800}
        contextWindowMax={128000}
      />,
    );
    const bar = screen.getByTestId('context-bar');
    expect(bar.className).toMatch(/bg-amber/);
  });

  it('should show red bar when usage is > 80%', () => {
    render(
      <UsageBar
        {...defaults}
        contextWindowUsed={115200}
        contextWindowMax={128000}
      />,
    );
    const bar = screen.getByTestId('context-bar');
    expect(bar.className).toMatch(/bg-red/);
  });

  it('should display percentage text', () => {
    render(
      <UsageBar
        {...defaults}
        contextWindowUsed={64000}
        contextWindowMax={128000}
      />,
    );
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('should render both tokens and context bar when all data present', () => {
    render(
      <UsageBar
        inputTokens={500}
        outputTokens={300}
        contextWindowUsed={32000}
        contextWindowMax={128000}
      />,
    );
    expect(screen.getByText(/500/)).toBeTruthy();
    expect(screen.getByTestId('context-bar')).toBeTruthy();
  });
});
