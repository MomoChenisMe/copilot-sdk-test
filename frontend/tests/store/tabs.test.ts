import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../src/store/index';

// Ensure clean state for each test
beforeEach(() => {
  useAppStore.setState({
    tabs: {},
    tabOrder: [],
    activeTabId: null,
  });
  localStorage.clear();
});

describe('Tab management', () => {
  // --- openTab ---
  describe('openTab', () => {
    it('should create a new tab with given conversationId and title', () => {
      useAppStore.getState().openTab('conv-1', 'New Chat');
      const state = useAppStore.getState();
      expect(state.tabs['conv-1']).toBeTruthy();
      expect(state.tabs['conv-1'].conversationId).toBe('conv-1');
      expect(state.tabs['conv-1'].title).toBe('New Chat');
      expect(state.tabs['conv-1'].messages).toEqual([]);
      expect(state.tabs['conv-1'].streamingText).toBe('');
      expect(state.tabs['conv-1'].isStreaming).toBe(false);
      expect(state.tabs['conv-1'].toolRecords).toEqual([]);
      expect(state.tabs['conv-1'].reasoningText).toBe('');
      expect(state.tabs['conv-1'].turnContentSegments).toEqual([]);
      expect(state.tabs['conv-1'].turnSegments).toEqual([]);
      expect(state.tabs['conv-1'].copilotError).toBeNull();
      expect(state.tabs['conv-1'].messagesLoaded).toBe(false);
    });

    it('should add tabId to tabOrder', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      expect(useAppStore.getState().tabOrder).toEqual(['conv-1']);
    });

    it('should set activeTabId to the new tab', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      expect(useAppStore.getState().activeTabId).toBe('conv-1');
    });

    it('should not duplicate an already open tab, just activate it', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      const state = useAppStore.getState();
      expect(state.tabOrder).toEqual(['conv-1', 'conv-2']);
      expect(state.activeTabId).toBe('conv-1');
    });

    it('should persist open tabs to localStorage', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      const stored = JSON.parse(localStorage.getItem('ai-terminal:openTabs') ?? '[]');
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe('conv-1');
      expect(stored[1].id).toBe('conv-2');
    });
  });

  // --- closeTab ---
  describe('closeTab', () => {
    it('should remove the tab from tabs and tabOrder', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      useAppStore.getState().closeTab('conv-1');
      const state = useAppStore.getState();
      expect(state.tabs['conv-1']).toBeUndefined();
      expect(state.tabOrder).toEqual(['conv-2']);
    });

    it('should activate the next tab when closing the active tab', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      useAppStore.getState().setActiveTab('conv-1');
      useAppStore.getState().closeTab('conv-1');
      expect(useAppStore.getState().activeTabId).toBe('conv-2');
    });

    it('should set activeTabId to null when closing the last tab', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().closeTab('conv-1');
      expect(useAppStore.getState().activeTabId).toBeNull();
      expect(useAppStore.getState().tabOrder).toEqual([]);
    });

    it('should persist after close', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      useAppStore.getState().closeTab('conv-1');
      const stored = JSON.parse(localStorage.getItem('ai-terminal:openTabs') ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('conv-2');
    });
  });

  // --- setActiveTab ---
  describe('setActiveTab', () => {
    it('should switch activeTabId', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      useAppStore.getState().setActiveTab('conv-1');
      expect(useAppStore.getState().activeTabId).toBe('conv-1');
    });

    it('should not clear streaming state of the previous tab', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().appendTabStreamingText('conv-1', 'hello');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      useAppStore.getState().setActiveTab('conv-1');
      expect(useAppStore.getState().tabs['conv-1'].streamingText).toBe('hello');
    });
  });

  // --- reorderTabs ---
  describe('reorderTabs', () => {
    it('should reorder tabOrder', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().openTab('conv-2', 'Chat 2');
      useAppStore.getState().openTab('conv-3', 'Chat 3');
      useAppStore.getState().reorderTabs(['conv-3', 'conv-1', 'conv-2']);
      expect(useAppStore.getState().tabOrder).toEqual(['conv-3', 'conv-1', 'conv-2']);
    });
  });

  // --- updateTabTitle ---
  describe('updateTabTitle', () => {
    it('should update the title of a tab', () => {
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      useAppStore.getState().updateTabTitle('conv-1', 'Renamed Chat');
      expect(useAppStore.getState().tabs['conv-1'].title).toBe('Renamed Chat');
    });
  });
});

