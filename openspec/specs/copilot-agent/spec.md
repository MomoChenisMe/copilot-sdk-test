## ADDED Requirements

### Requirement: CopilotClient 單例管理

系統 SHALL 維護一個 CopilotClient 單例實例，透過 `getClient()` 取得。Client MUST 在首次使用時自動啟動，graceful shutdown 時自動停止。`ClientManager` 建構子 MUST 接收 config 物件（含 `githubToken?` 和 `githubClientId?`），並根據 config 決定 CopilotClient 的認證參數。

#### Scenario: 首次取得 Client（有 githubToken）

- **WHEN** 呼叫 `getClient()` 且 Client 尚未啟動，且 config 含 `githubToken`
- **THEN** 系統 MUST 以 `new CopilotClient({ githubToken })` 建立並啟動 client

#### Scenario: 首次取得 Client（無 githubToken）

- **WHEN** 呼叫 `getClient()` 且 Client 尚未啟動，且 config 無 `githubToken`
- **THEN** 系統 MUST 以 `new CopilotClient()` 建立並啟動 client（使用 SDK 預設認證）

#### Scenario: 後續取得 Client

- **WHEN** 呼叫 `getClient()` 且 Client 已在執行中
- **THEN** 直接回傳現有的 client 實例，不重複建立

#### Scenario: Graceful shutdown

- **WHEN** 應用程式收到 SIGTERM/SIGINT
- **THEN** 系統 MUST 呼叫 CopilotClient 的 stop 方法，等待清理完成

#### Scenario: 動態更新 token 後取得 Client

- **WHEN** 呼叫 `setGithubToken(token)` 後再呼叫 `getClient()`
- **THEN** 系統 MUST 使用新 token 建立新的 CopilotClient

### Requirement: SDK Session 建立

系統 SHALL 能建立新的 Copilot SDK session，對應到一個 conversation。Session 建立時 MUST 設定 `infiniteSessions: { enabled: true }`。

#### Scenario: 新對話建立 session

- **WHEN** 使用者在新對話中首次發送訊息
- **THEN** 系統建立新的 SDK session，設定指定的 model 和 workingDirectory，並將 sdkSessionId 儲存到 conversations 表

#### Scenario: 恢復既有 session

- **WHEN** 使用者在已有 sdkSessionId 的對話中發送訊息
- **THEN** 系統 MUST 恢復既有的 SDK session 而非建立新的

### Requirement: 串流回應

系統 SHALL 將 SDK 的串流事件即時轉譯為 WebSocket 訊息，傳送到前端。EventRelay MUST 使用防禦性資料存取模式（`e.data ?? e`）從 SDK 事件中提取欄位，以同時支援巢狀結構（`{ type, data: { ... } }`）和扁平結構（`{ messageId, content, ... }`）。後端累積層 MUST 對所有事件類型執行基於唯一 ID（`messageId`、`toolCallId`、`reasoningId`）的綜合去重，防止 `infiniteSessions` 模式重播歷史事件。

#### Scenario: 文字串流

- **WHEN** SDK 發出 `assistant.message_delta` 事件
- **THEN** 系統 MUST 即時發送 `copilot:delta` WebSocket 訊息到前端，包含增量文字內容。EventRelay MUST 從 `(event.data ?? event)` 中提取 `deltaContent`、`delta` 或 `content` 欄位（依序 fallback）。

#### Scenario: 文字串流（巢狀事件結構）

- **WHEN** SDK 發出 `assistant.message_delta` 事件，且事件結構為 `{ type, data: { messageId, deltaContent } }`
- **THEN** EventRelay MUST 正確從 `event.data.deltaContent` 提取內容，而非存取 `event.deltaContent`（undefined）

#### Scenario: 推理過程串流

- **WHEN** SDK 發出 `assistant.reasoning_delta` 事件
- **THEN** 系統 MUST 即時發送 `copilot:reasoning_delta` WebSocket 訊息到前端，使用相同的防禦性資料存取模式

#### Scenario: 完整訊息接收

