import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingText } from '../../../src/components/copilot/StreamingText';

describe('StreamingText', () => {
  it('renders text content', () => {
    render(<StreamingText text="Hello world" isStreaming={false} />);
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('does not show cursor when streaming', () => {
    const { container } = render(<StreamingText text="Typing..." isStreaming={true} />);
    expect(container.textContent).not.toContain('|');
  });

  it('renders Markdown content (bold)', () => {
    render(<StreamingText text="This is **bold** text" isStreaming={false} />);
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
  });

  it('renders inline code in Markdown', () => {
    render(<StreamingText text="Use `console.log`" isStreaming={false} />);
    const code = screen.getByText('console.log');
    expect(code.tagName).toBe('CODE');
  });

  it('returns null when text is empty and not streaming', () => {
    const { container } = render(<StreamingText text="" isStreaming={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when text is empty even when streaming', () => {
    const { container } = render(<StreamingText text="" isStreaming={true} />);
    expect(container.firstChild).toBeNull();
  });
});
