## ADDED Requirements

### Requirement: Multi-select 多選模式
系統 SHALL 支援 AskUser 多選模式。當 SDK 的 `onUserInputRequest` callback 包含 `multiSelect: true` 時，後端 MUST 在 `copilot:user_input_request` WebSocket 訊息中轉發此欄位。前端 MUST 以 checkbox UI 呈現選項，允許使用者勾選多個選項後批次提交。提交時 answer MUST 為 JSON 陣列字串（`JSON.stringify(selectedChoices)`）。

#### Scenario: 後端轉發 multiSelect 欄位
- **WHEN** SDK 觸發 `onUserInputRequest` 且 payload 包含 `multiSelect: true`
- **THEN** WebSocket 訊息 `copilot:user_input_request` 包含 `multiSelect: true`

#### Scenario: 前端顯示 checkbox UI
- **WHEN** 前端收到 `multiSelect: true` 的 user input request
- **THEN** 每個 choice 以 checkbox 呈現（而非 button），底部顯示 "Submit" 確認按鈕

#### Scenario: 多選提交
- **WHEN** 使用者勾選 "Option A" 和 "Option C" 並點擊 Submit
- **THEN** 前端發送 `copilot:user_input_response`，answer 為 `'["Option A","Option C"]'`

#### Scenario: 多選至少選一
- **WHEN** 使用者未勾選任何選項
- **THEN** Submit 按鈕 disabled

### Requirement: Inline chat card UI
AskUser 對話 SHALL 從全螢幕 modal overlay 改為 inline chat card，嵌入訊息流中。新元件 `InlineUserInput` MUST 渲染在 ChatView 的訊息列表末尾，使用 `bg-bg-secondary border border-border rounded-xl p-4` 樣式。單選模式 MUST 使用 radio button，多選模式 MUST 使用 checkbox。底部 MUST 保留 freeform 文字輸入（當 `allowFreeform: true`）。Card 出現時 SHALL 自動 scroll into view。

#### Scenario: Inline card 渲染位置
- **WHEN** 收到 user input request
- **THEN** InlineUserInput card 渲染在訊息列表最後一筆訊息之後，而非全螢幕 overlay

#### Scenario: 單選 radio button
- **WHEN** request 有 choices 且 `multiSelect` 為 false 或 undefined
- **THEN** 每個 choice 以 radio button 呈現，選中後立即提交（無需額外確認按鈕）

#### Scenario: 多選 checkbox
- **WHEN** request 有 choices 且 `multiSelect: true`
- **THEN** 每個 choice 以 checkbox 呈現，底部有 Submit 按鈕

#### Scenario: Freeform 輸入
- **WHEN** request 的 `allowFreeform` 為 true
- **THEN** card 底部顯示文字輸入框 + Send 按鈕

#### Scenario: Auto scroll
- **WHEN** InlineUserInput card 被渲染
- **THEN** 訊息區域自動滾動至底部使 card 完全可見

### Requirement: AskUser 中斷恢復
前端重連後 SHALL 能恢復尚未回應的 AskUser 對話。後端 MUST 在 `PendingUserInput` 結構中持久化 request metadata（question, choices, allowFreeform, multiSelect, requestId）。當前端發送 `copilot:query_state` 時，回應 MUST 包含所有 pending user input requests。前端收到後 MUST 自動重新顯示 InlineUserInput card。

#### Scenario: 後端持久化 request metadata
- **WHEN** SDK 觸發 `onUserInputRequest`
- **THEN** StreamManager 同時儲存 resolve/reject callback 和完整的 request data（question, choices, allowFreeform, multiSelect）

#### Scenario: 前端重連恢復 AskUser
- **WHEN** 前端 WebSocket 重連並發送 `copilot:query_state`
- **THEN** `copilot:state_response` 包含 `pendingUserInputs` 陣列，前端為每個 pending request 重新顯示 InlineUserInput card

#### Scenario: 恢復後回應成功
- **WHEN** 使用者在恢復的 InlineUserInput card 中選擇答案並提交
- **THEN** 後端收到 `copilot:user_input_response`，resolve 對應的 pending Promise，串流繼續執行

## MODIFIED Requirements

### Requirement: Timeout handling
Pending request SHALL 在無回應時於 30 分鐘（1800 秒）後 reject（原為 5 分鐘）。當 conversation 的 `subscribers.size === 0`（無前端訂閱者）時，timeout 計時器 MUST 暫停；有新訂閱者加入時 MUST 恢復計時。

#### Scenario: 30 分鐘 timeout
- **WHEN** user input request 發出後 30 分鐘無回應
- **THEN** 系統 reject pending Promise，串流收到 timeout 錯誤

#### Scenario: 無訂閱者暫停計時
- **WHEN** user input request 待回應中，且所有前端訂閱者斷線（subscribers.size === 0）
- **THEN** timeout 計時器暫停

#### Scenario: 訂閱者回歸恢復計時
- **WHEN** 新的前端訂閱者加入（subscribers.size > 0）
- **THEN** timeout 計時器從暫停處恢復

### Requirement: Modal dialog
前端 MUST 使用 `InlineUserInput` inline card 作為主要 UI（取代 `UserInputDialog` 全螢幕 modal）。`UserInputDialog.tsx` 保留作為 fallback，僅在 ChatView 未掛載時使用。

#### Scenario: 正常情況使用 inline card
- **WHEN** ChatView 已掛載且收到 user input request
- **THEN** 使用 InlineUserInput 元件渲染在訊息流中

#### Scenario: Fallback 使用 modal
- **WHEN** ChatView 未掛載（例如使用者在 Settings 頁面）且收到 user input request
- **THEN** 使用 UserInputDialog modal overlay 顯示

### Requirement: Request format
Message MUST 包含 `requestId`、`question`、optional `choices` 陣列、optional `allowFreeform` boolean、optional `multiSelect` boolean、`conversationId`。

#### Scenario: Request 包含 multiSelect
- **WHEN** SDK 觸發含 multiSelect 的 user input request
- **THEN** WebSocket 訊息格式為 `{requestId, question, choices, allowFreeform, multiSelect, conversationId}`

#### Scenario: 預設值
- **WHEN** SDK 未提供 multiSelect 欄位
- **THEN** 前端預設 `multiSelect` 為 `false`
