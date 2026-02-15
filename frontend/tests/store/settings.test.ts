import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../src/store/index';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Store: settings (activePresets + settingsOpen)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    (localStorageMock.getItem as ReturnType<typeof vi.fn>).mockClear();
    (localStorageMock.setItem as ReturnType<typeof vi.fn>).mockClear();
    useAppStore.setState({
      activePresets: [],
      settingsOpen: false,
    });
  });

  // === activePresets ===
  describe('activePresets', () => {
    it('should initialize with empty array', () => {
      expect(useAppStore.getState().activePresets).toEqual([]);
    });

    it('should toggle a preset on (add)', () => {
      useAppStore.getState().togglePreset('code-review');
      expect(useAppStore.getState().activePresets).toEqual(['code-review']);
    });

    it('should toggle a preset off (remove)', () => {
      useAppStore.setState({ activePresets: ['code-review', 'devops'] });
      useAppStore.getState().togglePreset('code-review');
      expect(useAppStore.getState().activePresets).toEqual(['devops']);
    });

    it('should handle toggling multiple presets', () => {
      useAppStore.getState().togglePreset('code-review');
      useAppStore.getState().togglePreset('devops');
      expect(useAppStore.getState().activePresets).toEqual(['code-review', 'devops']);
    });

    it('should persist activePresets to localStorage on toggle', () => {
      useAppStore.getState().togglePreset('code-review');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-terminal:activePresets',
        JSON.stringify(['code-review']),
      );
    });

    it('should remove preset from activePresets via removePreset', () => {
      useAppStore.setState({ activePresets: ['code-review', 'devops'] });
      useAppStore.getState().removePreset('devops');
      expect(useAppStore.getState().activePresets).toEqual(['code-review']);
    });

    it('should persist to localStorage on removePreset', () => {
      useAppStore.setState({ activePresets: ['code-review'] });
      useAppStore.getState().removePreset('code-review');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-terminal:activePresets',
        JSON.stringify([]),
      );
    });
  });

  // === settingsOpen ===
  describe('settingsOpen', () => {
    it('should initialize as false', () => {
      expect(useAppStore.getState().settingsOpen).toBe(false);
    });

    it('should toggle settings open', () => {
      useAppStore.getState().setSettingsOpen(true);
      expect(useAppStore.getState().settingsOpen).toBe(true);
    });

    it('should toggle settings closed', () => {
      useAppStore.setState({ settingsOpen: true });
      useAppStore.getState().setSettingsOpen(false);
      expect(useAppStore.getState().settingsOpen).toBe(false);
    });
  });
});
