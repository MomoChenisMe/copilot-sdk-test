## ADDED Requirements

### Requirement: copilot:query_state 訊息（C→S）
Client SHALL 發送 `copilot:query_state` 訊息查詢後端活躍串流狀態。Message payload 為空物件 `{}`。此訊息 MUST 在 WebSocket 重連後由前端自動發送。Server 收到後 MUST 回傳 `copilot:state_response`。

#### Scenario: 前端重連後自動查詢
- **WHEN** WebSocket 連線建立（包含首次連線與重連）
- **THEN** 前端自動發送 `copilot:query_state` 訊息

#### Scenario: Server 處理查詢
- **WHEN** Server 收到 `copilot:query_state`
- **THEN** Server 查詢 StreamManager 的所有活躍串流與 pending user inputs，回傳 `copilot:state_response`

### Requirement: copilot:state_response 訊息（S→C）
Server SHALL 以 `copilot:state_response` 回應 `copilot:query_state`。Payload MUST 包含：
- `activeStreams`：陣列，每個元素包含 `{conversationId, status, startedAt}`
- `pendingUserInputs`：陣列，每個元素包含 `{conversationId, requestId, question, choices?, allowFreeform?, multiSelect?}`

#### Scenario: 有活躍串流和 pending input
- **WHEN** 後端有 1 個活躍串流和 1 個 pending user input
- **THEN** 回傳 `{activeStreams: [{conversationId: "abc", status: "streaming", startedAt: "..."}], pendingUserInputs: [{conversationId: "abc", requestId: "req1", question: "Which approach?", choices: ["A", "B"]}]}`

#### Scenario: 無活躍串流
- **WHEN** 後端無任何活躍串流
- **THEN** 回傳 `{activeStreams: [], pendingUserInputs: []}`

#### Scenario: 多個串流
- **WHEN** 後端有 3 個活躍串流
- **THEN** `activeStreams` 包含 3 個元素，各有正確的 conversationId 和 status

### Requirement: copilot:user_input_request multiSelect 欄位
`copilot:user_input_request` 訊息 SHALL 新增 optional `multiSelect` boolean 欄位。當 SDK 回報的 user input request 包含 multiSelect 時，此欄位 MUST 被轉發。

#### Scenario: 訊息包含 multiSelect
- **WHEN** SDK user input request 帶有 `multiSelect: true`
- **THEN** WebSocket 訊息 `copilot:user_input_request` 包含 `multiSelect: true`

#### Scenario: 向下相容
- **WHEN** SDK user input request 未帶 multiSelect
- **THEN** WebSocket 訊息不包含 multiSelect 欄位（或為 undefined）