- **WHEN** SDK 發出 `assistant.message` 事件
- **THEN** 系統 MUST 發送 `copilot:message` WebSocket 訊息，正確提取 `messageId` 和 `content`。若 content 為空字串或 undefined，仍 MUST 轉發事件（讓前端 fallback 處理）。後端累積層 MUST 對此事件執行 `messageId` 去重檢查。

#### Scenario: 完整訊息去重

- **WHEN** SDK 在同一 turn 或跨 turn 中發出多個 `assistant.message` 事件且 `messageId` 相同
- **THEN** 後端累積層 MUST 僅處理首次出現的事件，後續重複事件 MUST 被丟棄（不累積、不轉發）

#### Scenario: 回應完成

- **WHEN** SDK 發出 `session.idle` 事件
- **THEN** 系統 MUST 發送 `copilot:idle` WebSocket 訊息，並將完整訊息儲存到 SQLite。持久化的 `metadata.turnSegments` MUST 包含 reasoning segment（若存在）。

### Requirement: 後端綜合事件去重

後端累積層（`accumulatingSend`）SHALL 使用三組持久化 `Set<string>`（`seenMessageIds`、`seenToolCallIds`、`seenReasoningIds`）追蹤所有已處理的事件 ID，防止 Copilot SDK `infiniteSessions` 模式重播的歷史事件被重複累積和轉發。去重 Set MUST 宣告在 `createCopilotHandler` 閉包層級（而非 `AccumulationState` 內），且跨 turn 永不重置（事件 ID 為全域唯一 UUID）。

#### Scenario: 接收到重複 messageId 的 assistant.message 事件

- **WHEN** 後端接收到 `copilot:message` 事件且 `messageId` 已存在於 `seenMessageIds` 中
- **THEN** 系統 MUST 跳過此事件，不累積 content，不轉發到前端（直接 return）

#### Scenario: 接收到重複 toolCallId 的 tool_start 事件

- **WHEN** 後端接收到 `copilot:tool_start` 事件且 `toolCallId` 已存在於 `seenToolCallIds` 中
- **THEN** 系統 MUST 跳過此事件，不累積 tool record，不轉發到前端

#### Scenario: 接收到 tool_end 但無對應 tool_start 記錄

- **WHEN** 後端接收到 `copilot:tool_end` 事件但 `accumulation.toolRecords` 中無對應 `toolCallId` 的記錄
- **THEN** 系統 MUST 跳過此事件，不轉發到前端

#### Scenario: 接收到重複 reasoningId 的 reasoning 事件

- **WHEN** 後端接收到 `copilot:reasoning_delta` 或 `copilot:reasoning` 事件且 `reasoningId` 已存在於 `seenReasoningIds` 中
- **THEN** 系統 MUST 跳過此事件，不累積 reasoning text，不轉發到前端

#### Scenario: 去重 Set 跨 turn 持久化

- **WHEN** 接收到 `copilot:idle` 或新的 `copilot:send` 事件
- **THEN** 系統 MUST 重置 `accumulation`（contentSegments、toolRecords、reasoningText、turnSegments）但 MUST NOT 清空去重 Set，因為事件 ID 為全域唯一 UUID，跨 turn 重播仍需過濾

### Requirement: 穩定 Relay 模式

後端 MUST 使用單一 `EventRelay` 實例搭配可變 `currentSendFn` 回呼，而非每次 turn 建立新的 EventRelay。此穩定 relay 模式 SHALL 防止在 SDK session 上累積多組事件監聽器。

#### Scenario: 新 turn 更新 send callback

- **WHEN** 接收到新的 `copilot:send` 事件
- **THEN** 系統 MUST 更新 `currentSendFn` 為本次 turn 的 `accumulatingSend`，而非建立新的 EventRelay 實例

### Requirement: 後端 reasoning 寫入 turnSegments

後端累積層 SHALL 將 reasoning 完成事件的內容寫入 `accumulation.turnSegments`，確保持久化到 SQLite 的 `metadata.turnSegments` 包含 `{ type: 'reasoning' }` segment。`copilot:reasoning_delta` 和 `copilot:reasoning` MUST 分開處理為獨立的 switch case。

