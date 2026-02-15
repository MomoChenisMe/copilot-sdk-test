## ADDED Requirements

### Requirement: StreamManager Singleton 架構

系統 SHALL 提供 `StreamManager` singleton，負責管理所有對話的背景串流執行，使 agent 執行不依賴 WebSocket 連線。

#### Scenario: StreamManager 初始化

- **WHEN** 後端服務啟動
- **THEN** 系統 MUST 建立唯一的 `StreamManager` instance，內部維護 `Map<conversationId, ConversationStream>` 資料結構

#### Scenario: ConversationStream 結構

- **WHEN** StreamManager 建立一個新的 ConversationStream
- **THEN** 該 stream 物件 MUST 包含以下欄位：
  - `session` — Copilot SDK session instance
  - `accumulation` — 累積中的 turn 內容（content segments、tool records、reasoning、turnSegments）
  - `relay` — EventRelay instance，負責事件分發
  - `eventBuffer` — 已發生事件的有序陣列，用於新訂閱者 catch-up
  - `status` — stream 狀態（`'running'` | `'idle'` | `'error'`）
  - `dedupSets` — 去重 Set 集合（seenMessageIds、seenToolCallIds、seenReasoningIds）

#### Scenario: StreamManager 為 singleton

- **WHEN** 程式碼多次嘗試取得 StreamManager instance
- **THEN** 系統 MUST 回傳同一個 instance，可透過 `StreamManager.getInstance()` 靜態方法取得

### Requirement: startStream 串流啟動

StreamManager SHALL 提供 `startStream()` 方法，負責啟動新的對話串流。

#### Scenario: 正常啟動串流

- **WHEN** 呼叫 `startStream(conversationId, userMessage, options)` 且尚未達到並行上限
- **THEN** 系統 MUST 依序執行：
  1. 建立新的 `ConversationStream` 物件
  2. 將 user message 儲存至 DB（`repo.addMessage`）
  3. 設定 EventRelay 和累積層（accumulatingSend）
  4. 啟動 Copilot SDK session（`getOrCreateSession`）
  5. 將 stream 加入 `Map` 中，status 設為 `'running'`

#### Scenario: 已有進行中串流

- **WHEN** 呼叫 `startStream(conversationId, ...)` 但該 conversationId 已存在於 Map 中且 status 為 `'running'`
- **THEN** 系統 MUST 拋出錯誤 `"Stream already running for this conversation"`，MUST NOT 建立重複的串流

#### Scenario: 並行上限限制

- **WHEN** 呼叫 `startStream()` 但目前 status 為 `'running'` 的 stream 數量已達到並行上限
- **THEN** 系統 MUST 拒絕啟動，回傳錯誤 `"Concurrency limit reached"`

#### Scenario: 並行上限預設值

- **WHEN** StreamManager 初始化且未指定並行上限
- **THEN** 系統 MUST 使用預設值 `3` 作為最大同時執行串流數

#### Scenario: 並行上限可設定

- **WHEN** StreamManager 初始化時提供 `maxConcurrency` 設定
- **THEN** 系統 MUST 使用該設定值作為最大同時執行串流數

### Requirement: subscribe 訂閱機制

StreamManager SHALL 提供 `subscribe()` 方法，允許 WebSocket 連線訂閱特定對話的事件串流並接收歷史事件 catch-up。

#### Scenario: 訂閱進行中的串流

- **WHEN** 呼叫 `subscribe(conversationId, sendCallback)` 且該對話有進行中的串流
- **THEN** 系統 MUST 將 `sendCallback` 註冊到 EventRelay 的訂閱者列表，回傳 `unsubscribe` function

#### Scenario: 歷史事件 catch-up

- **WHEN** 新訂閱者透過 `subscribe()` 註冊
- **THEN** 系統 MUST 立即將 `eventBuffer` 中所有已緩衝的事件依序傳送給該訂閱者（replay），確保新訂閱者不遺漏先前的事件

#### Scenario: 訂閱不存在的串流

- **WHEN** 呼叫 `subscribe(conversationId, sendCallback)` 但該 conversationId 無對應的 stream
- **THEN** 系統 MUST 回傳 `null`，表示無可訂閱的串流

