## ADDED Requirements

### Requirement: TabState 資料結構

系統 SHALL 在 Zustand Store 中定義 `TabState` 介面，每個 Tab 擁有獨立的對話和串流狀態。

#### Scenario: TabState 結構定義

- **WHEN** 系統定義 TabState 介面
- **THEN** TabState MUST 包含以下欄位：
  - `id: string` — Tab ID（等同 conversationId）
  - `conversationId: string` — 關聯的對話 ID
  - `title: string` — Tab 顯示標題
  - `messages: Message[]` — 對話訊息陣列
  - `streamingText: string` — 當前串流文字
  - `isStreaming: boolean` — 是否正在串流
  - `toolRecords: ToolRecord[]` — 工具執行記錄
  - `reasoningText: string` — 推理文字
  - `turnContentSegments: string[]` — Turn 內容片段
  - `turnSegments: TurnSegment[]` — 有序交錯片段
  - `copilotError: string | null` — 錯誤訊息
  - `messagesLoaded: boolean` — 訊息是否已從 API 載入
  - `createdAt: number` — 建立時間戳

### Requirement: Tab 全域狀態管理

系統 SHALL 在 Zustand Store 中新增 Tab 全域狀態，取代原有的單一 `activeConversationId` 和全域串流狀態。

#### Scenario: Tab 狀態初始化

- **WHEN** Store 初始化
- **THEN** Store MUST 包含以下 Tab 相關狀態：
  - `tabs: Record<string, TabState>` — 初始為 `{}`
  - `tabOrder: string[]` — 初始為 `[]`
  - `activeTabId: string | null` — 初始為 `null`

#### Scenario: Tab 狀態從 localStorage 恢復

- **WHEN** 頁面載入且 `localStorage('ai-terminal:openTabs')` 存在
- **THEN** Store MUST 從 localStorage 恢復 `tabOrder` 和 `activeTabId`，TabState 中的 `messages` 為空、`messagesLoaded` 為 `false`（懶載入）

#### Scenario: Tab 狀態持久化

- **WHEN** `tabOrder` 或 `activeTabId` 變更
- **THEN** 系統 MUST 同步寫入 `localStorage('ai-terminal:openTabs')` 為 JSON 格式 `{ tabOrder, activeTabId, tabMeta: Record<string, { conversationId, title }> }`

### Requirement: openTab 操作

系統 SHALL 提供 `openTab(conversationId, title)` action，用於建立或切換到 Tab。

#### Scenario: 建立新 Tab

- **WHEN** 呼叫 `openTab(conversationId, title)` 且該 conversationId 無對應 Tab
- **THEN** 系統 MUST 建立新 TabState（所有串流欄位為初始值、`messagesLoaded: false`），加入 `tabs` Record 和 `tabOrder` 尾部，設為 `activeTabId`

#### Scenario: 切換到已存在的 Tab

- **WHEN** 呼叫 `openTab(conversationId, title)` 且該 conversationId 已有對應 Tab
- **THEN** 系統 MUST 直接將 `activeTabId` 設為該 Tab 的 ID，MUST NOT 建立重複 Tab

### Requirement: closeTab 操作

系統 SHALL 提供 `closeTab(tabId)` action，用於關閉 Tab。

#### Scenario: 關閉非活躍 Tab

- **WHEN** 呼叫 `closeTab(tabId)` 且該 Tab 不是 `activeTabId`
- **THEN** 系統 MUST 從 `tabs` 和 `tabOrder` 中移除該 Tab，`activeTabId` 不變

#### Scenario: 關閉活躍 Tab

- **WHEN** 呼叫 `closeTab(tabId)` 且該 Tab 是 `activeTabId`
- **THEN** 系統 MUST 移除該 Tab 並自動切換到相鄰 Tab（優先選擇同 index 或前一個），若無剩餘 Tab 則 `activeTabId` 設為 `null`

#### Scenario: 關閉最後一個 Tab

- **WHEN** 呼叫 `closeTab(tabId)` 且 `tabOrder` 僅剩一個 Tab
- **THEN** 系統 MUST 移除該 Tab，`activeTabId` 設為 `null`，`tabOrder` 為空

#### Scenario: 關閉 Tab 不刪除對話

- **WHEN** 呼叫 `closeTab(tabId)`
- **THEN** 系統 MUST NOT 呼叫對話刪除 API，對話資料保留在資料庫中

### Requirement: setActiveTab 操作

系統 SHALL 提供 `setActiveTab(tabId)` action，用於切換活躍 Tab。

#### Scenario: 切換 Tab 不清除串流狀態

- **WHEN** 呼叫 `setActiveTab(tabId)`
- **THEN** 系統 MUST 僅更新 `activeTabId`，MUST NOT 重設任何 Tab 的串流狀態（與舊的 `setActiveConversationId` 不同）

