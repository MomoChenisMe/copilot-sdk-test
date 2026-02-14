import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../src/store/index';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Theme Store Slice', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset store to initial state
    useAppStore.setState({
      theme: 'light',
    });
  });

  it('should have "light" as the default theme', () => {
    const { theme } = useAppStore.getState();
    expect(theme).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    useAppStore.getState().toggleTheme();
    const { theme } = useAppStore.getState();
    expect(theme).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    useAppStore.setState({ theme: 'dark' });
    useAppStore.getState().toggleTheme();
    const { theme } = useAppStore.getState();
    expect(theme).toBe('light');
  });

  it('should persist theme to localStorage on toggle', () => {
    useAppStore.getState().toggleTheme();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');

    useAppStore.getState().toggleTheme();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('should read initial theme from localStorage if available', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark');
    // Re-import or call the initializer — we test via getInitialTheme helper
    const { getInitialTheme } = useAppStore.getState();
    expect(getInitialTheme()).toBe('dark');
  });

  it('should default to "light" if localStorage has no theme value', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    const { getInitialTheme } = useAppStore.getState();
    expect(getInitialTheme()).toBe('light');
  });

  it('should default to "light" if localStorage has invalid theme value', () => {
    localStorageMock.getItem.mockReturnValueOnce('invalid');
    const { getInitialTheme } = useAppStore.getState();
    expect(getInitialTheme()).toBe('light');
  });
});
