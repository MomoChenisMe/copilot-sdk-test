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
