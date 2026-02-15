## MODIFIED Requirements

### Requirement: Handler 架構 — 委派 StreamManager

Copilot handler SHALL 作為薄路由層，將所有串流狀態管理委派給 `StreamManager`。Handler MUST NOT 持有 `activeSession`、accumulation state、dedup sets 或任何串流相關的閉包變數。Handler 的職責僅為解析 WS 訊息 type、提取 payload、呼叫 StreamManager 對應方法、並回傳結果。

#### Scenario: copilot:send 委派串流啟動

- **WHEN** handler 接收到 `copilot:send` 訊息
- **THEN** handler MUST 呼叫 `streamManager.startStream(conversationId, { message, model, activePresets })` 啟動串流，MUST NOT 在 handler 內建立 SDK session 或設定事件監聽器

#### Scenario: handler 無串流狀態

- **WHEN** handler 模組載入
- **THEN** handler 閉包 MUST NOT 宣告 `activeSession`、`accumulation`、`seenMessageIds`、`seenToolCallIds`、`seenReasoningIds` 等變數，所有串流狀態 MUST 由 StreamManager 的 per-conversation `ConversationStream` 管理

#### Scenario: 多 WS 連線共用同一串流

- **WHEN** 同一對話的串流正在進行，且第二個 WS 連線的 handler 接收到該對話的 `copilot:subscribe`
- **THEN** handler MUST 透過 StreamManager 將第二個連線加入訂閱，MUST NOT 啟動新的串流

### Requirement: 中止回應

系統 SHALL 支援中止正在進行的 AI 回應。`copilot:abort` 訊息 MUST 包含 `conversationId` 欄位指定要中止的對話（**BREAKING CHANGE**）。Handler MUST 委派給 `streamManager.abortStream(conversationId)` 執行中止。

#### Scenario: 使用者中止指定對話串流

- **WHEN** 前端發送 `copilot:abort` 訊息且 payload 包含 `conversationId`
- **THEN** handler MUST 呼叫 `streamManager.abortStream(conversationId)`，StreamManager MUST 中止該對話的 SDK session 並持久化已累積的內容

#### Scenario: abort 無 conversationId（向後相容 fallback）

- **WHEN** 前端發送 `copilot:abort` 訊息但 payload 未包含 `conversationId`
- **THEN** handler SHOULD 嘗試 fallback 到最後一個活躍串流的 conversationId 進行中止，並在 log 中記錄 deprecation 警告

#### Scenario: abort 不存在的串流

- **WHEN** 前端發送 `copilot:abort` 訊息但指定的 `conversationId` 無活躍串流
- **THEN** handler MUST 發送 `copilot:error` 回應，errorType 為 `'no_active_stream'`

## ADDED Requirements

### Requirement: copilot:subscribe 訊息處理

Handler SHALL 支援 `copilot:subscribe` 訊息，允許前端訂閱指定對話的串流事件。訂閱後 MUST 回傳當前串流狀態，並觸發 catch-up 事件回放。

#### Scenario: 訂閱活躍串流

- **WHEN** handler 接收到 `copilot:subscribe` 訊息且 payload 包含 `conversationId`，且該對話有活躍串流
- **THEN** handler MUST 呼叫 `streamManager.subscribe(conversationId, sendFn)` 將當前 WS 連線的 send 函式註冊為訂閱者，並發送 `copilot:stream-status` 回應（status 為 `'streaming'`）

#### Scenario: 訂閱後 catch-up 回放

- **WHEN** 訂閱成功且 StreamManager 的 eventBuffer 中有已累積的事件
- **THEN** StreamManager MUST 依序將 buffer 中的所有事件重播（replay）給新訂閱者，確保前端收到完整的串流歷史

#### Scenario: 訂閱無活躍串流的對話

- **WHEN** handler 接收到 `copilot:subscribe` 訊息但該 `conversationId` 無活躍串流
- **THEN** handler MUST 發送 `copilot:stream-status` 回應，status 為 `'idle'`

### Requirement: copilot:unsubscribe 訊息處理

Handler SHALL 支援 `copilot:unsubscribe` 訊息，允許前端取消訂閱指定對話的串流事件，但不停止串流本身。

#### Scenario: 取消訂閱串流

