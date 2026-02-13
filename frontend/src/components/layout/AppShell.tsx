import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useConversations } from '../../hooks/useConversations';
import { useCopilot } from '../../hooks/useCopilot';
import { useTerminal } from '../../hooks/useTerminal';
import { conversationApi } from '../../lib/api';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { Sidebar } from './Sidebar';
import { ChatView } from '../copilot/ChatView';
import { TerminalView } from '../terminal/TerminalView';

type ActiveTab = 'copilot' | 'terminal';

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('copilot');
  const [cwd, setCwd] = useState('/home');

  const { status, send, subscribe } = useWebSocket(onLogout);
  const {
    conversations,
    create: createConversation,
    update: updateConversation,
    remove: removeConversation,
    search: searchConversations,
    refresh: refreshConversations,
  } = useConversations();

  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const setMessages = useAppStore((s) => s.setMessages);

  const { sendMessage, abortMessage } = useCopilot({ subscribe, send });

  const terminalWriteRef = useRef<((data: string) => void) | null>(null);
  const { writeRef, handleData, handleResize, handleReady } = useTerminal({
    send,
    subscribe,
    cwd,
  });

  // Assign the terminal writeRef
  terminalWriteRef.current = writeRef.current;

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleNewConversation = useCallback(async () => {
    const conv = await createConversation('gpt-5', cwd);
    setActiveConversationId(conv.id);
    setSidebarOpen(false);
  }, [createConversation, cwd, setActiveConversationId]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setSidebarOpen(false);
      // Load messages for this conversation
      try {
        const msgs = await conversationApi.getMessages(id);
        setMessages(msgs);
      } catch {
        // ignore
      }
    },
    [setActiveConversationId, setMessages],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!activeConversationId) return;
      sendMessage(activeConversationId, text);
    },
    [activeConversationId, sendMessage],
  );

  const handleCwdChange = useCallback(
    (newCwd: string) => {
      setCwd(newCwd);
      send({ type: 'cwd:change', data: { cwd: newCwd } });
    },
    [send],
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      if (activeConversationId) {
        updateConversation(activeConversationId, { title: activeConversation?.title });
        // Model changes will be applied on next session creation
      }
    },
    [activeConversationId, updateConversation, activeConversation],
  );

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <TopBar
        title={activeConversation?.title || 'AI Terminal'}
        cwd={cwd}
        status={status}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onCwdChange={handleCwdChange}
      />

      <div className="flex-1 overflow-hidden relative">
        {/* Main content area */}
        <div className={`h-full ${activeTab === 'copilot' ? 'block' : 'hidden'}`}>
          <ChatView />
        </div>
        <div className={`h-full ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
          <TerminalView
            onData={handleData}
            onResize={handleResize}
            onReady={handleReady}
            writeRef={writeRef}
          />
        </div>
      </div>

      <BottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSend={handleSend}
        onAbort={abortMessage}
        isStreaming={isStreaming}
        disabled={!activeConversationId}
        currentModel={activeConversation?.model || 'gpt-5'}
        onModelChange={handleModelChange}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onCreate={handleNewConversation}
        onDelete={async (id) => {
          await removeConversation(id);
          if (activeConversationId === id) setActiveConversationId(null);
        }}
        onPin={async (id, pinned) => {
          await updateConversation(id, { pinned });
        }}
        onRename={async (id, title) => {
          await updateConversation(id, { title });
        }}
        onSearch={searchConversations}
      />
    </div>
  );
}
