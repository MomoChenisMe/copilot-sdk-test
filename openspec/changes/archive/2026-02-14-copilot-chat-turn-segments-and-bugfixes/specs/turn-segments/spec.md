## ADDED Requirements

### Requirement: TurnSegment 型別定義

系統 SHALL 定義 `TurnSegment` discriminated union 型別於 `frontend/src/lib/api.ts`，用於描述一個 assistant turn 中事件的有序段落。

#### Scenario: TurnSegment 型別結構

- **WHEN** 前端需要描述 turn 中的事件段落
- **THEN** `api.ts` MUST export `TurnSegment` 型別，為以下三種 variant 的聯合型別：
  - `{ type: 'text'; content: string }` — 文字段落
  - `{ type: 'tool'; toolCallId: string; toolName: string; arguments?: unknown; status: 'running' | 'success' | 'error'; result?: unknown; error?: string }` — 工具呼叫段落
  - `{ type: 'reasoning'; content: string }` — 推理段落

#### Scenario: MessageMetadata 擴充

- **WHEN** 前端需要在 message metadata 中儲存有序段落
- **THEN** `MessageMetadata` interface MUST 新增 `turnSegments?: TurnSegment[]` 欄位，同時保留現有的 `toolRecords?: ToolRecord[]` 和 `reasoning?: string` 欄位以向後相容

### Requirement: 前端 Turn Segments 累積

系統 SHALL 在 Zustand store 中維護 `turnSegments: TurnSegment[]` 陣列，在 streaming 期間按事件到達順序累積段落。

#### Scenario: 文字段落累積

- **WHEN** 接收到 `copilot:message` 事件且 content 非空
- **THEN** 系統 MUST 將 `{ type: 'text', content }` 推入 `turnSegments` 陣列末端

#### Scenario: 工具開始段落

- **WHEN** 接收到 `copilot:tool_start` 事件
- **THEN** 系統 MUST 將 `{ type: 'tool', toolCallId, toolName, arguments, status: 'running' }` 推入 `turnSegments` 陣列末端

#### Scenario: 工具完成更新

- **WHEN** 接收到 `copilot:tool_end` 事件
- **THEN** 系統 MUST 在 `turnSegments` 中找到對應 `toolCallId` 的 tool segment，更新其 `status`（success 或 error）、`result` 和 `error` 欄位

#### Scenario: Reasoning 段落

- **WHEN** 接收到 `copilot:reasoning` 事件或 `copilot:reasoning_delta` 累積完成
- **THEN** 系統 MUST 確保 `turnSegments` 中存在一個 `{ type: 'reasoning', content }` 段落，若已存在則更新其 content，若不存在則推入

#### Scenario: Idle 時合併 metadata

- **WHEN** 接收到 `copilot:idle` 事件
- **THEN** 系統 MUST 將 `turnSegments` 的完整陣列儲存到 assistant message 的 `metadata.turnSegments` 中，同時繼續填充 `metadata.toolRecords` 和 `metadata.reasoning` 以向後相容

#### Scenario: 清除 turn segments

- **WHEN** `clearStreaming()` 或 `setActiveConversationId()` 被呼叫
- **THEN** store MUST 將 `turnSegments` 重置為空陣列 `[]`

### Requirement: 後端 Turn Segments 累積與持久化

系統 SHALL 在後端 copilot handler 中累積事件為 `turnSegments`，在 `session.idle` 時儲存為一筆完整的 assistant message（含 metadata）。

#### Scenario: 後端文字段落累積

- **WHEN** 後端 accumulatingSend 接收到 `copilot:message` 事件且 content 非空
- **THEN** 系統 MUST 將 `{ type: 'text', content }` 推入後端的 `turnSegments` 陣列，同時推入 `turnContentSegments` 以計算合併 content

#### Scenario: 後端工具段落累積

- **WHEN** 後端 accumulatingSend 接收到 `copilot:tool_start` 事件
- **THEN** 系統 MUST 將 tool segment 推入後端的 `turnSegments` 陣列

#### Scenario: 後端工具完成更新

- **WHEN** 後端 accumulatingSend 接收到 `copilot:tool_end` 事件
- **THEN** 系統 MUST 更新後端 `turnSegments` 中對應 `toolCallId` 的 tool segment

#### Scenario: Idle 時持久化

- **WHEN** 後端 accumulatingSend 接收到 `copilot:idle` 事件且有累積內容
- **THEN** 系統 MUST 呼叫 `repo.addMessage(conversationId, { role: 'assistant', content, metadata: { turnSegments, toolRecords, reasoning } })`，將合併的 content 和完整 metadata 寫入 DB

#### Scenario: Idle 時無內容

- **WHEN** 後端 accumulatingSend 接收到 `copilot:idle` 事件但無任何累積內容（content 為空且無 metadata）
- **THEN** 系統 MUST NOT 寫入空白 message 到 DB

#### Scenario: 事件轉發

- **WHEN** 後端 accumulatingSend 接收到任何事件
- **THEN** 系統 MUST 在累積之後將事件轉發到前端（呼叫原始 `send(msg)`）

