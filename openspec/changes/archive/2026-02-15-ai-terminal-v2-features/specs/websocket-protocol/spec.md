## ADDED Requirements

### Requirement: copilot:subscribe 訊息類型（C→S）

WebSocket 協議 SHALL 支援 `copilot:subscribe` 訊息類型，由前端發送到後端，用於訂閱指定對話的串流事件。

#### Scenario: 訊息格式

- **WHEN** 前端需要訂閱某對話的串流
- **THEN** 前端 MUST 發送 `{ type: 'copilot:subscribe', data: { conversationId: string } }` 格式的 WebSocket 訊息

#### Scenario: 路由至 copilot handler

- **WHEN** 後端收到 `copilot:subscribe` 訊息
- **THEN** router MUST 將訊息分派到 copilot handler 處理

### Requirement: copilot:unsubscribe 訊息類型（C→S）

WebSocket 協議 SHALL 支援 `copilot:unsubscribe` 訊息類型，由前端發送到後端，用於取消訂閱指定對話的串流事件。

#### Scenario: 訊息格式

- **WHEN** 前端需要取消訂閱某對話的串流
- **THEN** 前端 MUST 發送 `{ type: 'copilot:unsubscribe', data: { conversationId: string } }` 格式的 WebSocket 訊息

#### Scenario: 路由至 copilot handler

- **WHEN** 後端收到 `copilot:unsubscribe` 訊息
- **THEN** router MUST 將訊息分派到 copilot handler 處理

### Requirement: copilot:status 訊息類型（C→S）

WebSocket 協議 SHALL 支援 `copilot:status` 訊息類型，由前端發送到後端，用於查詢當前所有活躍串流的對話 ID。

#### Scenario: 訊息格式

- **WHEN** 前端需要查詢活躍串流狀態
- **THEN** 前端 MUST 發送 `{ type: 'copilot:status' }` 格式的 WebSocket 訊息（data 欄位可省略）

#### Scenario: 路由至 copilot handler

- **WHEN** 後端收到 `copilot:status` 訊息
- **THEN** router MUST 將訊息分派到 copilot handler 處理

### Requirement: copilot:stream-status 訊息類型（S→C）

WebSocket 協議 SHALL 支援 `copilot:stream-status` 訊息類型，由後端發送到前端，用於回報指定對話的串流狀態。

#### Scenario: 訊息格式

- **WHEN** 後端需要通知前端某對話的串流狀態
- **THEN** 後端 MUST 發送 `{ type: 'copilot:stream-status', data: { conversationId: string, status: 'streaming' | 'idle' | 'completed' | 'error' } }` 格式的 WebSocket 訊息

#### Scenario: subscribe 回應觸發

- **WHEN** 前端發送 `copilot:subscribe` 後
- **THEN** 後端 MUST 回傳 `copilot:stream-status` 訊息告知該對話的當前串流狀態

### Requirement: copilot:active-streams 訊息類型（S→C）

WebSocket 協議 SHALL 支援 `copilot:active-streams` 訊息類型，由後端發送到前端，用於回報所有活躍串流的對話 ID 列表。

#### Scenario: 訊息格式

- **WHEN** 後端收到 `copilot:status` 查詢
- **THEN** 後端 MUST 回傳 `{ type: 'copilot:active-streams', data: { conversationIds: string[] } }` 格式的 WebSocket 訊息

#### Scenario: 空列表回應

- **WHEN** 當前無任何活躍串流
- **THEN** 後端 MUST 回傳 `{ type: 'copilot:active-streams', data: { conversationIds: [] } }`

### Requirement: WsHandler onDisconnect 回呼

`WsHandler` 介面 SHALL 新增 optional `onDisconnect` 回呼方法，允許 handler 在 WS 連線斷開時執行清理邏輯。

#### Scenario: WsHandler 介面定義

- **WHEN** 定義 `WsHandler` TypeScript 介面
- **THEN** 介面 MUST 包含 `onDisconnect?: (send: SendFn) => void` optional 方法簽名

#### Scenario: handler 未實作 onDisconnect

- **WHEN** handler 未提供 `onDisconnect` 回呼且 WS 連線斷開
- **THEN** router MUST 跳過該 handler 的 disconnect 通知，不產生錯誤

### Requirement: Router 斷線通知

