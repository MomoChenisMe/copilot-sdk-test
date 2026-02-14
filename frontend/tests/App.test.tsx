import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock AppShell (since it has complex dependencies)
vi.mock('../src/components/layout/AppShell', () => ({
  AppShell: ({ onLogout }: { onLogout: () => void }) => (
    <div data-testid="app-shell">
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}));

// Mock LoginPage
vi.mock('../src/components/auth/LoginPage', () => ({
  LoginPage: ({ error }: { onLogin: (p: string) => void; error: string | null }) => (
    <div data-testid="login-page">{error && <span>{error}</span>}</div>
  ),
}));

import { App } from '../src/App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when authenticated is null', () => {
    mockUseAuth.mockReturnValue({
      authenticated: null,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<App />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows LoginPage when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      authenticated: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<App />);
    expect(screen.getByTestId('login-page')).toBeTruthy();
  });

  it('shows AppShell when authenticated', () => {
    mockUseAuth.mockReturnValue({
      authenticated: true,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<App />);
    expect(screen.getByTestId('app-shell')).toBeTruthy();
  });

  it('passes error to LoginPage', () => {
    mockUseAuth.mockReturnValue({
      authenticated: false,
      error: 'Bad password',
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<App />);
    expect(screen.getByText('Bad password')).toBeTruthy();
  });
});
