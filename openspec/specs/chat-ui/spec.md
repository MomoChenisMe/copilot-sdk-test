## ADDED Requirements

### Requirement: Markdown 標題渲染
Assistant 訊息中的 Markdown 標題 SHALL 正確渲染不同層級的樣式。

#### Scenario: H1 標題
- **WHEN** assistant 回覆包含 `# Title`
- **THEN** 標題 SHALL 以 text-2xl font-bold 樣式渲染

#### Scenario: H2 標題
- **WHEN** assistant 回覆包含 `## Subtitle`
- **THEN** 標題 SHALL 以 text-xl font-semibold 樣式渲染

#### Scenario: H3 標題
- **WHEN** assistant 回覆包含 `### Section`
- **THEN** 標題 SHALL 以 text-lg font-semibold 樣式渲染

#### Scenario: 其他 Markdown 元素
- **WHEN** assistant 回覆包含 tables、blockquotes、lists、links
- **THEN** 這些元素 SHALL 正確渲染對應樣式

### Requirement: Tab 切換訊息載入
切換 tab 時 SHALL 正確顯示該 tab 的訊息，不顯示 stale 內容。

#### Scenario: 訊息尚未載入
- **WHEN** 切換到一個 messagesLoaded === false 的 tab
- **THEN** 系統 SHALL 顯示 loading 指示而非空白歡迎訊息

#### Scenario: Race condition 防護
- **WHEN** 使用者快速連續切換 tabs
- **THEN** 系統 SHALL 確保只有 active tab 的 API 結果被套用

#### Scenario: Draft tab 顯示
- **WHEN** 切換到 draft tab（conversationId === null）
- **THEN** 系統 SHALL 顯示空白歡迎訊息（不觸發 loading）

### Requirement: 新 Tab 自動聚焦輸入框

建立新 Tab 後，聊天輸入框 SHALL 自動獲得焦點（focus）。

#### Scenario: 新建 Tab 聚焦

- **WHEN** 使用者點擊 Tab bar 的 "+" 按鈕建立新 Tab
- **THEN** 新 Tab 的聊天輸入框 textarea MUST 自動獲得焦點
- **AND** 使用者 MUST 可以直接開始打字，無需手動點擊輸入框

#### Scenario: 切換到已有訊息的 Tab 不強制聚焦

- **WHEN** 使用者切換到一個已有訊息的既有 Tab
- **THEN** 系統 MUST NOT 強制聚焦輸入框（避免干擾使用者瀏覽訊息）

#### Scenario: Input 組件暴露 focus 方法

- **WHEN** Input 組件被 ChatView 引用
- **THEN** Input MUST 透過 `forwardRef` + `useImperativeHandle` 暴露 `focus()` 方法
- **AND** ChatView MUST 在偵測到新 Tab（tabId 變更 + messages 為空）時透過 `requestAnimationFrame` 呼叫此方法，確保 DOM 已就緒

#### Scenario: Input 組件支援 statusText

- **WHEN** ChatView 傳入 `statusText` prop 至 Input 組件
- **THEN** Input MUST 在附件按鈕左側渲染該文字
- **AND** 樣式 MUST 為 `text-[10px] text-text-muted tabular-nums`