Router SHALL 在 WS 連線斷開時，遍歷所有已註冊的 handler，呼叫其 `onDisconnect` 回呼（若有實作）。

#### Scenario: 連線斷開觸發通知

- **WHEN** WS 連線觸發 `close` 事件
- **THEN** router MUST 遍歷所有 handler，對實作了 `onDisconnect` 的 handler 呼叫 `handler.onDisconnect(send)`

#### Scenario: handler onDisconnect 拋出錯誤

- **WHEN** 某 handler 的 `onDisconnect` 回呼拋出錯誤
- **THEN** router MUST 捕捉錯誤並記錄 error log，繼續通知其餘 handler，MUST NOT 因單一 handler 錯誤中斷整個清理流程

### Requirement: 前端 Page Visibility API 整合

前端 WebSocket 客戶端 SHALL 整合 Page Visibility API，在頁面從背景返回前景時立即檢查連線狀態，並優化重連行為。

#### Scenario: 頁面回到前景時立即 ping

- **WHEN** 瀏覽器觸發 `visibilitychange` 事件且 `document.visibilityState` 變為 `'visible'`
- **THEN** 前端 MUST 立即發送一次 `ping` 訊息檢測連線是否存活

#### Scenario: ping 失敗觸發立即重連

- **WHEN** 頁面回到前景後發送的 ping 在 5 秒內未收到 pong 回應
- **THEN** 前端 MUST 視為連線已斷開，立即啟動重連程序，跳過退避延遲（即第一次重連不等待）

#### Scenario: 背景期間不重連

- **WHEN** 瀏覽器 `document.visibilityState` 為 `'hidden'` 且 WS 連線斷開
- **THEN** 前端 SHOULD 暫停自動重連的退避計時器，避免在背景中消耗資源

## MODIFIED Requirements

### Requirement: 訊息格式

所有 WebSocket 訊息 MUST 使用 JSON 格式：`{ type: string, data?: object }`。`copilot:abort` 訊息的 `data` 欄位現在 MUST 包含 `conversationId` 欄位（**BREAKING CHANGE**）。

#### Scenario: 有效 JSON 訊息

- **WHEN** 收到有效的 JSON 格式訊息
- **THEN** 系統 MUST 正常解析並路由

#### Scenario: 無效 JSON 訊息

- **WHEN** 收到非 JSON 或格式不正確的訊息
- **THEN** 系統 MUST 發送 error 訊息並忽略該訊息，不中斷連線

#### Scenario: copilot:abort 訊息格式（BREAKING）

- **WHEN** 前端需要中止 AI 回應
- **THEN** 前端 MUST 發送 `{ type: 'copilot:abort', data: { conversationId: string } }` 格式的訊息，`conversationId` 為必填欄位

#### Scenario: copilot:abort 缺少 conversationId（向後相容）

- **WHEN** 後端收到 `copilot:abort` 訊息但 `data` 中無 `conversationId` 欄位
- **THEN** 後端 SHOULD fallback 到最後一個活躍串流的 conversationId，並在 log 中記錄 deprecation 警告

### Requirement: 心跳機制

系統 SHALL 支援 ping/pong 心跳以偵測連線狀態。後端心跳超時時間為 180 秒，且所有 WS 訊息（不僅限於 ping）均 MUST 重置心跳計時器。

#### Scenario: 心跳回應

- **WHEN** 收到 `ping` 訊息
- **THEN** 系統 MUST 回傳 `pong` 訊息

#### Scenario: 心跳超時

- **WHEN** 超過 180 秒未收到客戶端的任何 WS 訊息
- **THEN** 系統 MUST 關閉該 WebSocket 連線並清理相關資源

#### Scenario: 非 ping 訊息重置計時器

- **WHEN** 收到任何類型的 WS 訊息（如 `copilot:send`、`copilot:subscribe`、`terminal:input` 等）
- **THEN** 後端 MUST 重置心跳超時計時器至 180 秒，等同收到 ping 的效果

#### Scenario: 串流期間保持連線

- **WHEN** AI 串流回應正在進行，後端持續發送 `copilot:delta` 等事件
- **THEN** 後端的出站訊息 MUST NOT 重置心跳計時器（僅入站訊息重置），但前端收到訊息後 SHOULD 重置自身的 ping 發送間隔