describe('Per-tab streaming actions', () => {
  beforeEach(() => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
  });

  it('setTabMessages should set messages for a tab', () => {
    const msgs = [{ id: 'm1', conversationId: 'conv-1', role: 'user' as const, content: 'hi', metadata: null, createdAt: '' }];
    useAppStore.getState().setTabMessages('conv-1', msgs);
    expect(useAppStore.getState().tabs['conv-1'].messages).toEqual(msgs);
    expect(useAppStore.getState().tabs['conv-1'].messagesLoaded).toBe(true);
  });

  it('addTabMessage should append a message and dedup by id', () => {
    const msg1 = { id: 'm1', conversationId: 'conv-1', role: 'user' as const, content: 'hi', metadata: null, createdAt: '' };
    useAppStore.getState().addTabMessage('conv-1', msg1);
    useAppStore.getState().addTabMessage('conv-1', msg1); // dup
    expect(useAppStore.getState().tabs['conv-1'].messages).toHaveLength(1);
  });

  it('appendTabStreamingText should append delta text', () => {
    useAppStore.getState().appendTabStreamingText('conv-1', 'Hello ');
    useAppStore.getState().appendTabStreamingText('conv-1', 'World');
    expect(useAppStore.getState().tabs['conv-1'].streamingText).toBe('Hello World');
  });

  it('setTabIsStreaming should toggle streaming flag', () => {
    useAppStore.getState().setTabIsStreaming('conv-1', true);
    expect(useAppStore.getState().tabs['conv-1'].isStreaming).toBe(true);
    useAppStore.getState().setTabIsStreaming('conv-1', false);
    expect(useAppStore.getState().tabs['conv-1'].isStreaming).toBe(false);
  });

  it('clearTabStreaming should reset all streaming state', () => {
    useAppStore.getState().appendTabStreamingText('conv-1', 'text');
    useAppStore.getState().setTabIsStreaming('conv-1', true);
    useAppStore.getState().appendTabReasoningText('conv-1', 'reason');
    useAppStore.getState().clearTabStreaming('conv-1');
    const tab = useAppStore.getState().tabs['conv-1'];
    expect(tab.streamingText).toBe('');
    expect(tab.isStreaming).toBe(false);
    expect(tab.toolRecords).toEqual([]);
    expect(tab.reasoningText).toBe('');
    expect(tab.turnContentSegments).toEqual([]);
    expect(tab.turnSegments).toEqual([]);
    expect(tab.copilotError).toBeNull();
  });

  it('addTabToolRecord should add a tool record', () => {
    const record = { toolCallId: 'tc1', toolName: 'test', status: 'running' as const };
    useAppStore.getState().addTabToolRecord('conv-1', record);
    expect(useAppStore.getState().tabs['conv-1'].toolRecords).toHaveLength(1);
    expect(useAppStore.getState().tabs['conv-1'].toolRecords[0].toolCallId).toBe('tc1');
  });

  it('updateTabToolRecord should update an existing tool record', () => {
    const record = { toolCallId: 'tc1', toolName: 'test', status: 'running' as const };
    useAppStore.getState().addTabToolRecord('conv-1', record);
    useAppStore.getState().updateTabToolRecord('conv-1', 'tc1', { status: 'success' });
    expect(useAppStore.getState().tabs['conv-1'].toolRecords[0].status).toBe('success');
  });

  it('appendTabReasoningText should append reasoning delta', () => {
    useAppStore.getState().appendTabReasoningText('conv-1', 'step 1');
    useAppStore.getState().appendTabReasoningText('conv-1', ' step 2');
    expect(useAppStore.getState().tabs['conv-1'].reasoningText).toBe('step 1 step 2');
  });

  it('addTabTurnContentSegment should add a segment', () => {
    useAppStore.getState().addTabTurnContentSegment('conv-1', 'content block');
    expect(useAppStore.getState().tabs['conv-1'].turnContentSegments).toEqual(['content block']);
  });

  it('addTabTurnSegment should add a turn segment', () => {
    const seg = { type: 'text' as const, content: 'hello' };
    useAppStore.getState().addTabTurnSegment('conv-1', seg);
    expect(useAppStore.getState().tabs['conv-1'].turnSegments).toHaveLength(1);
  });

  it('updateTabToolInTurnSegments should update tool segment', () => {
    const seg = { type: 'tool' as const, toolCallId: 'tc1', toolName: 'test', status: 'running' as const };
    useAppStore.getState().addTabTurnSegment('conv-1', seg);
    useAppStore.getState().updateTabToolInTurnSegments('conv-1', 'tc1', { status: 'success' });
    const segments = useAppStore.getState().tabs['conv-1'].turnSegments;
    expect(segments[0].type === 'tool' && segments[0].status).toBe('success');
  });

  it('setTabCopilotError should set error on the tab', () => {
    useAppStore.getState().setTabCopilotError('conv-1', 'something broke');
    expect(useAppStore.getState().tabs['conv-1'].copilotError).toBe('something broke');
  });

  it('should not throw for operations on non-existent tab', () => {
    expect(() => useAppStore.getState().appendTabStreamingText('nonexistent', 'x')).not.toThrow();
    expect(() => useAppStore.getState().setTabIsStreaming('nonexistent', true)).not.toThrow();
  });
});