#### Scenario: Turn 開始重設

- **WHEN** 後端收到新的 `copilot:send` 訊息
- **THEN** 系統 MUST 重設所有累積狀態（turnSegments、turnContentSegments、turnToolRecords、turnReasoningText）

#### Scenario: Abort 時保存

- **WHEN** 使用者送出 `copilot:abort` 且有已累積的內容
- **THEN** 系統 MUST 在執行中止前保存已累積的 turnSegments 和 content 到 DB

### Requirement: 交錯順序渲染（歷史訊息）

MessageBlock SHALL 根據 `metadata.turnSegments` 按順序交錯渲染各段落，取代固定順序渲染。

#### Scenario: 有 turnSegments 的歷史訊息

- **WHEN** 渲染一筆 assistant message 且 `metadata.turnSegments` 存在且非空
- **THEN** MessageBlock MUST 按 turnSegments 陣列順序依序渲染每個 segment：
  - `reasoning` → `<ReasoningBlock>` 元件
  - `tool` → `<ToolRecord>` 元件，且若為 inline result tool 則額外渲染 `<ToolResultBlock>`
  - `text` → `<Markdown>` 元件

#### Scenario: 無 turnSegments 的歷史訊息（向後相容）

- **WHEN** 渲染一筆 assistant message 且 `metadata.turnSegments` 不存在或為空
- **THEN** MessageBlock MUST fallback 到現有渲染順序：ReasoningBlock → 所有 ToolRecords → Text content

#### Scenario: metadata 為 null 的訊息

- **WHEN** 渲染一筆 assistant message 且 `metadata` 為 `null`
- **THEN** MessageBlock MUST 只渲染 text content（若有）

### Requirement: 交錯順序渲染（Streaming block）

ChatView 的 streaming block SHALL 根據即時的 `turnSegments` 按順序渲染，尾端顯示 streaming text。

#### Scenario: Streaming 中的交錯渲染

- **WHEN** AI 正在串流回應且 `turnSegments` 有內容
- **THEN** ChatView MUST 按 `turnSegments` 順序渲染已完成的段落，並在最後顯示當前的 `streamingText`（含閃爍游標）

#### Scenario: Streaming 開始前

- **WHEN** AI 剛開始串流且 `turnSegments` 為空
- **THEN** ChatView MUST 顯示 ReasoningBlock（若有 reasoningText）和 StreamingText

### Requirement: Bash 工具結果 inline 顯示

系統 SHALL 為 bash/shell 類工具在 ToolRecord 下方以格式化的 code block 顯示輸出結果。

#### Scenario: Bash 工具成功結果

- **WHEN** 渲染一個 tool segment 且 `toolName` 屬於 `['bash', 'shell', 'execute', 'run']` 且 `status` 為 `success` 且 `result` 非空
- **THEN** 系統 MUST 在 ToolRecord 下方渲染 `<ToolResultBlock>` 元件，以 `<pre>` code block 樣式顯示 result 的 `content` 或 `detailedContent`

#### Scenario: Bash 工具失敗結果

- **WHEN** 渲染一個 tool segment 且 `toolName` 屬於 inline result tools 且 `status` 為 `error`
- **THEN** 系統 MUST 在 ToolRecord 下方顯示錯誤訊息的 code block（使用 error 樣式）

#### Scenario: 非 bash 工具

- **WHEN** 渲染一個 tool segment 且 `toolName` 不屬於 inline result tools
- **THEN** 系統 MUST 只渲染 ToolRecord 元件（結果保持在可摺疊區塊中），MUST NOT 渲染 ToolResultBlock

#### Scenario: 工具仍在執行中

- **WHEN** 渲染一個 tool segment 且 `status` 為 `running`
- **THEN** 系統 MUST 只渲染 ToolRecord（含 spinner），MUST NOT 渲染 ToolResultBlock

### Requirement: ToolResultBlock 元件

系統 SHALL 提供獨立的 `ToolResultBlock` 元件用於 inline 顯示工具輸出。

#### Scenario: Result 為物件（含 content / detailedContent）

- **WHEN** `result` 為物件且包含 `content` 或 `detailedContent` 屬性
- **THEN** ToolResultBlock MUST 優先顯示 `detailedContent`，fallback 到 `content`，以 monospace font 和 `bg-code-bg` 背景樣式渲染

#### Scenario: Result 為字串

- **WHEN** `result` 為字串
- **THEN** ToolResultBlock MUST 直接以 monospace 字體和 code block 樣式顯示字串內容

#### Scenario: Result 為其他型別

- **WHEN** `result` 為非字串非物件型別
- **THEN** ToolResultBlock MUST 使用 `JSON.stringify` 顯示，若 stringify 失敗則顯示 `String(result)`

#### Scenario: 長輸出截斷

- **WHEN** result 內容超過 500 行
- **THEN** ToolResultBlock MUST 只顯示前 200 行，並在底部顯示「展開全部」按鈕，max-h 限制為 `max-h-96 overflow-y-auto`
