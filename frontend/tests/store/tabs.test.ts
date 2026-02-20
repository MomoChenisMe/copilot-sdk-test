import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../../src/store/index';

// Helper: open a tab and return its generated tabId
function openTabAndGetId(conversationId: string, title: string): string {
  useAppStore.getState().openTab(conversationId, title);
  const state = useAppStore.getState();
  const tabId = state.tabOrder[state.tabOrder.length - 1];
  return tabId;
}

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
      const tabId = openTabAndGetId('conv-1', 'New Chat');
      const tab = useAppStore.getState().tabs[tabId];
      expect(tab).toBeTruthy();
      expect(tab.conversationId).toBe('conv-1');
      expect(tab.title).toBe('New Chat');
      expect(tab.messages).toEqual([]);
      expect(tab.streamingText).toBe('');
      expect(tab.isStreaming).toBe(false);
      expect(tab.toolRecords).toEqual([]);
      expect(tab.reasoningText).toBe('');
      expect(tab.turnContentSegments).toEqual([]);
      expect(tab.turnSegments).toEqual([]);
      expect(tab.copilotError).toBeNull();
      expect(tab.messagesLoaded).toBe(false);
    });

    it('should add tabId to tabOrder', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      expect(useAppStore.getState().tabOrder).toEqual([tabId]);
    });

    it('should set activeTabId to the new tab', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      expect(useAppStore.getState().activeTabId).toBe(tabId);
    });

    it('should not duplicate an already open tab, just activate it', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      openTabAndGetId('conv-2', 'Chat 2');
      useAppStore.getState().openTab('conv-1', 'Chat 1');
      const state = useAppStore.getState();
      expect(state.tabOrder).toHaveLength(2);
      expect(state.activeTabId).toBe(tab1Id);
    });

    it('should persist open tabs to localStorage', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      const tab2Id = openTabAndGetId('conv-2', 'Chat 2');
      const stored = JSON.parse(localStorage.getItem('codeforge:openTabs') ?? '[]');
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe(tab1Id);
      expect(stored[0].conversationId).toBe('conv-1');
      expect(stored[1].id).toBe(tab2Id);
      expect(stored[1].conversationId).toBe('conv-2');
    });
  });

  // --- closeTab ---
  describe('closeTab', () => {
    it('should remove the tab from tabs and tabOrder', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      const tab2Id = openTabAndGetId('conv-2', 'Chat 2');
      useAppStore.getState().closeTab(tab1Id);
      const state = useAppStore.getState();
      expect(state.tabs[tab1Id]).toBeUndefined();
      expect(state.tabOrder).toEqual([tab2Id]);
    });

    it('should activate the next tab when closing the active tab', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      const tab2Id = openTabAndGetId('conv-2', 'Chat 2');
      useAppStore.getState().setActiveTab(tab1Id);
      useAppStore.getState().closeTab(tab1Id);
      expect(useAppStore.getState().activeTabId).toBe(tab2Id);
    });

    it('should set activeTabId to null when closing the last tab', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().closeTab(tabId);
      expect(useAppStore.getState().activeTabId).toBeNull();
      expect(useAppStore.getState().tabOrder).toEqual([]);
    });

    it('should persist after close', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      const tab2Id = openTabAndGetId('conv-2', 'Chat 2');
      useAppStore.getState().closeTab(tab1Id);
      const stored = JSON.parse(localStorage.getItem('codeforge:openTabs') ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(tab2Id);
    });
  });

  // --- setActiveTab ---
  describe('setActiveTab', () => {
    it('should switch activeTabId', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      openTabAndGetId('conv-2', 'Chat 2');
      useAppStore.getState().setActiveTab(tab1Id);
      expect(useAppStore.getState().activeTabId).toBe(tab1Id);
    });

    it('should not clear streaming state of the previous tab', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().appendTabStreamingText(tab1Id, 'hello');
      openTabAndGetId('conv-2', 'Chat 2');
      useAppStore.getState().setActiveTab(tab1Id);
      expect(useAppStore.getState().tabs[tab1Id].streamingText).toBe('hello');
    });
  });

  // --- reorderTabs ---
  describe('reorderTabs', () => {
    it('should reorder tabOrder', () => {
      const tab1Id = openTabAndGetId('conv-1', 'Chat 1');
      const tab2Id = openTabAndGetId('conv-2', 'Chat 2');
      const tab3Id = openTabAndGetId('conv-3', 'Chat 3');
      useAppStore.getState().reorderTabs([tab3Id, tab1Id, tab2Id]);
      expect(useAppStore.getState().tabOrder).toEqual([tab3Id, tab1Id, tab2Id]);
    });
  });

  // --- updateTabTitle ---
  describe('updateTabTitle', () => {
    it('should update the title of a tab', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().updateTabTitle(tabId, 'Renamed Chat');
      expect(useAppStore.getState().tabs[tabId].title).toBe('Renamed Chat');
    });
  });
});

