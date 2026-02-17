import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store/index';

function openTabAndGetId(conversationId: string, title: string): string {
  useAppStore.getState().openTab(conversationId, title);
  const state = useAppStore.getState();
  return state.tabOrder[state.tabOrder.length - 1];
}

beforeEach(() => {
  useAppStore.setState({
    tabs: {},
    tabOrder: [],
    activeTabId: null,
  });
});

describe('Usage tracking in TabState', () => {
  it('should initialize tab with default usage values', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat');
    const tab = useAppStore.getState().tabs[tabId];
    expect(tab.usage).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      contextWindowUsed: 0,
      contextWindowMax: 0,
    });
  });

  it('should accumulate tokens with updateTabUsage', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat');
    useAppStore.getState().updateTabUsage(tabId, 100, 50);
    useAppStore.getState().updateTabUsage(tabId, 200, 80);
    const tab = useAppStore.getState().tabs[tabId];
    expect(tab.usage.inputTokens).toBe(300);
    expect(tab.usage.outputTokens).toBe(130);
  });

  it('should update context window with updateTabContextWindow', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat');
    useAppStore.getState().updateTabContextWindow(tabId, 50000, 128000);
    const tab = useAppStore.getState().tabs[tabId];
    expect(tab.usage.contextWindowUsed).toBe(50000);
    expect(tab.usage.contextWindowMax).toBe(128000);
  });

  it('should not affect other tabs', () => {
    const tabId1 = openTabAndGetId('conv-1', 'Chat 1');
    const tabId2 = openTabAndGetId('conv-2', 'Chat 2');
    useAppStore.getState().updateTabUsage(tabId1, 100, 50);
    useAppStore.getState().updateTabContextWindow(tabId1, 20000, 128000);
    const tab2 = useAppStore.getState().tabs[tabId2];
    expect(tab2.usage.inputTokens).toBe(0);
    expect(tab2.usage.contextWindowUsed).toBe(0);
  });

  it('should no-op for non-existent tab', () => {
    expect(() => {
      useAppStore.getState().updateTabUsage('nonexistent', 100, 50);
      useAppStore.getState().updateTabContextWindow('nonexistent', 100, 128000);
    }).not.toThrow();
  });

  it('should reset usage on clearTabStreaming', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat');
    useAppStore.getState().updateTabUsage(tabId, 100, 50);
    useAppStore.getState().updateTabContextWindow(tabId, 20000, 128000);
    useAppStore.getState().clearTabStreaming(tabId);
    const tab = useAppStore.getState().tabs[tabId];
    // Usage should persist across clearTabStreaming — NOT reset
    // Token counts are cumulative per conversation session
    expect(tab.usage.inputTokens).toBe(100);
    expect(tab.usage.outputTokens).toBe(50);
  });
});