- **WHEN** handler 接收到 `copilot:unsubscribe` 訊息且 payload 包含 `conversationId`
- **THEN** handler MUST 呼叫 `streamManager.unsubscribe(conversationId, sendFn)` 移除該 WS 連線的訂閱，串流 MUST 繼續在背景執行

#### Scenario: 取消訂閱不影響其他訂閱者

- **WHEN** 對話有多個訂閱者，且其中一個取消訂閱
- **THEN** 其餘訂閱者 MUST 繼續正常接收串流事件

### Requirement: copilot:status 訊息處理

Handler SHALL 支援 `copilot:status` 訊息，回傳所有正在進行串流的對話 ID 列表。

#### Scenario: 查詢活躍串流列表

- **WHEN** handler 接收到 `copilot:status` 訊息
- **THEN** handler MUST 呼叫 `streamManager.getActiveStreamIds()` 取得活躍串流的 conversationId 陣列，並發送 `copilot:active-streams` 回應，data 包含 `{ conversationIds: string[] }`

#### Scenario: 無活躍串流

- **WHEN** handler 接收到 `copilot:status` 訊息且無任何活躍串流
- **THEN** handler MUST 發送 `copilot:active-streams` 回應，data 為 `{ conversationIds: [] }`

### Requirement: Handler onDisconnect 回呼

Handler SHALL 實作 `onDisconnect` 回呼，在 WS 連線斷開時清理該連線的所有訂閱，但不停止背景串流。

#### Scenario: WS 斷線清理訂閱

- **WHEN** WS 連線斷開且 router 呼叫 handler 的 `onDisconnect` 回呼
- **THEN** handler MUST 呼叫 `streamManager.removeSubscriber(sendFn)` 移除該連線在所有對話中的訂閱

#### Scenario: 斷線不停止串流

- **WHEN** WS 連線斷開且該連線是某對話串流的唯一訂閱者
- **THEN** 串流 MUST 繼續在背景執行，事件累積到 eventBuffer 中，等待後續訂閱者

### Requirement: System Prompt 整合

Handler SHALL 在啟動或恢復 SDK session 前，透過 `PromptComposer` 組合系統提示詞，並以 `systemMessage: { mode: 'append', content }` 傳入 SDK SessionConfig。

#### Scenario: 新 session 注入系統提示詞

- **WHEN** StreamManager 為新對話建立 SDK session
- **THEN** 系統 MUST 呼叫 `promptComposer.compose(activePresets)` 取得組合後的系統提示詞，並在 `SessionConfig` 中設定 `systemMessage: { mode: 'append', content: composedPrompt }`

#### Scenario: 恢復 session 注入系統提示詞

- **WHEN** StreamManager 恢復既有 SDK session（`infiniteSessions` resume）
- **THEN** 系統 MUST 同樣呼叫 `promptComposer.compose(activePresets)` 並注入最新的系統提示詞，確保 prompt 變更即時生效

#### Scenario: PromptComposer 回傳空內容

- **WHEN** `promptComposer.compose()` 回傳空字串（無提示詞檔案或所有檔案為空）
- **THEN** 系統 MUST NOT 設定 `systemMessage`，使用 SDK 預設行為

#### Scenario: 系統提示詞超長截斷

- **WHEN** `promptComposer.compose()` 回傳的內容超過 `maxPromptLength` 設定值
- **THEN** PromptComposer MUST 截斷至限制長度，記錄 warning log，並在截斷處附加 `\n[... truncated]` 標記

### Requirement: activePresets 傳遞

Handler SHALL 接受 `copilot:send` payload 中的 `activePresets` 欄位，並將其傳遞給 StreamManager 和 PromptComposer。

#### Scenario: copilot:send 包含 activePresets

- **WHEN** handler 接收到 `copilot:send` 訊息且 payload 包含 `activePresets: string[]`
- **THEN** handler MUST 將 `activePresets` 傳遞給 `streamManager.startStream(conversationId, { message, model, activePresets })`

#### Scenario: copilot:send 未包含 activePresets

- **WHEN** handler 接收到 `copilot:send` 訊息但 payload 未包含 `activePresets`
- **THEN** handler MUST 使用空陣列 `[]` 作為預設值傳遞給 StreamManager