describe('Tab ID independent from conversationId', () => {
  it('openTab should generate an independent tab ID (not equal to conversationId)', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    const state = useAppStore.getState();
    const tabOrder = state.tabOrder;
    expect(tabOrder).toHaveLength(1);
    const tabId = tabOrder[0];
    // Tab ID should be different from conversationId
    expect(tabId).not.toBe('conv-1');
    // But the tab should still reference the conversation
    expect(state.tabs[tabId].conversationId).toBe('conv-1');
  });

  it('switchTabConversation should change the conversationId of a tab', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    const tabId = useAppStore.getState().tabOrder[0];
    useAppStore.getState().switchTabConversation(tabId, 'conv-2', 'Chat 2');
    const tab = useAppStore.getState().tabs[tabId];
    expect(tab.conversationId).toBe('conv-2');
    expect(tab.title).toBe('Chat 2');
    // Streaming state should be cleared
    expect(tab.streamingText).toBe('');
    expect(tab.messages).toEqual([]);
    expect(tab.messagesLoaded).toBe(false);
  });

  it('getTabIdByConversationId should find the tab with given conversationId', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    useAppStore.getState().openTab('conv-2', 'Chat 2');
    const tabId = useAppStore.getState().getTabIdByConversationId('conv-2');
    expect(tabId).toBeDefined();
    expect(useAppStore.getState().tabs[tabId!].conversationId).toBe('conv-2');
  });

  it('getTabIdByConversationId should return undefined for non-existent conversationId', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    const tabId = useAppStore.getState().getTabIdByConversationId('conv-999');
    expect(tabId).toBeUndefined();
  });

  it('openTab should reactivate existing tab with same conversationId', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    const firstTabId = useAppStore.getState().tabOrder[0];
    useAppStore.getState().openTab('conv-2', 'Chat 2');
    useAppStore.getState().openTab('conv-1', 'Chat 1'); // reopening
    expect(useAppStore.getState().activeTabId).toBe(firstTabId);
    expect(useAppStore.getState().tabOrder).toHaveLength(2);
  });
});