#### Scenario: 切換到未載入訊息的 Tab

- **WHEN** `setActiveTab(tabId)` 被呼叫且該 Tab 的 `messagesLoaded === false`
- **THEN** AppShell MUST 從 API 載入該 Tab 對話的訊息，載入完成後設定 `messagesLoaded: true`

### Requirement: reorderTabs 操作

系統 SHALL 提供 `reorderTabs(tabIds)` action，用於拖拽重排 Tab 順序。

#### Scenario: 重排 Tab

- **WHEN** 呼叫 `reorderTabs(newOrder)`
- **THEN** 系統 MUST 替換 `tabOrder` 為 `newOrder`，`activeTabId` 和 `tabs` 不變

### Requirement: Per-Tab 串流 Actions

系統 SHALL 提供 per-tab 版本的所有串流操作 action，接受 `tabId` 作為第一個參數。

#### Scenario: appendTabStreamingText

- **WHEN** 呼叫 `appendTabStreamingText(tabId, delta)`
- **THEN** 系統 MUST 僅更新 `tabs[tabId].streamingText`，其他 Tab 不受影響

#### Scenario: 更新不存在的 Tab

- **WHEN** per-tab action 被呼叫但 `tabId` 不存在於 `tabs` 中
- **THEN** 系統 MUST 靜默忽略，MUST NOT 拋出錯誤

#### Scenario: clearTabStreaming

- **WHEN** 呼叫 `clearTabStreaming(tabId)`
- **THEN** 系統 MUST 重設該 Tab 的 `streamingText`、`isStreaming`、`toolRecords`、`reasoningText`、`turnContentSegments`、`turnSegments`、`copilotError` 為初始值

### Requirement: useTabCopilot 事件路由 Hook

系統 SHALL 提供 `useTabCopilot` hook，取代 `useCopilot`，負責將 WebSocket 事件路由到對應 Tab。

#### Scenario: 事件路由到正確 Tab

- **WHEN** WebSocket 收到帶有 `data.conversationId` 的 copilot 事件
- **THEN** hook MUST 查找 `tabs` 中 `conversationId` 匹配的 Tab，使用 per-tab actions 更新該 Tab 的狀態

#### Scenario: 無匹配 Tab 時丟棄事件

- **WHEN** WebSocket 收到帶有 `data.conversationId` 的事件但 `tabs` 中無匹配 Tab
- **THEN** hook MUST 靜默丟棄該事件，MUST NOT 拋出錯誤

#### Scenario: 全域事件處理

- **WHEN** WebSocket 收到 `copilot:active-streams` 或 `copilot:stream-status` 事件
- **THEN** hook MUST 更新全域 `activeStreams` 狀態，不限於特定 Tab

#### Scenario: Per-conversation dedup

- **WHEN** hook 處理事件
- **THEN** hook MUST 為每個 conversationId 維護獨立的 dedup Sets（seenMessageIds、seenToolCallIds、seenReasoningIds）

#### Scenario: Tab 關閉時清理 dedup

- **WHEN** 某個 Tab 被關閉
- **THEN** hook MUST 清理對應 conversationId 的 dedup Sets，防止記憶體洩漏

#### Scenario: copilot:idle 事件整合

- **WHEN** 收到 `copilot:idle` 事件
- **THEN** hook MUST 讀取對應 Tab 的串流狀態（turnContentSegments、streamingText、toolRecords、reasoningText、turnSegments），整合為 assistant Message 加入 `tabs[tabId].messages`，然後呼叫 `clearTabStreaming(tabId)`

### Requirement: TabBar 對話頁籤元件

系統 SHALL 重寫 TabBar 元件，從 copilot/terminal 切換變為對話 Tab 頁籤欄。

#### Scenario: TabBar 顯示

- **WHEN** 應用程式渲染
- **THEN** TabBar MUST 顯示在 TopBar 下方，高度 `h-10`，背景 `bg-bg-primary`，底部邊框 `border-border-subtle`

#### Scenario: Tab 項目渲染

- **WHEN** `tabOrder` 有 Tab 存在
- **THEN** 每個 Tab MUST 顯示：截斷的標題（`max-w-32 truncate`）、串流時的脈衝指示器、hover 時的 X 關閉按鈕

#### Scenario: 活躍 Tab 樣式

- **WHEN** Tab 為 `activeTabId`
- **THEN** Tab 按鈕 MUST 使用 `text-accent bg-accent-soft` 樣式

#### Scenario: 串流中 Tab 指示

- **WHEN** Tab 對應的對話有活躍串流（`activeStreams` 中存在）
- **THEN** Tab MUST 在標題前顯示脈衝圓點 `w-1.5 h-1.5 rounded-full bg-accent animate-pulse`

