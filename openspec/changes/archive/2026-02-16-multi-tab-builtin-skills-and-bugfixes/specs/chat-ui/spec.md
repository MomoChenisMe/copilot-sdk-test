## MODIFIED Requirements

### Requirement: 側邊欄串流指示器

系統 SHALL 在 Sidebar 的對話列表中，為正在進行背景串流的對話顯示視覺指示器。已開啟的 Tab 對話 MUST 額外顯示標記。

#### Scenario: 活躍串流對話顯示脈衝圓點

- **WHEN** Sidebar 對話列表渲染，且某個對話 ID 存在於 `activeStreams` 狀態中
- **THEN** 該對話項目 MUST 在右側顯示一個脈衝動畫的小圓點（`w-2 h-2 rounded-full bg-accent`），使用 `animate-pulse` 動畫效果

#### Scenario: 串流完成後圓點消失

- **WHEN** 接收到 `copilot:stream-status` 訊息且 `status` 為 `'idle'` 或 `'completed'`
- **THEN** 對應對話項目的脈衝圓點 MUST 立即移除

#### Scenario: 多對話同時串流

- **WHEN** 多個對話同時有活躍串流
- **THEN** 每個活躍串流的對話項目 MUST 各自獨立顯示脈衝圓點

#### Scenario: 頁面載入時同步串流狀態

- **WHEN** 前端 WebSocket 連線建立或重連
- **THEN** 前端 MUST 發送 `copilot:status` 訊息查詢當前所有活躍串流，並根據回傳的 `copilot:active-streams` 更新 Sidebar 中的脈衝圓點

#### Scenario: 已開啟 Tab 的對話標記

- **WHEN** Sidebar 渲染對話列表
- **THEN** 已在 Tab 中開啟的對話 MUST 顯示視覺區分（如不同背景色或 Tab icon 標記），讓使用者辨識哪些對話已在 Tab 中

## ADDED Requirements

### Requirement: ChatView Tab 適配

ChatView SHALL 從 Tab 特定狀態讀取資料，接收 `tabId` 作為 props。

#### Scenario: ChatView 讀取 Tab 狀態

- **WHEN** ChatView 渲染且接收 `tabId` props
- **THEN** ChatView MUST 透過 Zustand selector `useAppStore(s => s.tabs[tabId])` 讀取 messages、streamingText、isStreaming、toolRecords、reasoningText、turnSegments、copilotError

#### Scenario: ChatView 無 Tab 時

- **WHEN** `activeTabId` 為 null
- **THEN** AppShell MUST 顯示歡迎畫面，MUST NOT 渲染 ChatView

#### Scenario: 發送訊息綁定 Tab

- **WHEN** 使用者在 ChatView 中發送訊息
- **THEN** 系統 MUST 使用該 Tab 的 `conversationId` 發送 `copilot:send` WebSocket 訊息