describe('Per-tab streaming actions', () => {
  let tabId: string;

  beforeEach(() => {
    tabId = openTabAndGetId('conv-1', 'Chat 1');
  });

  it('setTabMessages should set messages for a tab', () => {
    const msgs = [{ id: 'm1', conversationId: 'conv-1', role: 'user' as const, content: 'hi', metadata: null, createdAt: '' }];
    useAppStore.getState().setTabMessages(tabId, msgs);
    expect(useAppStore.getState().tabs[tabId].messages).toEqual(msgs);
    expect(useAppStore.getState().tabs[tabId].messagesLoaded).toBe(true);
  });

  it('addTabMessage should append a message and dedup by id', () => {
    const msg1 = { id: 'm1', conversationId: 'conv-1', role: 'user' as const, content: 'hi', metadata: null, createdAt: '' };
    useAppStore.getState().addTabMessage(tabId, msg1);
    useAppStore.getState().addTabMessage(tabId, msg1); // dup
    expect(useAppStore.getState().tabs[tabId].messages).toHaveLength(1);
  });

  it('appendTabStreamingText should append delta text', () => {
    useAppStore.getState().appendTabStreamingText(tabId, 'Hello ');
    useAppStore.getState().appendTabStreamingText(tabId, 'World');
    expect(useAppStore.getState().tabs[tabId].streamingText).toBe('Hello World');
  });

  it('setTabIsStreaming should toggle streaming flag', () => {
    useAppStore.getState().setTabIsStreaming(tabId, true);
    expect(useAppStore.getState().tabs[tabId].isStreaming).toBe(true);
    useAppStore.getState().setTabIsStreaming(tabId, false);
    expect(useAppStore.getState().tabs[tabId].isStreaming).toBe(false);
  });

  it('clearTabStreaming should reset all streaming state', () => {
    useAppStore.getState().appendTabStreamingText(tabId, 'text');
    useAppStore.getState().setTabIsStreaming(tabId, true);
    useAppStore.getState().appendTabReasoningText(tabId, 'reason');
    useAppStore.getState().clearTabStreaming(tabId);
    const tab = useAppStore.getState().tabs[tabId];
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
    useAppStore.getState().addTabToolRecord(tabId, record);
    expect(useAppStore.getState().tabs[tabId].toolRecords).toHaveLength(1);
    expect(useAppStore.getState().tabs[tabId].toolRecords[0].toolCallId).toBe('tc1');
  });

  it('updateTabToolRecord should update an existing tool record', () => {
    const record = { toolCallId: 'tc1', toolName: 'test', status: 'running' as const };
    useAppStore.getState().addTabToolRecord(tabId, record);
    useAppStore.getState().updateTabToolRecord(tabId, 'tc1', { status: 'success' });
    expect(useAppStore.getState().tabs[tabId].toolRecords[0].status).toBe('success');
  });

  it('appendTabReasoningText should append reasoning delta', () => {
    useAppStore.getState().appendTabReasoningText(tabId, 'step 1');
    useAppStore.getState().appendTabReasoningText(tabId, ' step 2');
    expect(useAppStore.getState().tabs[tabId].reasoningText).toBe('step 1 step 2');
  });

  it('addTabTurnContentSegment should add a segment', () => {
    useAppStore.getState().addTabTurnContentSegment(tabId, 'content block');
    expect(useAppStore.getState().tabs[tabId].turnContentSegments).toEqual(['content block']);
  });

  it('addTabTurnSegment should add a turn segment', () => {
    const seg = { type: 'text' as const, content: 'hello' };
    useAppStore.getState().addTabTurnSegment(tabId, seg);
    expect(useAppStore.getState().tabs[tabId].turnSegments).toHaveLength(1);
  });

  it('updateTabToolInTurnSegments should update tool segment', () => {
    const seg = { type: 'tool' as const, toolCallId: 'tc1', toolName: 'test', status: 'running' as const };
    useAppStore.getState().addTabTurnSegment(tabId, seg);
    useAppStore.getState().updateTabToolInTurnSegments(tabId, 'tc1', { status: 'success' });
    const segments = useAppStore.getState().tabs[tabId].turnSegments;
    expect(segments[0].type === 'tool' && segments[0].status).toBe('success');
  });

  it('setTabCopilotError should set error on the tab', () => {
    useAppStore.getState().setTabCopilotError(tabId, 'something broke');
    expect(useAppStore.getState().tabs[tabId].copilotError).toBe('something broke');
  });

  it('should not throw for operations on non-existent tab', () => {
    expect(() => useAppStore.getState().appendTabStreamingText('nonexistent', 'x')).not.toThrow();
    expect(() => useAppStore.getState().setTabIsStreaming('nonexistent', true)).not.toThrow();
  });
});

