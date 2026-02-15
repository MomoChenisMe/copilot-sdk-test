## ADDED Requirements

### Requirement: 前端綜合事件去重

前端 `useCopilot` hook SHALL 使用三組持久化 `useRef<Set<string>>`（`seenMessageIdsRef`、`seenToolCallIdsRef`、`seenReasoningIdsRef`）追蹤所有已處理的事件 ID，作為 belt-and-suspenders 防護機制。去重 Set MUST 跨 turn 永不重置（事件 ID 為全域唯一 UUID），與後端行為一致。

#### Scenario: 首次接收到 copilot:message 事件

- **WHEN** 前端接收到 `copilot:message` 事件且 `messageId` 尚未出現在 seen set 中
- **THEN** hook MUST 將 `messageId` 加入 seen set，正常處理 content（推入 `turnContentSegments` 和 `turnSegments`）

#### Scenario: 接收到重複 messageId 的 copilot:message 事件

- **WHEN** 前端接收到 `copilot:message` 事件且 `messageId` 已存在於 seen set 中
- **THEN** hook MUST 跳過此事件，不推入任何 segment

#### Scenario: 首次接收到 copilot:tool_start 事件

- **WHEN** 前端接收到 `copilot:tool_start` 事件且 `toolCallId` 尚未出現在 `seenToolCallIdsRef` 中
- **THEN** hook MUST 將 `toolCallId` 加入 seen set，正常處理 tool record 和 turn segment

#### Scenario: 接收到重複 toolCallId 的 copilot:tool_start 事件

- **WHEN** 前端接收到 `copilot:tool_start` 事件且 `toolCallId` 已存在於 `seenToolCallIdsRef` 中
- **THEN** hook MUST 跳過此事件

#### Scenario: 接收到 copilot:tool_end 但無對應 tool record

- **WHEN** 前端接收到 `copilot:tool_end` 事件但 store 的 `toolRecords` 中無對應 `toolCallId` 的記錄
- **THEN** hook MUST 跳過此事件

#### Scenario: 接收到重複 reasoningId 的 reasoning_delta 事件

- **WHEN** 前端接收到 `copilot:reasoning_delta` 事件且 `reasoningId` 已存在於 `seenReasoningIdsRef` 中
- **THEN** hook MUST 跳過此事件

#### Scenario: 接收到重複 reasoningId 的 reasoning 完成事件

- **WHEN** 前端接收到 `copilot:reasoning` 完成事件且 `reasoningId` 已存在於 `seenReasoningIdsRef` 中
- **THEN** hook MUST 跳過此事件

#### Scenario: 去重 Set 跨 turn 持久化

- **WHEN** 接收到 `copilot:idle` 事件或使用者發送新訊息
- **THEN** hook MUST NOT 清空任何去重 Set（`seenMessageIdsRef`、`seenToolCallIdsRef`、`seenReasoningIdsRef`），因為事件 ID 為全域唯一 UUID

#### Scenario: messageId 為 undefined 時不去重

- **WHEN** 前端接收到 `copilot:message` 事件但 `messageId` 為 `undefined`
- **THEN** hook MUST 正常處理此事件（不做去重判斷）

### Requirement: 前端 reasoning 加入 turnSegments

前端 `useCopilot` hook 的 `copilot:reasoning` 完成事件處理器 SHALL 始終將 reasoning 加入 `turnSegments`，確保 reasoning segment 出現在正確的交錯位置（在 tool 和 text segments 之前）。

#### Scenario: reasoning 完成事件 — 有先前 delta

- **WHEN** 接收到 `copilot:reasoning` 完成事件且 `reasoningText` 已有 delta 累積的內容
- **THEN** hook MUST NOT 覆蓋 `reasoningText`，但 MUST 將 `{ type: 'reasoning', content: reasoningText }` 加入 `turnSegments`

#### Scenario: reasoning 完成事件 — 無先前 delta

