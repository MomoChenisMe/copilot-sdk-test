import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBlock } from '../../../src/components/copilot/MessageBlock';
import type { Message } from '../../../src/lib/api';

// Mock Markdown component
vi.mock('../../../src/components/shared/Markdown', () => ({
  Markdown: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));

// Mock lucide-react Sparkles icon
vi.mock('lucide-react', () => ({
  Sparkles: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
}));

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello world',
  metadata: null,
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('MessageBlock', () => {
  // User message tests
  it('renders user message with right-aligned styling', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-end');
  });

  it('renders user message as plain text (not Markdown)', () => {
    render(<MessageBlock message={makeMessage({ role: 'user', content: 'Plain text' })} />);
    expect(screen.getByText('Plain text')).toBeTruthy();
    expect(screen.queryByTestId('markdown')).toBeNull();
  });

  it('renders user message with user-msg-bg background', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const bubble = container.querySelector('[data-testid="user-bubble"]');
    expect(bubble).toBeTruthy();
    expect(bubble?.className).toContain('bg-user-msg-bg');
    expect(bubble?.className).toContain('border-user-msg-border');
  });

  it('renders user message with rounded-2xl rounded-br-sm', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const bubble = container.querySelector('[data-testid="user-bubble"]');
    expect(bubble?.className).toContain('rounded-2xl');
    expect(bubble?.className).toContain('rounded-br-sm');
  });

  it('renders user message with max-w-[85%]', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const bubble = container.querySelector('[data-testid="user-bubble"]');
    expect(bubble?.className).toContain('max-w-[85%]');
  });

  // Assistant message tests
  it('renders assistant message left-aligned', () => {
    const { container } = render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: '# Hello' })} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('justify-end');
  });

  it('renders assistant message with Markdown', () => {
    render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: '# Title' })} />
    );
    expect(screen.getByTestId('markdown')).toBeTruthy();
  });

  it('renders assistant label for assistant messages', () => {
    render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    expect(screen.getByText('Assistant')).toBeTruthy();
  });

  it('renders Sparkles icon as avatar for assistant messages', () => {
    render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    expect(screen.getByTestId('sparkles-icon')).toBeTruthy();
  });

  it('renders assistant message with avatar + content layout (flex items-start gap-3)', () => {
    const { container } = render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    const layout = container.querySelector('.flex.items-start.gap-3');
    expect(layout).toBeTruthy();
  });

  it('renders avatar with bg-accent-soft rounded-lg', () => {
    const { container } = render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    const avatar = container.querySelector('.bg-accent-soft.rounded-lg');
    expect(avatar).toBeTruthy();
  });

  it('does not render Sparkles icon or label for user messages', () => {
    render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    expect(screen.queryByText('Assistant')).toBeNull();
    expect(screen.queryByTestId('sparkles-icon')).toBeNull();
  });
});
