## MODIFIED Requirements

### Requirement: 串流回應

系統 SHALL 將 SDK 的串流事件即時轉譯為 WebSocket 訊息，傳送到前端。EventRelay MUST 使用防禦性資料存取模式（`e.data ?? e`）從 SDK 事件中提取欄位，以同時支援巢狀結構（`{ type, data: { ... } }`）和扁平結構（`{ messageId, content, ... }`）。

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
- **THEN** 系統 MUST 發送 `copilot:message` WebSocket 訊息，正確提取 `messageId` 和 `content`。若 content 為空字串或 undefined，仍 MUST 轉發事件（讓前端 fallback 處理）。

#### Scenario: 回應完成

- **WHEN** SDK 發出 `session.idle` 事件
- **THEN** 系統 MUST 發送 `copilot:idle` WebSocket 訊息，並將完整訊息儲存到 SQLite

### Requirement: 工具呼叫事件

系統 SHALL 將 SDK 的工具呼叫事件轉譯為 WebSocket 訊息。EventRelay MUST 使用防禦性資料存取模式提取事件欄位。

#### Scenario: 工具開始執行

- **WHEN** SDK 發出 `tool.execution_start` 事件
- **THEN** 系統 MUST 發送 `copilot:tool_start` 訊息，從 `(event.data ?? event)` 提取 toolCallId、toolName、arguments

#### Scenario: 工具執行完成

- **WHEN** SDK 發出 `tool.execution_complete` 事件
- **THEN** 系統 MUST 發送 `copilot:tool_end` 訊息，從 `(event.data ?? event)` 提取 toolCallId、success、result 或 error

### Requirement: 錯誤處理

系統 SHALL 將 SDK 錯誤轉譯為前端可理解的錯誤訊息。EventRelay MUST 使用防禦性資料存取模式提取事件欄位。

#### Scenario: SDK session 錯誤

- **WHEN** SDK 發出錯誤事件
- **THEN** 系統 MUST 發送 `copilot:error` WebSocket 訊息，從 `(event.data ?? event)` 提取 errorType 和 message

## ADDED Requirements

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
