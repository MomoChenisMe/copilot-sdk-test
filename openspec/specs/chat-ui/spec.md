## MODIFIED Requirements

### Requirement: 新 Tab 自動聚焦輸入框

建立新 Tab 或切換 Tab 後，聊天輸入框 SHALL 自動獲得焦點（focus）。

#### Scenario: 新建 Tab 聚焦

- **WHEN** 使用者點擊 Tab bar 的 "+" 按鈕建立新 Tab
- **THEN** 新 Tab 的聊天輸入框 textarea MUST 自動獲得焦點
- **AND** 使用者 MUST 可以直接開始打字，無需手動點擊輸入框

#### Scenario: 切換到已有訊息的 Tab 也聚焦

- **WHEN** 使用者切換到一個已有訊息的既有 Tab
- **THEN** 系統 MUST 自動聚焦輸入框
- **AND** 不影響訊息區域的捲動位置

#### Scenario: 進入系統後自動聚焦

- **WHEN** 使用者首次進入系統或重新載入頁面
- **THEN** 活躍 Tab 的輸入框 MUST 自動獲得焦點

#### Scenario: Input 組件暴露 focus 方法

- **WHEN** Input 組件被 ChatView 引用
- **THEN** Input MUST 透過 `forwardRef` + `useImperativeHandle` 暴露 `focus()` 方法
- **AND** ChatView MUST 在偵測到 tabId 變更時透過 `requestAnimationFrame` 呼叫此方法，確保 DOM 已就緒

#### Scenario: Input 組件支援 statusText

- **WHEN** ChatView 傳入 `statusText` prop 至 Input 組件
- **THEN** Input MUST 在附件按鈕左側渲染該文字
- **AND** 樣式 MUST 為 `text-[10px] text-text-muted tabular-nums`

#### Scenario: Input leftActions 在所有尺寸可見

- **WHEN** Input 元件渲染 leftActions
- **THEN** leftActions 容器 MUST 在 desktop 和 mobile 都可見（移除 `md:hidden` 限制）
- **AND** MobileToolbarPopup MUST 獨立使用 `md:hidden` 包裹，僅在 mobile 顯示
- **AND** Clock 排程按鈕和 WebSearchToggle MUST 在所有尺寸顯示

### Requirement: TaskPanel 即時顯示 AI 待辦追蹤

TaskPanel MUST 顯示 SDK `todos` 表的即時狀態，包含進度條、4 種狀態圖示、可展開 description。TaskPanel 嵌入在聊天訊息列表上方，當 todos 為空時不渲染。

#### Scenario: 接收 copilot:todos_updated 事件並更新 UI

- **WHEN** 前端 WebSocket 接收到 `copilot:todos_updated` 事件
- **THEN** MUST 解析 `data.todos` 陣列並呼叫 `setTabTasks(tabId, todos)` 更新 store
- **AND** TaskPanel MUST 即時重新渲染顯示最新 todos 狀態

#### Scenario: todos 為空時不顯示 TaskPanel

- **WHEN** store 中 `tasks` 陣列長度為 0
- **THEN** TaskPanel MUST 回傳 `null`，不渲染任何 DOM 元素

#### Scenario: 進度條顯示完成百分比

- **WHEN** TaskPanel 渲染且有至少一個 todo
- **THEN** MUST 在 header 下方顯示進度條，寬度為 `(done count / total count) * 100%`，使用 green 填充色搭配灰色背景

#### Scenario: pending 狀態顯示

- **WHEN** todo 的 `status` 為 `'pending'`
- **THEN** MUST 顯示灰色 `Circle` 圖示，文字使用正常顏色

#### Scenario: in_progress 狀態顯示

- **WHEN** todo 的 `status` 為 `'in_progress'`
- **THEN** MUST 顯示藍色 `Loader2` 旋轉圖示（`animate-spin`），文字使用正常顏色

#### Scenario: done 狀態顯示

- **WHEN** todo 的 `status` 為 `'done'`
- **THEN** MUST 顯示綠色 `CheckCircle2` 圖示，文字使用刪除線 + 淡化樣式

#### Scenario: blocked 狀態顯示

- **WHEN** todo 的 `status` 為 `'blocked'`
- **THEN** MUST 顯示橘紅色 `AlertCircle` 圖示，並在標題旁顯示 "Blocked"（i18n）標籤文字