- **WHEN** 接收到 `copilot:reasoning` 完整事件且 `reasoningText` 為空
- **THEN** hook MUST 先將事件 content 加入 `reasoningText`，再將 `{ type: 'reasoning', content }` 加入 `turnSegments`

#### Scenario: reasoning 完成事件 — content 為空

- **WHEN** 接收到 `copilot:reasoning` 完成事件但 content 為空且 `reasoningText` 也為空
- **THEN** hook MUST NOT 加入任何 reasoning segment 到 `turnSegments`

#### Scenario: idle metadata 包含 reasoning turnSegment

- **WHEN** 接收到 `copilot:idle` 事件且 turn 中有 reasoning
- **THEN** 建立的 assistant message 的 `metadata.turnSegments` MUST 包含 `{ type: 'reasoning' }` segment

### Requirement: ChatView 串流中 reasoning 渲染

ChatView 串流區塊 SHALL 在 turnSegments 渲染路徑中正確顯示 reasoning，即使 reasoning segment 尚未加入 turnSegments（中間態：reasoning deltas 累積中但 reasoning complete 尚未到達）。

#### Scenario: turnSegments 有 reasoning segment

- **WHEN** 串流中 turnSegments 包含 `{ type: 'reasoning' }` segment
- **THEN** ChatView MUST 在該 segment 的位置渲染 ReasoningBlock

#### Scenario: turnSegments 無 reasoning 但 reasoningText 不為空（中間態）

- **WHEN** 串流中 turnSegments 不包含 reasoning segment，但 store 的 `reasoningText` 不為空
- **THEN** ChatView MUST 在 turnSegments 渲染列表的最前面顯示 ReasoningBlock（使用 `reasoningText` 和 `isStreaming`）

#### Scenario: 無 reasoning 也無 reasoningText

- **WHEN** 串流中 turnSegments 不包含 reasoning segment，且 `reasoningText` 為空
- **THEN** ChatView MUST NOT 渲染任何 ReasoningBlock

### Requirement: MessageBlock legacy reasoning 降級渲染

MessageBlock SHALL 在渲染歷史訊息時，若 `metadata.turnSegments` 存在但不包含 reasoning segment，且 `metadata.reasoning` 有值，MUST 在 turnSegments 渲染列表的最前面補上 ReasoningBlock。

#### Scenario: turnSegments 含 reasoning segment（新格式）

- **WHEN** 渲染歷史訊息且 `turnSegments` 包含 `{ type: 'reasoning' }` segment
- **THEN** MessageBlock MUST 在 segment 的位置渲染 ReasoningBlock，MUST NOT 額外渲染 `metadata.reasoning`

#### Scenario: turnSegments 無 reasoning 但 metadata.reasoning 有值（legacy 格式）

- **WHEN** 渲染歷史訊息且 `turnSegments` 存在且非空但不包含 reasoning segment，且 `metadata.reasoning` 有值
- **THEN** MessageBlock MUST 在 turnSegments 渲染列表的最前面渲染 ReasoningBlock（使用 `metadata.reasoning`，`isStreaming=false`）

#### Scenario: 防止 reasoning 重複渲染

- **WHEN** 渲染歷史訊息且 `turnSegments` 包含 reasoning segment，且 `metadata.reasoning` 也有值
- **THEN** MessageBlock MUST 僅渲染 turnSegments 中的 reasoning segment，MUST NOT 額外渲染 `metadata.reasoning`

#### Scenario: turnSegments 為空 — fallback 渲染路徑

- **WHEN** 渲染歷史訊息且 `turnSegments` 為 null 或空陣列
- **THEN** MessageBlock MUST 使用 fallback 渲染路徑：reasoning → tools → text content（行為不變）

## MODIFIED Requirements

### Requirement: 推理過程顯示

