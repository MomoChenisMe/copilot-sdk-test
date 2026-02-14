import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../../../src/components/layout/TopBar';

describe('TopBar', () => {
  const defaultProps = {
    title: 'Test Conversation',
    modelName: 'GPT-4o',
    status: 'connected' as const,
    theme: 'light' as const,
    language: 'en',
    onMenuClick: vi.fn(),
    onThemeToggle: vi.fn(),
    onLanguageToggle: vi.fn(),
  };

  it('renders the conversation title', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Test Conversation')).toBeTruthy();
  });

  it('renders model name below the title', () => {
    render(<TopBar {...defaultProps} modelName="Claude Sonnet 4.5" />);
    expect(screen.getByText('Claude Sonnet 4.5')).toBeTruthy();
  });

  it('shows "AI Terminal" when no active conversation', () => {
    render(<TopBar {...defaultProps} title="AI Terminal" modelName="" />);
    expect(screen.getByText('AI Terminal')).toBeTruthy();
    expect(screen.queryByText('GPT-4o')).toBeNull();
  });

  it('calls onMenuClick when hamburger is clicked', () => {
    const onMenuClick = vi.fn();
    render(<TopBar {...defaultProps} onMenuClick={onMenuClick} />);
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it('renders connection badge with connected status', () => {
    render(<TopBar {...defaultProps} status="connected" />);
    expect(screen.getByTitle('Connected')).toBeTruthy();
  });

  it('renders connection badge with connecting status', () => {
    render(<TopBar {...defaultProps} status="connecting" />);
    expect(screen.getByTitle('Connecting')).toBeTruthy();
  });

  it('renders connection badge with disconnected status', () => {
    render(<TopBar {...defaultProps} status="disconnected" />);
    expect(screen.getByTitle('Disconnected')).toBeTruthy();
  });

  it('renders theme toggle button', () => {
    render(<TopBar {...defaultProps} />);
    const themeButton = screen.getByRole('button', { name: /theme/i });
    expect(themeButton).toBeTruthy();
  });

  it('calls onThemeToggle when theme button is clicked', () => {
    const onThemeToggle = vi.fn();
    render(<TopBar {...defaultProps} onThemeToggle={onThemeToggle} />);
    const themeButton = screen.getByRole('button', { name: /theme/i });
    fireEvent.click(themeButton);
    expect(onThemeToggle).toHaveBeenCalledTimes(1);
  });

  it('does not show model name when modelName is empty', () => {
    render(<TopBar {...defaultProps} modelName="" />);
    // Model name area should not render if empty
    const modelElement = screen.queryByTestId('model-name');
    expect(modelElement).toBeNull();
  });

  // Language switcher tests (Task 8.1)
  it('renders language toggle button with Globe icon', () => {
    render(<TopBar {...defaultProps} />);
    const langButton = screen.getByRole('button', { name: /language/i });
    expect(langButton).toBeTruthy();
  });

  it('displays current language code on the toggle button', () => {
    render(<TopBar {...defaultProps} language="en" />);
    const langButton = screen.getByRole('button', { name: /language/i });
    expect(langButton.textContent).toContain('EN');
  });

  it('displays zh-TW language code when language is zh-TW', () => {
    render(<TopBar {...defaultProps} language="zh-TW" />);
    const langButton = screen.getByRole('button', { name: /language/i });
    expect(langButton.textContent).toContain('中');
  });

  it('calls onLanguageToggle when language button is clicked', () => {
    const onLanguageToggle = vi.fn();
    render(<TopBar {...defaultProps} onLanguageToggle={onLanguageToggle} />);
    const langButton = screen.getByRole('button', { name: /language/i });
    fireEvent.click(langButton);
    expect(onLanguageToggle).toHaveBeenCalledTimes(1);
  });
});
