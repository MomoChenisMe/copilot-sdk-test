## ADDED Requirements

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
