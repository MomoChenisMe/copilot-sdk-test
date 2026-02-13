## ADDED Requirements

### Requirement: CopilotClient 單例管理

系統 SHALL 維護一個 CopilotClient 單例實例，透過 `getClient()` 取得。Client MUST 在首次使用時自動啟動，graceful shutdown 時自動停止。

#### Scenario: 首次取得 Client

- **WHEN** 呼叫 `getClient()` 且 Client 尚未啟動
- **THEN** 系統自動建立並啟動 CopilotClient，回傳可用的 client 實例

#### Scenario: 後續取得 Client

- **WHEN** 呼叫 `getClient()` 且 Client 已在執行中
- **THEN** 直接回傳現有的 client 實例，不重複建立

#### Scenario: Graceful shutdown

- **WHEN** 應用程式收到 SIGTERM/SIGINT
- **THEN** 系統 MUST 呼叫 CopilotClient 的 stop 方法，等待清理完成

### Requirement: SDK Session 建立

系統 SHALL 能建立新的 Copilot SDK session，對應到一個 conversation。Session 建立時 MUST 設定 `infiniteSessions: { enabled: true }`。

#### Scenario: 新對話建立 session

- **WHEN** 使用者在新對話中首次發送訊息
- **THEN** 系統建立新的 SDK session，設定指定的 model 和 workingDirectory，並將 sdkSessionId 儲存到 conversations 表

#### Scenario: 恢復既有 session

- **WHEN** 使用者在已有 sdkSessionId 的對話中發送訊息
- **THEN** 系統 MUST 恢復既有的 SDK session 而非建立新的

### Requirement: 串流回應

系統 SHALL 將 SDK 的串流事件即時轉譯為 WebSocket 訊息，傳送到前端。

#### Scenario: 文字串流

- **WHEN** SDK 發出 `assistant.message_delta` 事件
- **THEN** 系統 MUST 即時發送 `copilot:delta` WebSocket 訊息到前端，包含增量文字內容

#### Scenario: 推理過程串流

- **WHEN** SDK 發出 `assistant.reasoning_delta` 事件
- **THEN** 系統 MUST 即時發送 `copilot:reasoning_delta` WebSocket 訊息到前端

#### Scenario: 回應完成

- **WHEN** SDK 發出 `session.idle` 事件
- **THEN** 系統 MUST 發送 `copilot:idle` WebSocket 訊息，並將完整訊息儲存到 SQLite

### Requirement: 工具呼叫事件

系統 SHALL 將 SDK 的工具呼叫事件轉譯為 WebSocket 訊息。

#### Scenario: 工具開始執行

- **WHEN** SDK 發出 `tool.execution_start` 事件
- **THEN** 系統 MUST 發送 `copilot:tool_start` 訊息，包含 toolCallId、toolName、arguments

#### Scenario: 工具執行完成

- **WHEN** SDK 發出 `tool.execution_complete` 事件
- **THEN** 系統 MUST 發送 `copilot:tool_end` 訊息，包含 toolCallId、success、result 或 error

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

系統 SHALL 將 SDK 錯誤轉譯為前端可理解的錯誤訊息。

#### Scenario: SDK session 錯誤

- **WHEN** SDK 發出錯誤事件
- **THEN** 系統 MUST 發送 `copilot:error` WebSocket 訊息，包含可讀的錯誤描述