describe('Tab localStorage restore', () => {
  it('should restore tabs from localStorage on restoreOpenTabs call', () => {
    const saved = [
      { id: 'conv-a', title: 'Chat A', conversationId: 'conv-a' },
      { id: 'conv-b', title: 'Chat B', conversationId: 'conv-b' },
    ];
    localStorage.setItem('ai-terminal:openTabs', JSON.stringify(saved));
    useAppStore.getState().restoreOpenTabs();
    const state = useAppStore.getState();
    expect(state.tabOrder).toEqual(['conv-a', 'conv-b']);
    expect(state.tabs['conv-a']).toBeTruthy();
    expect(state.tabs['conv-a'].title).toBe('Chat A');
    expect(state.tabs['conv-a'].messagesLoaded).toBe(false);
    expect(state.tabs['conv-b']).toBeTruthy();
    expect(state.tabs['conv-b'].title).toBe('Chat B');
  });

  it('should set activeTabId to the first restored tab', () => {
    const saved = [
      { id: 'conv-a', title: 'Chat A', conversationId: 'conv-a' },
    ];
    localStorage.setItem('ai-terminal:openTabs', JSON.stringify(saved));
    useAppStore.getState().restoreOpenTabs();
    expect(useAppStore.getState().activeTabId).toBe('conv-a');
  });

  it('should handle empty or invalid localStorage gracefully', () => {
    localStorage.setItem('ai-terminal:openTabs', 'invalid-json');
    expect(() => useAppStore.getState().restoreOpenTabs()).not.toThrow();
    expect(useAppStore.getState().tabOrder).toEqual([]);
  });

  it('should not restore if localStorage is empty', () => {
    useAppStore.getState().restoreOpenTabs();
    expect(useAppStore.getState().tabOrder).toEqual([]);
    expect(useAppStore.getState().activeTabId).toBeNull();
  });
});

describe('disabledSkills localStorage restore', () => {
  beforeEach(() => {
    useAppStore.setState({ disabledSkills: [] });
    localStorage.removeItem('ai-terminal:disabledSkills');
  });

  it('should restore disabledSkills from localStorage via restoreDisabledSkills', () => {
    localStorage.setItem('ai-terminal:disabledSkills', JSON.stringify(['skill-a', 'skill-b']));
    useAppStore.getState().restoreDisabledSkills();
    expect(useAppStore.getState().disabledSkills).toEqual(['skill-a', 'skill-b']);
  });

  it('should handle invalid JSON gracefully', () => {
    localStorage.setItem('ai-terminal:disabledSkills', 'not-json');
    expect(() => useAppStore.getState().restoreDisabledSkills()).not.toThrow();
    expect(useAppStore.getState().disabledSkills).toEqual([]);
  });

  it('should keep empty array when localStorage has no disabledSkills', () => {
    useAppStore.getState().restoreDisabledSkills();
    expect(useAppStore.getState().disabledSkills).toEqual([]);
  });
});

describe('Tab soft limit', () => {
  it('openTab should set tabLimitWarning when reaching 15 tabs', () => {
    for (let i = 0; i < 15; i++) {
      useAppStore.getState().openTab(`conv-${i}`, `Chat ${i}`);
    }
    expect(useAppStore.getState().tabLimitWarning).toBe(true);
  });

  it('openTab should not set tabLimitWarning when under 15 tabs', () => {
    for (let i = 0; i < 14; i++) {
      useAppStore.getState().openTab(`conv-${i}`, `Chat ${i}`);
    }
    expect(useAppStore.getState().tabLimitWarning).toBe(false);
  });

  it('closeTab should clear tabLimitWarning when dropping below 15', () => {
    for (let i = 0; i < 15; i++) {
      useAppStore.getState().openTab(`conv-${i}`, `Chat ${i}`);
    }
    expect(useAppStore.getState().tabLimitWarning).toBe(true);
    useAppStore.getState().closeTab('conv-0');
    expect(useAppStore.getState().tabLimitWarning).toBe(false);
  });
});