系統 SHALL 顯示 AI 的推理過程，使用圓角卡片樣式。推理過程 MUST 在 streaming 期間即時顯示，且 MUST 在 streaming 結束後持久化於 message metadata 中，在對話歷史中可查看。推理過程 MUST 作為 `{ type: 'reasoning' }` segment 加入 `turnSegments`，確保渲染位置正確且持久化完整。

#### Scenario: 推理串流

- **WHEN** 接收到 `copilot:reasoning_delta` 事件
- **THEN** 介面 MUST 在 assistant block 頂部顯示可折疊的「推理過程」卡片（`rounded-xl border border-border`），即時附加內容

#### Scenario: 推理完整事件 fallback

- **WHEN** 接收到 `copilot:reasoning` 完整事件且當前 `reasoningText` 為空
- **THEN** 系統 MUST 使用完整事件的 `content` 設定 reasoning text

#### Scenario: 推理完整事件重複防護

- **WHEN** 接收到 `copilot:reasoning` 完整事件但 `reasoningText` 已有內容（由 delta 累積）
- **THEN** 系統 MUST 不覆蓋已累積的內容

#### Scenario: 推理完整事件加入 turnSegments

- **WHEN** 接收到 `copilot:reasoning` 完整事件且 `reasoningText` 有內容
- **THEN** 系統 MUST 將 `{ type: 'reasoning', content: reasoningText }` 加入 `turnSegments`

#### Scenario: 展開/折疊推理

- **WHEN** 使用者點擊推理區塊標題
- **THEN** 介面 MUST 切換推理內容的顯示/隱藏狀態

#### Scenario: 歷史訊息中的推理過程（新格式）

- **WHEN** 渲染一筆 `role: 'assistant'` 且 `metadata.turnSegments` 含有 `{ type: 'reasoning' }` segment 的歷史訊息
- **THEN** MessageBlock MUST 在 segment 位置渲染 ReasoningBlock，`isStreaming` 設為 `false`

#### Scenario: 歷史訊息中的推理過程（legacy 格式）

- **WHEN** 渲染一筆 `role: 'assistant'` 且 `metadata.turnSegments` 無 reasoning segment 但 `metadata.reasoning` 非空的歷史訊息
- **THEN** MessageBlock MUST 在 turnSegments 渲染列表最前面補上 ReasoningBlock，`isStreaming` 設為 `false`

#### Scenario: 歷史訊息無推理

- **WHEN** 渲染一筆 `role: 'assistant'` 且 `metadata` 為 `null` 或 `metadata.reasoning` 為空且 `turnSegments` 無 reasoning segment 的歷史訊息
- **THEN** MessageBlock MUST 不渲染 ReasoningBlock 元件

### Requirement: 訊息去重

系統 SHALL 防止相同 ID 的訊息被重複加入 store。系統 SHALL 在後端和前端同時實施基於唯一 ID（`messageId`、`toolCallId`、`reasoningId`）的綜合事件級去重，防止 Copilot SDK `infiniteSessions` 模式重播歷史事件導致重複內容。去重 Set 跨 turn 持久化，不在 idle 或新 send 時重置。

#### Scenario: 相同 messageId 的重複 copilot:message 事件

- **WHEN** Copilot SDK 在 multi-turn agent loop 中對同一 messageId 觸發多次 `copilot:message` 事件
- **THEN** store 的 `addMessage` MUST 檢查 `message.id` 是否已存在，若存在則忽略，不得產生重複訊息

#### Scenario: 後端事件級去重

- **WHEN** 後端累積層接收到任何帶有已見過 ID 的事件（messageId、toolCallId、reasoningId）
- **THEN** 系統 MUST 丟棄此事件，不累積內容，不轉發到前端

#### Scenario: 前端事件級去重

- **WHEN** 前端 hook 接收到任何帶有已見過 ID 的事件
- **THEN** hook MUST 跳過此事件，不推入任何 segment

#### Scenario: copilot:message 後清除 streaming text

- **WHEN** 接收到 `copilot:message` 事件
- **THEN** 系統 MUST 清除當前的 `streamingText` state
