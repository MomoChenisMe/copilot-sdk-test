import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useConversations } from '../../hooks/useConversations';
import { useTabCopilot } from '../../hooks/useTabCopilot';
import { useTerminal } from '../../hooks/useTerminal';
import { useModels } from '../../hooks/useModels';
import { conversationApi } from '../../lib/api';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { Sidebar } from './Sidebar';
import { ChatView } from '../copilot/ChatView';
import { TerminalView } from '../terminal/TerminalView';
import { SettingsPanel } from '../settings/SettingsPanel';

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cwd] = useState('/home');

  const { status, send, subscribe } = useWebSocket(onLogout);
  const {
    conversations,
    create: createConversation,
    update: updateConversation,
    remove: removeConversation,
    search: searchConversations,
  } = useConversations();

  // Load models from API
  useModels();

  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const models = useAppStore((s) => s.models);

  // Tab state
  const activeTabId = useAppStore((s) => s.activeTabId);
  const tabs = useAppStore((s) => s.tabs);
  const openTab = useAppStore((s) => s.openTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const { sendMessage, abortMessage, cleanupDedup } = useTabCopilot({ subscribe, send });

  const terminalWriteRef = useRef<((data: string) => void) | null>(null);
  const { writeRef, handleData, handleResize, handleReady } = useTerminal({
    send,
    subscribe,
    cwd,
  });

  // Assign the terminal writeRef
  terminalWriteRef.current = writeRef.current;

  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const getInitialTheme = useAppStore((s) => s.getInitialTheme);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const activePresets = useAppStore((s) => s.activePresets);
  const togglePreset = useAppStore((s) => s.togglePreset);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = getInitialTheme();
    if (savedTheme !== theme) {
      useAppStore.setState({ theme: savedTheme });
    }
    document.documentElement.dataset.theme = savedTheme;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync data-theme attribute when theme changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Initialize language from i18n on mount
  const { i18n } = useTranslation();
  useEffect(() => {
    const currentLng = i18n.language || 'en';
    const normalized = currentLng.startsWith('zh') ? 'zh-TW' : 'en';
    if (normalized !== language) {
      setLanguage(normalized);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore persisted state on mount
  useEffect(() => {
    useAppStore.getState().restoreOpenTabs();
    useAppStore.getState().restoreDisabledSkills();
    // Sync activeConversationId with restored activeTabId
    const restoredTabId = useAppStore.getState().activeTabId;
    if (restoredTabId) {
      setActiveConversationId(restoredTabId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLanguageToggle = useCallback(() => {
    const next = language === 'zh-TW' ? 'en' : 'zh-TW';
    i18n.changeLanguage(next);
    setLanguage(next);
  }, [language, i18n, setLanguage]);

  const lastSelectedModel = useAppStore((s) => s.lastSelectedModel);
  const setLastSelectedModel = useAppStore((s) => s.setLastSelectedModel);
  const defaultModel = lastSelectedModel || models[0]?.id || '';

  // --- Tab management ---
  const handleNewTab = useCallback(async () => {
    const model = lastSelectedModel || models[0]?.id || 'gpt-4o';
    const conv = await createConversation(model, cwd);
    openTab(conv.id, conv.title || t('tabBar.newTab', 'New Chat'));
    setActiveConversationId(conv.id);
    setSidebarOpen(false);
  }, [createConversation, cwd, openTab, setActiveConversationId, models, lastSelectedModel, t]);

  const handleSelectTab = useCallback(
    async (tabId: string) => {
      setActiveTab(tabId);
      setActiveConversationId(tabId);

      // Lazy-load messages if not yet loaded
      const tab = useAppStore.getState().tabs[tabId];
      if (tab && !tab.messagesLoaded) {
        try {
          const msgs = await conversationApi.getMessages(tabId);
          useAppStore.getState().setTabMessages(tabId, msgs);
        } catch {
          // ignore
        }
      }

      // Subscribe to active stream if exists
      const activeStreams = useAppStore.getState().activeStreams;
      if (activeStreams[tabId]) {
        send({ type: 'copilot:subscribe', data: { conversationId: tabId } });
      }
    },
    [setActiveTab, setActiveConversationId, send],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      closeTab(tabId);
      cleanupDedup(tabId);
      // Update activeConversationId to match new activeTabId
      const newActiveTabId = useAppStore.getState().activeTabId;
      setActiveConversationId(newActiveTabId);
    },
    [closeTab, cleanupDedup, setActiveConversationId],
  );

  // Legacy: new conversation also opens a tab
  const handleNewConversation = handleNewTab;

  const handleSelectConversation = useCallback(
    async (id: string) => {
      openTab(id, conversations.find((c) => c.id === id)?.title || 'Chat');
      setActiveConversationId(id);
      setSidebarOpen(false);

      // Lazy-load messages
      const tab = useAppStore.getState().tabs[id];
      if (tab && !tab.messagesLoaded) {
        try {
          const msgs = await conversationApi.getMessages(id);
          useAppStore.getState().setTabMessages(id, msgs);
        } catch {
          // ignore
        }
      }
    },
    [openTab, setActiveConversationId, conversations],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!activeTabId) return;
      sendMessage(activeTabId, text);
    },
    [activeTabId, sendMessage],
  );

  const handleAbort = useCallback(() => {
    if (!activeTabId) return;
    abortMessage(activeTabId);
  }, [activeTabId, abortMessage]);

  const handleHomeClick = useCallback(() => {
    setActiveConversationId(null);
    useAppStore.setState({ activeTabId: null });
  }, [setActiveConversationId]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      setLastSelectedModel(modelId);
      if (activeTabId) {
        updateConversation(activeTabId, { model: modelId });
      }
    },
    [activeTabId, updateConversation, setLastSelectedModel],
  );

  // WebSocket reconnect: re-subscribe to all active streams
  useEffect(() => {
    if (status === 'connected') {
      // Query active streams on connect
      send({ type: 'copilot:status', data: {} });
    }
  }, [status, send]);

  // Get active tab state for rendering
  const activeTab = activeTabId ? tabs[activeTabId] : null;
  const activeConversation = conversations.find((c) => c.id === activeTabId);

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <TopBar
        title={activeConversation?.title || t('app.title')}
        status={status}
        theme={theme}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onThemeToggle={toggleTheme}
        onHomeClick={handleHomeClick}
        onNewChat={handleNewTab}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
      />

      <TabBar
        onNewTab={handleNewTab}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
      />

      <div className="flex-1 overflow-hidden relative">
        {/* Main content area */}
        <div className="h-full flex flex-col">
          <ChatView
            tabId={activeTabId}
            onNewConversation={handleNewConversation}
            onSend={handleSend}
            onAbort={handleAbort}
            isStreaming={activeTab?.isStreaming ?? false}
            disabled={!activeTabId}
            currentModel={activeConversation?.model || defaultModel}
            onModelChange={handleModelChange}
          />
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activePresets={activePresets}
        onTogglePreset={togglePreset}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeTabId}
        openTabIds={Object.keys(tabs)}
        onSelect={handleSelectConversation}
        onCreate={handleNewTab}
        onDelete={async (id) => {
          await removeConversation(id);
          // Close the tab if it's open
          if (tabs[id]) {
            handleCloseTab(id);
          }
          if (activeConversationId === id) setActiveConversationId(null);
        }}
        onPin={async (id, pinned) => {
          await updateConversation(id, { pinned });
        }}
        onRename={async (id, title) => {
          await updateConversation(id, { title });
          // Update tab title too
          useAppStore.getState().updateTabTitle(id, title);
        }}
        onSearch={searchConversations}
        language={language}
        onLanguageToggle={handleLanguageToggle}
        onLogout={onLogout}
      />
    </div>
  );
}
