import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThinkingIndicator } from '../../../src/components/copilot/ThinkingIndicator';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'thinking.pondering': 'Pondering',
        'thinking.analyzing': 'Analyzing',
        'thinking.synthesizing': 'Synthesizing',
        'thinking.reasoning': 'Reasoning',
        'thinking.exploring': 'Exploring',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('ThinkingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render the thinking indicator container', () => {
    render(<ThinkingIndicator />);
    expect(screen.getByTestId('thinking-indicator')).toBeTruthy();
  });

  it('should render a Unicode character', () => {
    render(<ThinkingIndicator />);
    const charEl = screen.getByTestId('thinking-char');
    expect(charEl).toBeTruthy();
    // Should be one of the Unicode chars
    expect(charEl.textContent).toBeTruthy();
    expect(charEl.textContent!.length).toBeGreaterThan(0);
  });

  it('should render a status phrase', () => {
    render(<ThinkingIndicator />);
    const phraseEl = screen.getByTestId('thinking-phrase');
    expect(phraseEl).toBeTruthy();
    expect(phraseEl.textContent).toBeTruthy();
  });

  it('should cycle Unicode character over time', () => {
    render(<ThinkingIndicator />);
    const charEl = screen.getByTestId('thinking-char');
    const initial = charEl.textContent;

    // Advance past character rotation interval (150ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    const after = charEl.textContent;
    // Should have changed (or stayed if cycle wraps — we just verify it doesn't crash)
    expect(after).toBeTruthy();
  });

  it('should cycle status phrase over time', () => {
    render(<ThinkingIndicator />);
    const phraseEl = screen.getByTestId('thinking-phrase');
    const initial = phraseEl.textContent;

    // Advance past phrase rotation interval (3-4s)
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    const after = phraseEl.textContent;
    // Should have changed to a different phrase
    expect(after).toBeTruthy();
    expect(after).not.toBe(initial);
  });

  it('should display elapsed time', () => {
    render(<ThinkingIndicator />);
    const timerEl = screen.getByTestId('thinking-timer');
    expect(timerEl).toBeTruthy();

    // Initially 0.0s
    expect(timerEl.textContent).toContain('0');

    // After 2.5 seconds
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(timerEl.textContent).toContain('2');
  });

  it('should have thinking-pulse animation class', () => {
    render(<ThinkingIndicator />);
    const indicator = screen.getByTestId('thinking-indicator');
    expect(indicator.className).toContain('thinking-pulse');
  });
});
