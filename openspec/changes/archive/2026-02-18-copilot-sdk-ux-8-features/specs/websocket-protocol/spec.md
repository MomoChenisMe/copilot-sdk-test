## ADDED Requirements

### Requirement: copilot:set_mode 訊息類型（C→S）

Client SHALL 發送 `copilot:set_mode` 訊息，包含 `{conversationId, mode: 'plan'|'act'}`，用於在 stream 進行中切換 mode。

#### Scenario: 訊息格式

- WHEN 使用者在 stream 進行中切換 mode
- THEN client MUST 發送 `{ type: 'copilot:set_mode', data: { conversationId: string, mode: 'plan' | 'act' } }` 格式的 WebSocket 訊息

#### Scenario: 路由至 copilot handler

- WHEN 後端收到 `copilot:set_mode` 訊息
- THEN router MUST 將訊息分派到 copilot handler 處理
- AND handler SHALL 更新對應 session 的 mode 狀態

---

### Requirement: copilot:mode_changed 訊息類型（S→C）

Server SHALL 廣播 `copilot:mode_changed` 訊息，包含 `{conversationId, mode}`，通知所有 subscribers mode 已變更。

#### Scenario: 訊息格式

- WHEN backend 成功處理 `copilot:set_mode` 請求
- THEN server MUST 廣播 `{ type: 'copilot:mode_changed', data: { conversationId: string, mode: 'plan' | 'act' } }` 格式的 WebSocket 訊息

#### Scenario: 廣播範圍

- WHEN server 廣播 `copilot:mode_changed`
- THEN 僅訂閱該 conversationId 的 WebSocket clients SHALL 收到通知
- AND 其他 clients SHALL NOT 受影響

---

### Requirement: copilot:send mode 欄位

`copilot:send` payload SHALL 接受 optional `mode` 欄位（`'plan'` | `'act'`，預設 `'act'`）。

#### Scenario: 帶 mode 欄位的 copilot:send

- WHEN 使用者送出 chat message
- THEN `copilot:send` message 的 data 欄位 SHALL 包含 optional `mode` 屬性
- AND `mode` 值 SHALL 為 `"plan"` 或 `"act"`

#### Scenario: 未提供 mode 時使用預設值

- WHEN `copilot:send` message 的 data 欄位未包含 `mode`
- THEN backend SHALL 以 `"act"` 作為預設 mode
- AND 所有 tool execution 請求 SHALL 被自動核准

---

### Requirement: copilot:user_input_request 訊息類型（S→C）

Server SHALL 發送 `copilot:user_input_request` 訊息，包含 `{requestId, question, choices?, allowFreeform?, conversationId}`，當 SDK 觸發 `ask_user` 時使用。

#### Scenario: 訊息格式

- WHEN SDK 觸發 `ask_user` callback
- THEN server MUST 發送 `{ type: 'copilot:user_input_request', data: { requestId: string, question: string, choices?: string[], allowFreeform?: boolean, conversationId: string } }` 格式的 WebSocket 訊息

#### Scenario: 含選項的 user input request

- WHEN SDK 的 `ask_user` 包含預定義選項
- THEN `choices` 欄位 SHALL 包含選項陣列
- AND `allowFreeform` 欄位 SHALL 指示是否允許自由輸入

#### Scenario: 無選項的開放式 user input request

- WHEN SDK 的 `ask_user` 不包含預定義選項
- THEN `choices` 欄位 SHALL 為 undefined 或空陣列
- AND `allowFreeform` SHALL 預設為 true

---

### Requirement: copilot:user_input_response 訊息類型（C→S）

Client SHALL 發送 `copilot:user_input_response` 訊息，包含 `{conversationId, requestId, answer, wasFreeform?}`，回應 user input request。

#### Scenario: 訊息格式

- WHEN 使用者回應 user input request
- THEN client MUST 發送 `{ type: 'copilot:user_input_response', data: { conversationId: string, requestId: string, answer: string, wasFreeform?: boolean } }` 格式的 WebSocket 訊息

#### Scenario: 選擇預定義選項回應

- WHEN 使用者從 choices 中選擇一個選項
- THEN `answer` SHALL 為選中的選項值
- AND `wasFreeform` SHALL 為 false

#### Scenario: 自由輸入回應

- WHEN 使用者以自由文字回應
- THEN `answer` SHALL 為使用者輸入的文字
- AND `wasFreeform` SHALL 為 true

#### Scenario: requestId 匹配

- WHEN backend 收到 `copilot:user_input_response`
- THEN `requestId` MUST 與先前發送的 `copilot:user_input_request` 的 `requestId` 相匹配
- AND backend SHALL 將 answer 傳遞回 SDK 的 `ask_user` callback

---

### Requirement: copilot:quota 訊息類型（S→C）

Server SHALL 發送 `copilot:quota` 訊息，包含 `{quotaSnapshots, model?, cost?, cacheReadTokens?, cacheWriteTokens?, conversationId}`，提供 quota 相關資料。

#### Scenario: 訊息格式

- WHEN SDK 提供 quota 資料（透過 `assistant.usage` 事件）
- THEN server MUST 發送 `{ type: 'copilot:quota', data: { quotaSnapshots: object, model?: string, cost?: number, cacheReadTokens?: number, cacheWriteTokens?: number, conversationId: string } }` 格式的 WebSocket 訊息

#### Scenario: 完整 quota payload

- WHEN `assistant.usage` 事件包含所有 quota 相關欄位
- THEN `copilot:quota` message SHALL 包含 quotaSnapshots、model、cost、cacheReadTokens、cacheWriteTokens
- AND conversationId SHALL 對應當前串流的對話 ID

---

### Requirement: copilot:shutdown 訊息類型（S→C）

Server SHALL 發送 `copilot:shutdown` 訊息，包含 `{totalPremiumRequests, modelMetrics, conversationId}`，在 session shutdown 時使用。

#### Scenario: 訊息格式

- WHEN SDK 發出 `session.shutdown` 事件
- THEN server MUST 發送 `{ type: 'copilot:shutdown', data: { totalPremiumRequests: number, modelMetrics: object, conversationId: string } }` 格式的 WebSocket 訊息

#### Scenario: Shutdown 觸發條件

- WHEN SDK session 正常結束或因錯誤結束
- THEN backend SHALL 發送 `copilot:shutdown` message
- AND frontend SHALL 使用 totalPremiumRequests 更新 UsageBar 顯示
