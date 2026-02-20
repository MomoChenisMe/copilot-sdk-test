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

describe('Store: settings (activePresets + disabledSkills + settingsOpen)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    (localStorageMock.getItem as ReturnType<typeof vi.fn>).mockClear();
    (localStorageMock.setItem as ReturnType<typeof vi.fn>).mockClear();
    useAppStore.setState({
      activePresets: [],
      disabledSkills: [],
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
        'codeforge:activePresets',
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
        'codeforge:activePresets',
        JSON.stringify([]),
      );
    });
  });

  // === disabledSkills ===
  describe('disabledSkills', () => {
    it('should initialize with empty array', () => {
      expect(useAppStore.getState().disabledSkills).toEqual([]);
    });

    it('should toggle a skill to disabled (add)', () => {
      useAppStore.getState().toggleSkill('my-skill');
      expect(useAppStore.getState().disabledSkills).toEqual(['my-skill']);
    });

    it('should toggle a skill back to enabled (remove)', () => {
      useAppStore.setState({ disabledSkills: ['my-skill', 'other'] });
      useAppStore.getState().toggleSkill('my-skill');
      expect(useAppStore.getState().disabledSkills).toEqual(['other']);
    });

    it('should persist disabledSkills to localStorage on toggle', () => {
      useAppStore.getState().toggleSkill('skill-x');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codeforge:disabledSkills',
        JSON.stringify(['skill-x']),
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

  // === lastSelectedModel ===
  describe('lastSelectedModel', () => {
    it('should initialize as null', () => {
      expect(useAppStore.getState().lastSelectedModel).toBeNull();
    });

    it('should update state via setLastSelectedModel', () => {
      useAppStore.getState().setLastSelectedModel('claude-3.5-sonnet');
      expect(useAppStore.getState().lastSelectedModel).toBe('claude-3.5-sonnet');
    });

    it('should persist to localStorage on setLastSelectedModel', () => {
      useAppStore.getState().setLastSelectedModel('gpt-4o');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codeforge:lastSelectedModel',
        'gpt-4o',
      );
    });

    it('should allow overwriting with a different model', () => {
      useAppStore.getState().setLastSelectedModel('gpt-4o');
      useAppStore.getState().setLastSelectedModel('claude-3.5-sonnet');
      expect(useAppStore.getState().lastSelectedModel).toBe('claude-3.5-sonnet');
      expect(localStorageMock.setItem).toHaveBeenLastCalledWith(
        'codeforge:lastSelectedModel',
        'claude-3.5-sonnet',
      );
    });
  });
});