describe('Tab localStorage restore', () => {
  it('should restore tabs from localStorage on restoreOpenTabs call', () => {
    const saved = [
      { id: 'tab-a', title: 'Chat A', conversationId: 'conv-a' },
      { id: 'tab-b', title: 'Chat B', conversationId: 'conv-b' },
    ];
    localStorage.setItem('codeforge:openTabs', JSON.stringify(saved));
    useAppStore.getState().restoreOpenTabs();
    const state = useAppStore.getState();
    expect(state.tabOrder).toEqual(['tab-a', 'tab-b']);
    expect(state.tabs['tab-a']).toBeTruthy();
    expect(state.tabs['tab-a'].title).toBe('Chat A');
    expect(state.tabs['tab-a'].conversationId).toBe('conv-a');
    expect(state.tabs['tab-a'].messagesLoaded).toBe(false);
    expect(state.tabs['tab-b']).toBeTruthy();
    expect(state.tabs['tab-b'].title).toBe('Chat B');
  });

  it('should set activeTabId to the first restored tab', () => {
    const saved = [
      { id: 'tab-a', title: 'Chat A', conversationId: 'conv-a' },
    ];
    localStorage.setItem('codeforge:openTabs', JSON.stringify(saved));
    useAppStore.getState().restoreOpenTabs();
    expect(useAppStore.getState().activeTabId).toBe('tab-a');
  });

  it('should handle empty or invalid localStorage gracefully', () => {
    localStorage.setItem('codeforge:openTabs', 'invalid-json');
    expect(() => useAppStore.getState().restoreOpenTabs()).not.toThrow();
    expect(useAppStore.getState().tabOrder).toEqual([]);
  });

  it('should not restore if localStorage is empty', () => {
    useAppStore.getState().restoreOpenTabs();
    expect(useAppStore.getState().tabOrder).toEqual([]);
    expect(useAppStore.getState().activeTabId).toBeNull();
  });

  it('should migrate old format (no conversationId field) to new format', () => {
    // Old format: { id: conversationId, title } — id was used as both tabId and conversationId
    const oldFormat = [
      { id: 'conv-old-1', title: 'Old Chat 1' },
      { id: 'conv-old-2', title: 'Old Chat 2' },
    ];
    localStorage.setItem('codeforge:openTabs', JSON.stringify(oldFormat));
    useAppStore.getState().restoreOpenTabs();
    const state = useAppStore.getState();
    expect(state.tabOrder).toHaveLength(2);
    // After migration, tabs should have new UUIDs as keys (not old conversationIds)
    const tab1Id = state.tabOrder[0];
    const tab2Id = state.tabOrder[1];
    expect(state.tabs[tab1Id].conversationId).toBe('conv-old-1');
    expect(state.tabs[tab1Id].title).toBe('Old Chat 1');
    expect(state.tabs[tab2Id].conversationId).toBe('conv-old-2');
    expect(state.tabs[tab2Id].title).toBe('Old Chat 2');
    // Tab IDs should be newly generated UUIDs (different from old ids)
    expect(tab1Id).not.toBe('conv-old-1');
    expect(tab2Id).not.toBe('conv-old-2');
  });
});

describe('disabledSkills localStorage restore', () => {
  beforeEach(() => {
    useAppStore.setState({ disabledSkills: [] });
    localStorage.removeItem('codeforge:disabledSkills');
  });

  it('should restore disabledSkills from localStorage via restoreDisabledSkills', () => {
    localStorage.setItem('codeforge:disabledSkills', JSON.stringify(['skill-a', 'skill-b']));
    useAppStore.getState().restoreDisabledSkills();
    expect(useAppStore.getState().disabledSkills).toEqual(['skill-a', 'skill-b']);
  });

  it('should handle invalid JSON gracefully', () => {
    localStorage.setItem('codeforge:disabledSkills', 'not-json');
    expect(() => useAppStore.getState().restoreDisabledSkills()).not.toThrow();
    expect(useAppStore.getState().disabledSkills).toEqual([]);
  });

  it('should keep empty array when localStorage has no disabledSkills', () => {
    useAppStore.getState().restoreDisabledSkills();
    expect(useAppStore.getState().disabledSkills).toEqual([]);
  });
});

describe('SDK commands store', () => {
  beforeEach(() => {
    useAppStore.setState({ sdkCommands: [], sdkCommandsLoaded: false });
  });

  it('should have empty sdkCommands by default', () => {
    expect(useAppStore.getState().sdkCommands).toEqual([]);
    expect(useAppStore.getState().sdkCommandsLoaded).toBe(false);
  });

  it('setSdkCommands should update sdkCommands', () => {
    const cmds = [
      { name: 'explain', description: 'Explain code' },
      { name: 'fix', description: 'Fix code' },
    ];
    useAppStore.getState().setSdkCommands(cmds);
    expect(useAppStore.getState().sdkCommands).toEqual(cmds);
  });

  it('setSdkCommandsLoaded should update loaded flag', () => {
    useAppStore.getState().setSdkCommandsLoaded(true);
    expect(useAppStore.getState().sdkCommandsLoaded).toBe(true);
  });
});

