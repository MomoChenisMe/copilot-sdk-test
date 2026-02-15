## ADDED Requirements

### Requirement: 後端綜合事件去重

後端累積層（`accumulatingSend`）SHALL 使用三組持久化 `Set<string>`（`seenMessageIds`、`seenToolCallIds`、`seenReasoningIds`）追蹤所有已處理的事件 ID，防止 Copilot SDK `infiniteSessions` 模式重播的歷史事件被重複累積和轉發。去重 Set MUST 宣告在 `createCopilotHandler` 閉包層級（而非 `AccumulationState` 內），且跨 turn 永不重置（事件 ID 為全域唯一 UUID）。

#### Scenario: 首次接收到 assistant.message 事件

- **WHEN** 後端接收到 `copilot:message` 事件且 `messageId` 尚未出現在 `seenMessageIds` 中
- **THEN** 系統 MUST 將 `messageId` 加入 `seenMessageIds`，累積 content 到 `contentSegments` 和 `turnSegments`，並轉發事件到前端

#### Scenario: 接收到重複 messageId 的 assistant.message 事件

- **WHEN** 後端接收到 `copilot:message` 事件且 `messageId` 已存在於 `seenMessageIds` 中
- **THEN** 系統 MUST 跳過此事件，不累積 content，不轉發到前端（直接 return）

#### Scenario: 接收到已完成 messageId 的 delta 事件

- **WHEN** 後端接收到 `copilot:delta` 事件且 `messageId` 已存在於 `seenMessageIds` 中
- **THEN** 系統 MUST 跳過此事件，不轉發到前端

#### Scenario: 首次接收到 tool_start 事件

- **WHEN** 後端接收到 `copilot:tool_start` 事件且 `toolCallId` 尚未出現在 `seenToolCallIds` 中
- **THEN** 系統 MUST 將 `toolCallId` 加入 `seenToolCallIds`，累積 tool record 到 `toolRecords` 和 `turnSegments`，並轉發事件到前端

#### Scenario: 接收到重複 toolCallId 的 tool_start 事件

- **WHEN** 後端接收到 `copilot:tool_start` 事件且 `toolCallId` 已存在於 `seenToolCallIds` 中
- **THEN** 系統 MUST 跳過此事件，不累積 tool record，不轉發到前端（直接 return）

#### Scenario: 接收到 tool_end 但無對應 tool_start 記錄

- **WHEN** 後端接收到 `copilot:tool_end` 事件但 `accumulation.toolRecords` 中無對應 `toolCallId` 的記錄
- **THEN** 系統 MUST 跳過此事件（直接 return），不轉發到前端

#### Scenario: 接收到重複 reasoningId 的 reasoning_delta 事件

- **WHEN** 後端接收到 `copilot:reasoning_delta` 事件且 `reasoningId` 已存在於 `seenReasoningIds` 中
- **THEN** 系統 MUST 跳過此事件，不累積 reasoning text，不轉發到前端

#### Scenario: 接收到重複 reasoningId 的 reasoning 完成事件

- **WHEN** 後端接收到 `copilot:reasoning` 完成事件且 `reasoningId` 已存在於 `seenReasoningIds` 中
- **THEN** 系統 MUST 跳過此事件，不加入 turnSegments，不轉發到前端

#### Scenario: 去重 Set 跨 turn 持久化

- **WHEN** 接收到 `copilot:idle` 或新的 `copilot:send` 事件
- **THEN** 系統 MUST 重置 `accumulation`（contentSegments、toolRecords、reasoningText、turnSegments）但 MUST NOT 清空去重 Set（`seenMessageIds`、`seenToolCallIds`、`seenReasoningIds`），因為事件 ID 為全域唯一 UUID，跨 turn 重播仍需過濾

#### Scenario: messageId 為 undefined 時不去重

- **WHEN** 後端接收到 `copilot:message` 事件但 `messageId` 為 `undefined`
- **THEN** 系統 MUST 正常處理此事件（不做去重判斷），累積 content 並轉發

### Requirement: 穩定 Relay 模式

後端 MUST 使用單一 `EventRelay` 實例搭配可變 `currentSendFn` 回呼，而非每次 turn 建立新的 EventRelay。此穩定 relay 模式 SHALL 防止在 SDK session 上累積多組事件監聽器。

#### Scenario: 新 turn 更新 send callback

- **WHEN** 接收到新的 `copilot:send` 事件
- **THEN** 系統 MUST 更新 `currentSendFn` 為本次 turn 的 `accumulatingSend`，而非建立新的 EventRelay 實例

#### Scenario: relay attach 到 session

- **WHEN** 取得 SDK session 後
- **THEN** 系統 MUST 呼叫 `relay.attach(session)`，EventRelay 內部會先 detach 前一個 session 的監聽器再 attach 新的

### Requirement: 後端 reasoning 寫入 turnSegments

後端累積層 SHALL 將 reasoning 完成事件的內容寫入 `accumulation.turnSegments`，確保持久化到 SQLite 的 `metadata.turnSegments` 包含 `{ type: 'reasoning' }` segment。`copilot:reasoning_delta` 和 `copilot:reasoning` MUST 分開處理為獨立的 switch case。

#### Scenario: reasoning delta 累積

- **WHEN** 後端接收到 `copilot:reasoning_delta` 事件
- **THEN** 系統 MUST 將 content 附加到 `accumulation.reasoningText`，但 MUST NOT 加入 `turnSegments`

#### Scenario: reasoning 完成事件 — 有先前 delta

- **WHEN** 後端接收到 `copilot:reasoning` 完成事件且 `accumulation.reasoningText` 已有內容
- **THEN** 系統 MUST 將 `{ type: 'reasoning', content: accumulation.reasoningText }` 推入 `accumulation.turnSegments`，MUST NOT 覆蓋已累積的 `reasoningText`

#### Scenario: reasoning 完成事件 — 無先前 delta

- **WHEN** 後端接收到 `copilot:reasoning` 完成事件且 `accumulation.reasoningText` 為空
- **THEN** 系統 MUST 先將事件 content 設定為 `accumulation.reasoningText`，再將 `{ type: 'reasoning', content }` 推入 `accumulation.turnSegments`

#### Scenario: 無 reasoning 時不加入空 segment

- **WHEN** 後端接收到 `copilot:reasoning` 完成事件但 content 為空且 `accumulation.reasoningText` 也為空
- **THEN** 系統 MUST NOT 加入任何 reasoning segment 到 `turnSegments`

#### Scenario: reasoning 在持久化的 turnSegments 中的位置

- **WHEN** 一個 turn 包含 reasoning + tool calls + text content，並觸發 `copilot:idle` 持久化
- **THEN** 持久化的 `metadata.turnSegments` 中 reasoning segment MUST 出現在 tool 和 text segments 之前（因為 SDK 事件順序保證 reasoning 先於 message/tool）

## MODIFIED Requirements

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
