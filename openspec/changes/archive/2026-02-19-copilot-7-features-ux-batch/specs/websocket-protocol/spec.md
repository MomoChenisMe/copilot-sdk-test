## MODIFIED Requirements

### Requirement: 訊息格式

所有 WebSocket 訊息 MUST 使用 JSON 格式：`{ type: string, data?: object }`。`copilot:abort` 訊息的 `data` 欄位現在 MUST 包含 `conversationId` 欄位（**BREAKING CHANGE**）。

#### Scenario: 有效 JSON 訊息

- WHEN 收到有效的 JSON 格式訊息
- THEN 系統 MUST 正常解析並路由

#### Scenario: 無效 JSON 訊息

- WHEN 收到非 JSON 或格式不正確的訊息
- THEN 系統 MUST 發送 error 訊息並忽略該訊息，不中斷連線

#### Scenario: copilot:abort 訊息格式（BREAKING）

- WHEN 前端需要中止 AI 回應
- THEN 前端 MUST 發送 `{ type: 'copilot:abort', data: { conversationId: string } }` 格式的訊息，`conversationId` 為必填欄位

#### Scenario: copilot:abort 缺少 conversationId（向後相容）

- WHEN 後端收到 `copilot:abort` 訊息但 `data` 中無 `conversationId` 欄位
- THEN 後端 SHOULD fallback 到最後一個活躍串流的 conversationId，並在 log 中記錄 deprecation 警告

---

### Requirement: 心跳機制

系統 SHALL 支援 ping/pong 心跳以偵測連線狀態。後端心跳超時時間為 180 秒，且所有 WS 訊息（不僅限於 ping）均 MUST 重置心跳計時器。

#### Scenario: 心跳回應

- WHEN 收到 `ping` 訊息
- THEN 系統 MUST 回傳 `pong` 訊息

#### Scenario: 心跳超時

- WHEN 超過 180 秒未收到客戶端的任何 WS 訊息
- THEN 系統 MUST 關閉該 WebSocket 連線並清理相關資源

#### Scenario: 非 ping 訊息重置計時器

- WHEN 收到任何類型的 WS 訊息（如 `copilot:send`、`copilot:subscribe`、`terminal:input` 等）
- THEN 後端 MUST 重置心跳超時計時器至 180 秒，等同收到 ping 的效果

#### Scenario: 串流期間保持連線

- WHEN AI 串流回應正在進行，後端持續發送 `copilot:delta` 等事件
- THEN 後端的出站訊息 MUST NOT 重置心跳計時器（僅入站訊息重置），但前端收到訊息後 SHOULD 重置自身的 ping 發送間隔

## ADDED Requirements

### Requirement: copilot:user_input_timeout 訊息類型（S→C）

Server SHALL 發送 `copilot:user_input_timeout` 訊息，在 user input request 超時時通知 frontend。

#### Scenario: 訊息格式

- WHEN user input request 的 5 分鐘超時計時器到期
- THEN server MUST 發送 `{ type: 'copilot:user_input_timeout', data: { requestId: string, conversationId: string, question: string, choices?: string[], allowFreeform?: boolean } }` 格式的 WebSocket 訊息

#### Scenario: 發送時機

- WHEN 超時計時器到期
- THEN `copilot:user_input_timeout` MUST 在 reject pending Promise 之前發送
- AND 訊息 MUST 廣播至訂閱該 conversationId 的所有 WebSocket clients

#### Scenario: 正常回應後不觸發

- WHEN 使用者在超時前透過 `copilot:user_input_response` 回應
- THEN server MUST NOT 發送 `copilot:user_input_timeout` 訊息

#### Scenario: 路由至 frontend handler

- WHEN frontend 收到 `copilot:user_input_timeout` 訊息
- THEN frontend MUST 將其路由至 useTabCopilot hook 的 event handler 進行處理
