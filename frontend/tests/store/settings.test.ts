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

describe('Store: settings (disabledSkills + settingsOpen)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    (localStorageMock.getItem as ReturnType<typeof vi.fn>).mockClear();
    (localStorageMock.setItem as ReturnType<typeof vi.fn>).mockClear();
    useAppStore.setState({
      disabledSkills: [],
      settingsOpen: false,
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

  // === batchSetSkillsDisabled ===
  describe('batchSetSkillsDisabled', () => {
    it('should add all specified skills when disabled=true', () => {
      useAppStore.getState().batchSetSkillsDisabled(['a', 'b', 'c'], true);
      expect(useAppStore.getState().disabledSkills).toEqual(['a', 'b', 'c']);
    });

    it('should remove all specified skills when disabled=false', () => {
      useAppStore.setState({ disabledSkills: ['a', 'b', 'c', 'other'] });
      useAppStore.getState().batchSetSkillsDisabled(['a', 'b', 'c'], false);
      expect(useAppStore.getState().disabledSkills).toEqual(['other']);
    });

    it('should not affect other skills when disabled=true', () => {
      useAppStore.setState({ disabledSkills: ['existing'] });
      useAppStore.getState().batchSetSkillsDisabled(['a', 'b'], true);
      expect(useAppStore.getState().disabledSkills).toEqual(['existing', 'a', 'b']);
    });

    it('should not affect other skills when disabled=false', () => {
      useAppStore.setState({ disabledSkills: ['a', 'other', 'b'] });
      useAppStore.getState().batchSetSkillsDisabled(['a', 'b'], false);
      expect(useAppStore.getState().disabledSkills).toEqual(['other']);
    });

    it('should not duplicate skills already in disabledSkills', () => {
      useAppStore.setState({ disabledSkills: ['a'] });
      useAppStore.getState().batchSetSkillsDisabled(['a', 'b'], true);
      const result = useAppStore.getState().disabledSkills;
      expect(result).toEqual(['a', 'b']);
      expect(result.filter((s) => s === 'a').length).toBe(1);
    });

    it('should persist to localStorage', () => {
      useAppStore.getState().batchSetSkillsDisabled(['x', 'y'], true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'codeforge:disabledSkills',
        JSON.stringify(['x', 'y']),
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