#### Scenario: unsubscribe 取消訂閱

- **WHEN** 呼叫 `subscribe()` 回傳的 `unsubscribe` function
- **THEN** 系統 MUST 從 EventRelay 的訂閱者列表中移除該 `sendCallback`，後續事件 MUST NOT 傳送給已取消的訂閱者

#### Scenario: 多訂閱者同時接收

- **WHEN** 同一個 conversationId 有多個 WebSocket 連線訂閱
- **THEN** EventRelay MUST 將每個事件廣播給所有已註冊的訂閱者

### Requirement: abortStream 中止串流

StreamManager SHALL 提供 `abortStream()` 方法，負責中止進行中的對話串流並持久化已累積的內容。

#### Scenario: 中止進行中的串流

- **WHEN** 呼叫 `abortStream(conversationId)` 且該對話有 status 為 `'running'` 的串流
- **THEN** 系統 MUST 依序執行：
  1. 將累積層中的已累積內容（content、metadata）持久化至 DB
  2. 中止 Copilot SDK session（`session.abort()`）
  3. 將 stream status 設為 `'idle'`
  4. 向所有訂閱者發送 `copilot:idle` 事件

#### Scenario: 中止不存在的串流

- **WHEN** 呼叫 `abortStream(conversationId)` 但該 conversationId 無對應的 stream
- **THEN** 系統 MUST 靜默忽略，不拋出錯誤

#### Scenario: 中止已 idle 的串流

- **WHEN** 呼叫 `abortStream(conversationId)` 但該 stream 的 status 已為 `'idle'`
- **THEN** 系統 MUST 靜默忽略，不重複執行中止操作

### Requirement: 事件流轉機制

SDK 事件 SHALL 經由 EventRelay 進行分發，同時累積內容和緩衝事件，確保無 WS 連線時不遺失資料。

#### Scenario: 事件處理流程

- **WHEN** Copilot SDK session 發出任何事件
- **THEN** 系統 MUST 按以下順序處理：
  1. EventRelay 接收原始事件
  2. 呼叫 `accumulatingSend`：更新 accumulation 狀態（content segments、tool records、reasoning、turnSegments）
  3. 將事件推入 `eventBuffer`（用於後續 catch-up）
  4. 將事件廣播給所有已註冊的 subscribers（若有）

#### Scenario: 無訂閱者時事件緩衝

- **WHEN** SDK 發出事件但當前無任何 WebSocket 訂閱者
- **THEN** 系統 MUST 繼續執行累積（accumulation）和事件緩衝（eventBuffer push），MUST NOT 丟棄任何事件

#### Scenario: Idle 事件觸發持久化

- **WHEN** SDK 發出 `session.idle` 事件且累積層有內容
- **THEN** 系統 MUST 將累積的 assistant message（含 content 和 metadata）持久化至 DB，然後重設累積狀態

#### Scenario: Idle 事件無累積內容

- **WHEN** SDK 發出 `session.idle` 事件但累積層無任何內容
- **THEN** 系統 MUST NOT 寫入空白 message 至 DB

### Requirement: WebSocket 斷線重連處理

系統 SHALL 在 WebSocket 斷線時保持串流執行，並在重連時提供 catch-up 機制。

#### Scenario: WS 斷線時串流持續

- **WHEN** 前端 WebSocket 連線斷開
- **THEN** 後端 MUST 僅 unsubscribe 該連線的所有 sendCallback，stream 本身（SDK session、accumulation、eventBuffer）MUST 繼續執行

#### Scenario: WS 斷線不影響持久化

- **WHEN** WebSocket 斷線期間 SDK 發出 `session.idle` 事件
- **THEN** 系統 MUST 正常將累積內容持久化至 DB，MUST NOT 因無訂閱者而跳過持久化

#### Scenario: WS 重連查詢狀態

- **WHEN** 前端 WebSocket 重新連線
- **THEN** 前端 MUST 發送 `copilot:status` 訊息查詢所有活躍串流的狀態