#### Scenario: 展開 description

- **WHEN** 使用者點擊有 `description` 的 todo 行
- **THEN** MUST 在該行下方展開顯示 `description` 文字
- **AND** 再次點擊 MUST 收合 description

#### Scenario: 沒有 description 的 todo 不可展開

- **WHEN** todo 的 `description` 為 `null` 或空字串
- **THEN** 點擊該行 MUST 不產生展開/收合行為

### Requirement: TaskItem 型別對齊 SDK todos schema

前端 `TaskItem` interface MUST 對齊 SDK `todos` 表 schema，移除自訂欄位。

#### Scenario: TaskItem interface 定義

- **WHEN** `TaskItem` type 被使用
- **THEN** MUST 包含欄位：`id`（string）、`title`（string）、`description`（string | null）、`status`（`'pending' | 'in_progress' | 'done' | 'blocked'`）、`created_at`（string）、`updated_at`（string）
- **AND** MUST NOT 包含舊欄位：`subject`、`activeForm`、`owner`、`blockedBy`

### Requirement: Store actions 簡化

Zustand store 的 task-related actions MUST 簡化為全量替換模式。

#### Scenario: setTabTasks 全量替換

- **WHEN** 呼叫 `setTabTasks(tabId, todos)`
- **THEN** MUST 將 `tabs[tabId].tasks` 完全替換為傳入的 `todos` 陣列

#### Scenario: 移除 upsertTabTask

- **WHEN** store 初始化
- **THEN** MUST NOT 包含 `upsertTabTask` action（不再需要單筆更新）

### Requirement: 移除 task_* 工具結果解析

`useTabCopilot` hook MUST 移除所有 `task_*` 工具結果的解析邏輯。

#### Scenario: copilot:tool_end 不再解析 task 工具

- **WHEN** `copilot:tool_end` 事件中 `toolName` 以 `task_` 開頭
- **THEN** MUST NOT 進行任何 task-related 的 store 更新（該判斷邏輯已移除）

### Requirement: i18n 更新

任務相關的 i18n keys MUST 更新以反映新的狀態名稱。

#### Scenario: 新增 done 和 blocked keys

- **WHEN** 前端渲染任務狀態文字
- **THEN** i18n MUST 包含 `tasks.done`（en: "Done" / zh-TW: "已完成"）和 `tasks.blocked`（en: "Blocked" / zh-TW: "已封鎖"）

#### Scenario: 移除 completed key

- **WHEN** i18n 載入
- **THEN** MUST NOT 包含 `tasks.completed` key（已由 `tasks.done` 取代）

## ADDED Requirements

### Requirement: Dual-Source Message Display

ChatView SHALL combine committed messages from TanStack Query with in-progress streaming content from Zustand to render the full conversation.

#### Scenario: Display committed messages from query cache

- **WHEN** ChatView renders for a tab with a conversation ID
- **THEN** it MUST use `useMessagesQuery(conversationId)` to fetch committed message history
- **AND** display all messages from the query `data` array

#### Scenario: Display streaming content from Zustand

- **WHEN** the active tab is streaming (`isStreaming === true`)
- **THEN** ChatView MUST append the current streaming turn (from Zustand per-tab state: `streamingText`, `toolRecords`, `turnSegments`, `reasoningText`) after the committed messages
- **AND** the streaming content MUST update in real-time as deltas arrive

#### Scenario: Merge on stream completion

- **WHEN** a streaming turn completes (`copilot:idle` event)
- **THEN** the completed assistant message MUST be appended to the TanStack Query cache via the WebSocket bridge
- **AND** the Zustand per-tab streaming state MUST be cleared
- **AND** there MUST NOT be a visual flicker or duplicate message during the transition

#### Scenario: Loading state on tab switch

- **WHEN** a user switches to a tab whose messages are not yet in the query cache
- **THEN** ChatView MUST show a loading indicator while `useMessagesQuery` fetches
- **AND** once loaded, messages MUST display without a full re-render of already-visible content

#### Scenario: Cached messages on tab switch

- **WHEN** a user switches back to a previously viewed tab
- **THEN** messages MUST appear instantly from the query cache (no loading spinner)