#### Scenario: 新增 Tab 按鈕

- **WHEN** TabBar 渲染
- **THEN** Tab 列表最右側 MUST 顯示「+」按鈕，點擊後建立新對話並開啟新 Tab

#### Scenario: 中鍵關閉 Tab

- **WHEN** 使用者在 Tab 上按下滑鼠中鍵
- **THEN** 系統 MUST 關閉該 Tab

#### Scenario: Tab 溢出捲動

- **WHEN** Tab 數量超過 TabBar 可見寬度
- **THEN** TabBar 容器 MUST 使用 `overflow-x-auto flex-nowrap` 提供水平捲動

#### Scenario: 無 Tab 時顯示

- **WHEN** `tabOrder` 為空
- **THEN** TabBar MUST 僅顯示「+」按鈕

### Requirement: AppShell Tab 管理

AppShell SHALL 作為 Tab 管理中心，協調 Tab 生命週期、訊息載入和串流訂閱。

#### Scenario: 建立新 Tab

- **WHEN** 使用者點擊 TabBar 的「+」按鈕或 Sidebar 的「新對話」
- **THEN** AppShell MUST 呼叫 conversation API 建立新對話，然後呼叫 `openTab(conversationId, title)`

#### Scenario: 切換 Tab 時懶載入訊息

- **WHEN** `activeTabId` 變更且新 Tab 的 `messagesLoaded === false`
- **THEN** AppShell MUST 呼叫 `conversationApi.getMessages(conversationId)` 載入訊息至 Tab 的 `messages`，設定 `messagesLoaded: true`

#### Scenario: 切換 Tab 時訂閱活躍串流

- **WHEN** `activeTabId` 變更且新 Tab 的對話有活躍串流
- **THEN** AppShell MUST 發送 `copilot:subscribe` 訊息訂閱該對話串流

#### Scenario: WebSocket 重連時重新訂閱

- **WHEN** WebSocket 重新連線
- **THEN** AppShell MUST 查詢 `copilot:active-streams`，對所有開啟 Tab 中有活躍串流的對話重新發送 `copilot:subscribe`

#### Scenario: 只渲染活躍 Tab

- **WHEN** 有多個 Tab 開啟
- **THEN** AppShell MUST 僅渲染 `activeTabId` 對應的 ChatView，背景 Tab 的串流狀態在 Store 中更新但不觸發 ChatView 渲染

### Requirement: Sidebar 簡化為歷史瀏覽器

Sidebar SHALL 簡化為對話歷史瀏覽器，配合 Tab 系統運作。

#### Scenario: 點擊歷史對話

- **WHEN** 使用者在 Sidebar 點擊歷史對話
- **THEN** 系統 MUST 呼叫 `openTab(conversationId, title)` 在 Tab 中開啟（若已有 Tab 則切換過去），然後關閉 Sidebar

#### Scenario: 已開啟 Tab 標記

- **WHEN** Sidebar 顯示對話列表
- **THEN** 已在 Tab 中開啟的對話 MUST 顯示視覺標記（如不同背景色或 icon）

#### Scenario: 保留搜尋和管理功能

- **WHEN** Sidebar 渲染
- **THEN** Sidebar MUST 保留搜尋、釘選、重命名、刪除功能

### Requirement: ChatView Tab 適配

ChatView SHALL 從 Tab 特定狀態讀取資料，取代全域狀態。

#### Scenario: ChatView 讀取 Tab 狀態

- **WHEN** ChatView 渲染
- **THEN** ChatView MUST 透過 `useAppStore(s => s.tabs[tabId])` 讀取 messages、streamingText、isStreaming、toolRecords、reasoningText、turnSegments、copilotError

#### Scenario: ChatView 接收 tabId props

- **WHEN** AppShell 渲染 ChatView
- **THEN** AppShell MUST 傳遞 `tabId` 和 `conversationId` 作為 props

### Requirement: Tab 軟性上限

系統 SHALL 提供 Tab 數量軟性上限，防止記憶體過度使用。

#### Scenario: 達到 Tab 上限

- **WHEN** 開啟的 Tab 數量達到 15 個且使用者嘗試建立新 Tab
- **THEN** 系統 MUST 顯示提示訊息「已達 Tab 上限，請先關閉不用的 Tab」，MUST NOT 阻止建立

### Requirement: Tab 相關 i18n

系統 SHALL 新增 Tab 相關的 i18n 翻譯。

#### Scenario: 新增翻譯 key

- **WHEN** Tab 系統渲染
- **THEN** 系統 MUST 支援以下 key：`tabBar.newTab`、`tabBar.closeTab`、`tabBar.closeOthers`、`tabBar.rename`、`tabBar.tabLimit`