#### Scenario: WS 重連重新訂閱

- **WHEN** 前端收到 `copilot:active-streams` 回應且包含目前檢視的 conversationId
- **THEN** 前端 MUST 發送 `copilot:subscribe` 訊息重新訂閱該對話，透過 eventBuffer catch-up 恢復顯示

### Requirement: 新增 WebSocket 訊息類型

系統 SHALL 新增以下 WebSocket 訊息類型以支援背景串流管理。

#### Scenario: copilot:subscribe 訊息

- **WHEN** 前端發送 `copilot:subscribe` 訊息，payload 為 `{ conversationId: string }`
- **THEN** 後端 MUST 呼叫 `StreamManager.subscribe(conversationId, send)`，將該 WS 連線註冊為訂閱者，並觸發 eventBuffer catch-up

#### Scenario: copilot:unsubscribe 訊息

- **WHEN** 前端發送 `copilot:unsubscribe` 訊息，payload 為 `{ conversationId: string }`
- **THEN** 後端 MUST 呼叫對應的 `unsubscribe` function，從訂閱者列表中移除該 WS 連線

#### Scenario: copilot:status 訊息

- **WHEN** 前端發送 `copilot:status` 訊息
- **THEN** 後端 MUST 回傳 `copilot:active-streams` 訊息，payload 為 `{ streams: Array<{ conversationId: string; status: string }> }`，列出所有活躍的串流

#### Scenario: copilot:stream-status 訊息

- **WHEN** 某個 ConversationStream 的 status 變更（running → idle、running → error）
- **THEN** 後端 MUST 向該 stream 的所有訂閱者發送 `copilot:stream-status` 訊息，payload 為 `{ conversationId: string; status: string }`

#### Scenario: copilot:active-streams 訊息

- **WHEN** 後端回覆 `copilot:status` 查詢
- **THEN** 後端 MUST 發送 `copilot:active-streams` 訊息，包含所有 status 不為 `'idle'` 的串流資訊

### Requirement: copilot:abort 破壞性變更

`copilot:abort` 訊息 SHALL 要求提供 `conversationId` 參數，以支援多串流環境下的精準中止。此為 BREAKING CHANGE。

#### Scenario: 帶 conversationId 的 abort

- **WHEN** 前端發送 `copilot:abort` 訊息，payload 為 `{ conversationId: string }`
- **THEN** 後端 MUST 呼叫 `StreamManager.abortStream(conversationId)` 中止指定對話的串流

#### Scenario: 不帶 conversationId 的 abort（向後相容）

- **WHEN** 前端發送 `copilot:abort` 訊息但未提供 `conversationId`
- **THEN** 後端 MUST 以 `console.warn` 記錄警告並嘗試中止該 WS 連線當前訂閱的唯一串流；若有多個訂閱則 MUST 回傳錯誤 `"conversationId required for abort in multi-stream mode"`

### Requirement: Copilot Handler 精簡化

現有的 copilot WebSocket handler SHALL 重構為薄路由層，將核心邏輯委派給 StreamManager。

#### Scenario: copilot:send 路由

- **WHEN** handler 接收到 `copilot:send` 訊息
- **THEN** handler MUST 呼叫 `StreamManager.startStream(conversationId, userMessage, options)`，然後呼叫 `StreamManager.subscribe(conversationId, send)` 自動訂閱該 WS 連線

#### Scenario: copilot:abort 路由

- **WHEN** handler 接收到 `copilot:abort` 訊息
- **THEN** handler MUST 呼叫 `StreamManager.abortStream(conversationId)`，不直接操作 SDK session

#### Scenario: WS 關閉清理

- **WHEN** WebSocket 連線關閉
- **THEN** handler MUST 呼叫所有已持有的 `unsubscribe` function，從 StreamManager 中移除該連線的所有訂閱，MUST NOT 中止任何進行中的串流

#### Scenario: Handler 不直接持有 session

- **WHEN** copilot handler 重構完成
- **THEN** handler MUST NOT 直接持有 SDK session reference、累積狀態或 accumulatingSend 邏輯，這些 MUST 全部由 StreamManager 管理

