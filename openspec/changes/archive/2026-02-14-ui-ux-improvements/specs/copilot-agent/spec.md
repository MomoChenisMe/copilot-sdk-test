## MODIFIED Requirements

### Requirement: 串流回應

系統 SHALL 將 SDK 的串流事件即時轉譯為 WebSocket 訊息，傳送到前端。EventRelay MUST 使用防禦性屬性存取和 debug logging。

#### Scenario: 文字串流

- **WHEN** SDK 發出 `assistant.message_delta` 事件
- **THEN** 系統 MUST 即時發送 `copilot:delta` WebSocket 訊息到前端，包含增量文字內容。系統 MUST 使用防禦性屬性存取（fallback chain）讀取 event 物件的 content 欄位

#### Scenario: 推理過程串流

- **WHEN** SDK 發出 `assistant.reasoning_delta` 事件
- **THEN** 系統 MUST 即時發送 `copilot:reasoning_delta` WebSocket 訊息到前端

#### Scenario: 回應完成

- **WHEN** SDK 發出 `session.idle` 事件
- **THEN** 系統 MUST 發送 `copilot:idle` WebSocket 訊息，並將完整訊息儲存到 SQLite

#### Scenario: 完整訊息事件

- **WHEN** SDK 發出 `assistant.message` 事件
- **THEN** 系統 MUST 發送 `copilot:message` WebSocket 訊息，包含完整的 assistant 回應內容

### Requirement: 錯誤處理

系統 SHALL 將 SDK 錯誤轉譯為前端可理解的錯誤訊息。

#### Scenario: SDK session 錯誤

- **WHEN** SDK 發出錯誤事件
- **THEN** 系統 MUST 發送 `copilot:error` WebSocket 訊息，包含可讀的錯誤描述

#### Scenario: Session 建立或訊息發送失敗

- **WHEN** `sessionManager.getOrCreateSession()` 或 `sessionManager.sendMessage()` 拋出例外
- **THEN** 系統 MUST 發送 `copilot:error` WebSocket 訊息，包含錯誤描述

## ADDED Requirements

### Requirement: EventRelay debug logging

EventRelay SHALL 在每個 SDK event handler 中記錄 debug 級別的 log，協助診斷 SDK event 結構。

#### Scenario: 記錄 SDK event

- **WHEN** EventRelay 收到任何 SDK event（`assistant.message_delta`, `assistant.message`, `session.idle` 等）
- **THEN** 系統 MUST 以 debug 級別記錄完整的 event 物件（JSON 序列化），使用 pino logger

#### Scenario: 防禦性屬性存取

- **WHEN** SDK event 物件的屬性名稱與預期不符
- **THEN** EventRelay MUST 使用 fallback chain 嘗試多個可能的屬性名（如 `deltaContent` → `delta` → `content`），最終 fallback 為空字串
