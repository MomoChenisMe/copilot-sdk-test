## MODIFIED Requirements

### Requirement: 事件流轉機制

SDK 事件 SHALL 經由 EventRelay 進行分發，同時累積內容和緩衝事件，確保無 WS 連線時不遺失資料。所有廣播事件 MUST 包含 `conversationId` 欄位。

#### Scenario: 事件處理流程

- **WHEN** Copilot SDK session 發出任何事件
- **THEN** 系統 MUST 按以下順序處理：
  1. EventRelay 接收原始事件
  2. 呼叫 `accumulatingSend`：更新 accumulation 狀態（content segments、tool records、reasoning、turnSegments）
  3. 在事件 `data` 中注入 `conversationId: stream.conversationId`，產生 enrichedMsg
  4. 將 enrichedMsg 推入 `eventBuffer`（用於後續 catch-up）
  5. 將 enrichedMsg 廣播給所有已註冊的 subscribers（若有）

#### Scenario: 無訂閱者時事件緩衝

- **WHEN** SDK 發出事件但當前無任何 WebSocket 訂閱者
- **THEN** 系統 MUST 繼續執行累積（accumulation）和事件緩衝（eventBuffer push），MUST NOT 丟棄任何事件

#### Scenario: Idle 事件觸發持久化

- **WHEN** SDK 發出 `session.idle` 事件且累積層有內容
- **THEN** 系統 MUST 將累積的 assistant message（含 content 和 metadata）持久化至 DB，然後重設累積狀態

#### Scenario: Idle 事件無累積內容

- **WHEN** SDK 發出 `session.idle` 事件但累積層無任何內容
- **THEN** 系統 MUST NOT 寫入空白 message 至 DB

#### Scenario: 廣播事件包含 conversationId

- **WHEN** 任何 copilot 事件被廣播給 subscribers
- **THEN** 事件的 `data` 物件 MUST 包含 `conversationId: string` 欄位，值為該 stream 的 conversationId

#### Scenario: eventBuffer 中的事件包含 conversationId

- **WHEN** 新訂閱者透過 `subscribe()` 接收 eventBuffer catch-up
- **THEN** catch-up 事件的 `data` MUST 包含 `conversationId` 欄位

## ADDED Requirements

### Requirement: 前端事件 conversationId 過濾

前端 SHALL 根據事件中的 `conversationId` 過濾 WebSocket 事件，僅處理當前活躍對話（或對應 Tab）的事件。

#### Scenario: 過濾非活躍對話事件

- **WHEN** WebSocket 收到 conversation-scoped 事件（`copilot:delta`、`copilot:message`、`copilot:tool_start`、`copilot:tool_end`、`copilot:reasoning_delta`、`copilot:reasoning`、`copilot:idle`、`copilot:error`）且 `data.conversationId` 不匹配任何開啟的 Tab
- **THEN** 前端 MUST 靜默丟棄該事件

#### Scenario: 全域事件不過濾

- **WHEN** WebSocket 收到 `copilot:active-streams` 或 `copilot:stream-status` 事件
- **THEN** 前端 MUST 正常處理，不進行 conversationId 過濾

#### Scenario: 防止串流事件洩漏

- **WHEN** 對話 A 正在串流，使用者切換到對話 B
- **THEN** 對話 A 的串流事件 MUST NOT 影響對話 B 的顯示狀態