describe('Tab mode (copilot/terminal)', () => {
  beforeEach(() => {
    useAppStore.setState({ tabs: {}, tabOrder: [], activeTabId: null });
  });

  it('openTab should default mode to copilot', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    expect(useAppStore.getState().tabs[tabId].mode).toBe('copilot');
  });

  it('setTabMode should change tab mode', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    useAppStore.getState().setTabMode(tabId, 'terminal');
    expect(useAppStore.getState().tabs[tabId].mode).toBe('terminal');
  });

  it('setTabMode should toggle back to copilot', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    useAppStore.getState().setTabMode(tabId, 'terminal');
    useAppStore.getState().setTabMode(tabId, 'copilot');
    expect(useAppStore.getState().tabs[tabId].mode).toBe('copilot');
  });

  it('setTabMode should not throw for non-existent tab', () => {
    expect(() => useAppStore.getState().setTabMode('nonexistent', 'terminal')).not.toThrow();
  });
});

describe('Draft tabs (lazy conversation creation)', () => {
  beforeEach(() => {
    useAppStore.setState({ tabs: {}, tabOrder: [], activeTabId: null });
    localStorage.clear();
  });

  it('openTab with null conversationId should create a draft tab', () => {
    useAppStore.getState().openTab(null, 'New Chat');
    const state = useAppStore.getState();
    const tabId = state.tabOrder[0];
    expect(tabId).toBeDefined();
    expect(state.tabs[tabId].conversationId).toBeNull();
    expect(state.tabs[tabId].title).toBe('New Chat');
    expect(state.activeTabId).toBe(tabId);
  });

  it('multiple draft tabs should be allowed (no dedup on null)', () => {
    useAppStore.getState().openTab(null, 'Draft 1');
    useAppStore.getState().openTab(null, 'Draft 2');
    const state = useAppStore.getState();
    expect(state.tabOrder).toHaveLength(2);
    expect(state.tabs[state.tabOrder[0]].conversationId).toBeNull();
    expect(state.tabs[state.tabOrder[1]].conversationId).toBeNull();
  });

  it('draft tabs should NOT be persisted to localStorage', () => {
    useAppStore.getState().openTab(null, 'Draft 1');
    useAppStore.getState().openTab('conv-1', 'Saved Chat');
    const stored = JSON.parse(localStorage.getItem('codeforge:openTabs') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].conversationId).toBe('conv-1');
  });

  it('materializeTabConversation should set conversationId on a draft tab', () => {
    useAppStore.getState().openTab(null, 'Draft');
    const tabId = useAppStore.getState().tabOrder[0];
    useAppStore.getState().materializeTabConversation(tabId, 'conv-new');
    const tab = useAppStore.getState().tabs[tabId];
    expect(tab.conversationId).toBe('conv-new');
  });

  it('materializeTabConversation should persist after materialization', () => {
    useAppStore.getState().openTab(null, 'Draft');
    const tabId = useAppStore.getState().tabOrder[0];
    useAppStore.getState().materializeTabConversation(tabId, 'conv-new');
    const stored = JSON.parse(localStorage.getItem('codeforge:openTabs') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].conversationId).toBe('conv-new');
  });

  it('materializeTabConversation should set messagesLoaded to true', () => {
    useAppStore.getState().openTab(null, 'Draft');
    const tabId = useAppStore.getState().tabOrder[0];
    expect(useAppStore.getState().tabs[tabId].messagesLoaded).toBe(false);
    useAppStore.getState().materializeTabConversation(tabId, 'conv-new');
    expect(useAppStore.getState().tabs[tabId].messagesLoaded).toBe(true);
  });

  it('materializeTabConversation should not throw for non-existent tab', () => {
    expect(() => useAppStore.getState().materializeTabConversation('nonexistent', 'conv-1')).not.toThrow();
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
    const firstTabId = useAppStore.getState().tabOrder[0];
    useAppStore.getState().closeTab(firstTabId);
    expect(useAppStore.getState().tabLimitWarning).toBe(false);
  });
});