### Requirement: 並行限制控管

StreamManager SHALL 限制同時執行的背景串流數量，預設上限為 3，可透過設定調整。

#### Scenario: 達到並行上限

- **WHEN** 目前 running stream 數量等於 `maxConcurrency` 且收到新的 `startStream` 請求
- **THEN** 系統 MUST 拒絕請求並回傳錯誤 `"Concurrency limit reached (max: {maxConcurrency})"`，前端 MUST 顯示此錯誤訊息給使用者

#### Scenario: 串流完成釋放配額

- **WHEN** 一個 running stream 變為 idle 或 error 狀態
- **THEN** 系統 MUST 釋放一個並行配額，允許新的 `startStream` 請求

#### Scenario: 查詢可用配額

- **WHEN** 前端需要判斷是否可啟動新串流
- **THEN** 前端 SHALL 可透過 `copilot:status` 回應中的 `streams` 陣列長度推算目前的使用量

### Requirement: Graceful Shutdown

系統 SHALL 在後端服務關閉時優雅地持久化所有進行中的串流。

#### Scenario: SIGTERM / SIGINT 處理

- **WHEN** 後端收到 `SIGTERM` 或 `SIGINT` 信號
- **THEN** 系統 MUST 呼叫 `StreamManager.shutdownAll()`，依序對每個 running stream 執行：持久化累積內容 → 中止 SDK session → 設定 status 為 `'idle'`

#### Scenario: Shutdown 超時

- **WHEN** `shutdownAll()` 執行超過 10 秒
- **THEN** 系統 MUST 強制結束，以 `console.error` 記錄未能持久化的串流 conversationId

#### Scenario: Shutdown 期間拒絕新請求

- **WHEN** `shutdownAll()` 執行期間收到新的 `startStream` 請求
- **THEN** 系統 MUST 拒絕請求並回傳錯誤 `"Server is shutting down"`

### Requirement: 前端 Sidebar 串流指示器

前端 SHALL 在 sidebar 的對話列表中顯示進行中串流的視覺指示。

#### Scenario: 串流進行中指示

- **WHEN** 某對話有 status 為 `'running'` 的背景串流
- **THEN** sidebar 的該對話項目 MUST 顯示脈動指示器（pulsing dot），使用 `w-2 h-2 rounded-full bg-accent animate-pulse` 樣式

#### Scenario: 串流完成移除指示

- **WHEN** 收到 `copilot:stream-status` 訊息且 status 為 `'idle'`
- **THEN** sidebar MUST 移除該對話的脈動指示器

#### Scenario: 串流錯誤指示

- **WHEN** 收到 `copilot:stream-status` 訊息且 status 為 `'error'`
- **THEN** sidebar MUST 將該對話的指示器替換為紅色圓點（`bg-error`），不使用 `animate-pulse`

### Requirement: 前端自動訂閱管理

前端 SHALL 在切換對話時自動管理串流訂閱，確保即時接收事件並在離開時釋放資源。

#### Scenario: 切換到有活躍串流的對話

- **WHEN** 使用者切換 `activeConversationId` 至一個有 running stream 的對話
- **THEN** 前端 MUST 自動發送 `copilot:subscribe` 訊息訂閱該對話的事件串流，透過 eventBuffer catch-up 恢復顯示中間狀態

#### Scenario: 離開對話時取消訂閱

- **WHEN** 使用者從一個已訂閱串流的對話切換到另一個對話
- **THEN** 前端 MUST 自動發送 `copilot:unsubscribe` 訊息取消原對話的訂閱

#### Scenario: 切換到無活躍串流的對話

- **WHEN** 使用者切換到一個沒有 running stream 的對話
- **THEN** 前端 MUST NOT 發送 `copilot:subscribe` 訊息，直接從 DB 載入歷史訊息顯示

#### Scenario: 頁面載入時初始化

- **WHEN** 前端頁面載入完成且 WebSocket 連線建立
- **THEN** 前端 MUST 發送 `copilot:status` 查詢活躍串流，並將結果同步至 Zustand store 的 `activeStreams: Map<string, string>` 狀態
