import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReasoningBlock } from '../../../src/components/copilot/ReasoningBlock';

describe('ReasoningBlock', () => {
  it('returns null when text is empty', () => {
    const { container } = render(<ReasoningBlock text="" isStreaming={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Thinking..." title when streaming', () => {
    render(<ReasoningBlock text="Some reasoning" isStreaming={true} />);
    expect(screen.getByText('Thinking...')).toBeTruthy();
  });

  it('shows "Thought for Xs" title when not streaming', () => {
    render(<ReasoningBlock text={"A".repeat(100)} isStreaming={false} />);
    // Should show a "Thought for" label with duration
    expect(screen.getByText(/Thought for/)).toBeTruthy();
  });

  it('is expanded when streaming', () => {
    render(<ReasoningBlock text="Reasoning content here" isStreaming={true} />);
    expect(screen.getByText('Reasoning content here')).toBeTruthy();
  });

  it('is collapsed by default when not streaming', () => {
    render(<ReasoningBlock text="Reasoning content here" isStreaming={false} />);
    expect(screen.queryByText('Reasoning content here')).toBeNull();
  });

  it('can be expanded by clicking when collapsed', () => {
    render(<ReasoningBlock text="Reasoning content here" isStreaming={false} />);
    fireEvent.click(screen.getByText(/Thought for/));
    expect(screen.getByText('Reasoning content here')).toBeTruthy();
  });

  it('renders content in monospace font', () => {
    render(<ReasoningBlock text="Mono content" isStreaming={true} />);
    const content = screen.getByText('Mono content');
    expect(content.className).toContain('font-mono');
  });

  it('has subtle background', () => {
    const { container } = render(<ReasoningBlock text="Content" isStreaming={true} />);
    const block = container.firstChild as HTMLElement;
    expect(block.className).toContain('bg-tool-card-bg');
  });
});