#### Scenario: reasoning 完成事件加入 turnSegments

- **WHEN** 後端接收到 `copilot:reasoning` 完成事件且有已累積或事件本身的 reasoning 內容
- **THEN** 系統 MUST 將 `{ type: 'reasoning', content }` 推入 `accumulation.turnSegments`

#### Scenario: reasoning 在持久化 turnSegments 中的位置

- **WHEN** 一個 turn 包含 reasoning + tool calls + text content
- **THEN** 持久化的 `metadata.turnSegments` 中 reasoning segment MUST 出現在 tool 和 text segments 之前（因為 SDK 事件順序保證 reasoning 先於 message/tool）

### Requirement: 工具呼叫事件

系統 SHALL 將 SDK 的工具呼叫事件轉譯為 WebSocket 訊息。EventRelay MUST 使用防禦性資料存取模式提取事件欄位。

#### Scenario: 工具開始執行

- **WHEN** SDK 發出 `tool.execution_start` 事件
- **THEN** 系統 MUST 發送 `copilot:tool_start` 訊息，從 `(event.data ?? event)` 提取 toolCallId、toolName、arguments

#### Scenario: 工具執行完成

- **WHEN** SDK 發出 `tool.execution_complete` 事件
- **THEN** 系統 MUST 發送 `copilot:tool_end` 訊息，從 `(event.data ?? event)` 提取 toolCallId、success、result 或 error

### Requirement: 中止回應

系統 SHALL 支援中止正在進行的 AI 回應。

#### Scenario: 使用者中止串流

- **WHEN** 前端發送 `copilot:abort` WebSocket 訊息
- **THEN** 系統 MUST 呼叫 SDK session 的 abort 方法，停止串流

### Requirement: 模型切換

系統 SHALL 支援查詢可用模型列表和切換模型。

#### Scenario: 查詢可用模型

- **WHEN** 前端請求 `GET /api/copilot/models`
- **THEN** 系統 MUST 回傳 SDK 提供的可用模型列表

#### Scenario: 新對話選擇模型

- **WHEN** 使用者建立新對話並指定模型
- **THEN** 系統 MUST 使用指定模型建立 SDK session

### Requirement: 權限自動批准

系統 SHALL 自動批准所有 Copilot SDK 的權限請求（讀寫檔案、執行指令等），不詢問使用者。

#### Scenario: 工具權限請求

- **WHEN** SDK 請求執行需要權限的操作（如寫入檔案、執行 shell 指令）
- **THEN** 系統 MUST 自動批准，不中斷 AI 流程

### Requirement: 錯誤處理

系統 SHALL 將 SDK 錯誤轉譯為前端可理解的錯誤訊息。EventRelay MUST 使用防禦性資料存取模式提取事件欄位。

#### Scenario: SDK session 錯誤

- **WHEN** SDK 發出錯誤事件
- **THEN** 系統 MUST 發送 `copilot:error` WebSocket 訊息，從 `(event.data ?? event)` 提取 errorType 和 message

### Requirement: 前端 empty-content 訊息防禦

前端 useCopilot hook SHALL 防禦 `copilot:message` 事件中 content 為空的情況，確保助手訊息不會遺失。

#### Scenario: copilot:message 帶有內容

- **WHEN** 前端接收到 `copilot:message` 事件且 `data.content` 非空
- **THEN** hook MUST 設定 `receivedMessageRef = true` 並將訊息加入 messages 狀態

#### Scenario: copilot:message 內容為空

- **WHEN** 前端接收到 `copilot:message` 事件且 `data.content` 為空字串或 undefined
- **THEN** hook MUST 不設定 `receivedMessageRef = true`，讓 `copilot:idle` 的 fallback 機制使用累積的 streamingText 作為訊息內容

#### Scenario: idle fallback 轉換 streamingText

- **WHEN** 前端接收到 `copilot:idle` 事件，且 `receivedMessageRef` 為 false，且 streamingText 非空
- **THEN** hook MUST 將累積的 streamingText 轉換為永久的 assistant 訊息加入 messages 狀態
