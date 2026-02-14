## MODIFIED Requirements

### Requirement: 串流文字顯示

系統 SHALL 即時顯示 AI 正在生成的文字，並在串流中顯示閃爍游標。streaming block 的間距 MUST 與 MessageBlock 一致。系統 MUST 累積同一 turn 中所有 `copilot:message` 事件的 content segments，在 `copilot:idle` 時合併為單一 assistant message。

#### Scenario: 串流進行中

- **WHEN** 接收到 `copilot:delta` 事件
- **THEN** 介面 MUST 將增量文字附加到當前 assistant block，末尾顯示使用 `cursor-blink` step-end 動畫的閃爍游標 `|`

#### Scenario: copilot:message 累積

- **WHEN** 接收到 `copilot:message` 事件且 `content` 非空
- **THEN** 系統 MUST 將 content 推入 `turnContentSegments` 陣列中累積，並清除當前 `streamingText`，但 MUST NOT 建立永久 message

#### Scenario: copilot:message 空內容

- **WHEN** 接收到 `copilot:message` 事件且 `content` 為空字串
- **THEN** 系統 MUST 忽略此事件的 content，僅清除 `streamingText`

#### Scenario: 串流完成 — turn 合併

- **WHEN** 接收到 `copilot:idle` 事件
- **THEN** 系統 MUST 執行以下步驟：
  1. 若 `turnContentSegments` 有內容，MUST 將所有非空 segments 以 `\n\n` 合併為最終 content
  2. 若 `turnContentSegments` 為空但 `streamingText` 有值，MUST 使用 `streamingText` 作為 content（fallback）
  3. 若有 tool records 或 reasoning text，MUST 將其附加為 message metadata：`{ toolRecords: ToolRecord[], reasoning: string }`
  4. 若有 content 或 metadata，MUST 建立一筆 assistant message
  5. MUST 清除所有 streaming state（streamingText、toolRecords、reasoningText、turnContentSegments、copilotError）

#### Scenario: idle 無內容無 metadata

- **WHEN** 接收到 `copilot:idle` 事件但 turn 中無任何 content 且無 tool records 或 reasoning
- **THEN** 系統 MUST NOT 建立空白 message

### Requirement: 訊息去重

系統 SHALL 防止相同 ID 的訊息被重複加入 store。

#### Scenario: 相同 messageId 的重複 copilot:message 事件

- **WHEN** Copilot SDK 在 multi-turn agent loop 中對同一 messageId 觸發多次 `copilot:message` 事件
- **THEN** store 的 `addMessage` MUST 檢查 `message.id` 是否已存在，若存在則忽略，不得產生重複訊息

#### Scenario: copilot:message 後清除 streaming text

- **WHEN** 接收到 `copilot:message` 事件
- **THEN** 系統 MUST 清除當前的 `streamingText` state

### Requirement: 工具呼叫記錄

系統 SHALL 在 AI 回應中顯示工具呼叫記錄，使用圓角卡片樣式，預設折疊。工具記錄 MUST 在 streaming 期間即時顯示，且 MUST 在 streaming 結束後持久化於 message metadata 中，在對話歷史中可查看。

#### Scenario: 工具記錄卡片樣式

- **WHEN** 工具記錄顯示
- **THEN** 卡片 MUST 使用 `rounded-xl border border-border overflow-hidden` 樣式

#### Scenario: 工具開始執行

- **WHEN** 接收到 `copilot:tool_start` 事件
- **THEN** 介面 MUST 在當前 assistant block 中新增工具記錄卡片，顯示工具名稱（`font-mono text-xs`）和 spinner

#### Scenario: 工具執行完成

- **WHEN** 接收到 `copilot:tool_end` 事件
- **THEN** 介面 MUST 將 spinner 替換為成功（Check icon）或失敗（X icon）Lucide 圖示

#### Scenario: 展開工具詳情

- **WHEN** 使用者點擊工具記錄卡片
- **THEN** 介面 MUST 展開顯示工具的 arguments 和 result

#### Scenario: 歷史訊息中的工具記錄

- **WHEN** 渲染一筆 `role: 'assistant'` 且 `metadata.toolRecords` 非空的歷史訊息
- **THEN** MessageBlock MUST 渲染每一筆 tool record 為 ToolRecord 元件，顯示於 reasoning 之後、text content 之前

#### Scenario: 歷史訊息無工具記錄

- **WHEN** 渲染一筆 `role: 'assistant'` 且 `metadata` 為 `null` 或 `metadata.toolRecords` 未定義的歷史訊息
- **THEN** MessageBlock MUST 不渲染任何 ToolRecord 元件

### Requirement: 推理過程顯示

系統 SHALL 顯示 AI 的推理過程，使用圓角卡片樣式。推理過程 MUST 在 streaming 期間即時顯示，且 MUST 在 streaming 結束後持久化於 message metadata 中，在對話歷史中可查看。

#### Scenario: 推理串流

- **WHEN** 接收到 `copilot:reasoning_delta` 事件
- **THEN** 介面 MUST 在 assistant block 頂部顯示可折疊的「推理過程」卡片（`rounded-xl border border-border`），即時附加內容

#### Scenario: 推理完整事件 fallback

- **WHEN** 接收到 `copilot:reasoning` 完整事件且當前 `reasoningText` 為空
- **THEN** 系統 MUST 使用完整事件的 `content` 設定 reasoning text

#### Scenario: 推理完整事件重複防護

- **WHEN** 接收到 `copilot:reasoning` 完整事件但 `reasoningText` 已有內容（由 delta 累積）
- **THEN** 系統 MUST 忽略此事件，不覆蓋已累積的內容

#### Scenario: 展開/折疊推理

- **WHEN** 使用者點擊推理區塊標題
- **THEN** 介面 MUST 切換推理內容的顯示/隱藏狀態

#### Scenario: 歷史訊息中的推理過程

- **WHEN** 渲染一筆 `role: 'assistant'` 且 `metadata.reasoning` 非空的歷史訊息
- **THEN** MessageBlock MUST 渲染 ReasoningBlock 元件於 tool records 和 text content 之前，`isStreaming` 設為 `false`（預設折疊）

#### Scenario: 歷史訊息無推理

- **WHEN** 渲染一筆 `role: 'assistant'` 且 `metadata` 為 `null` 或 `metadata.reasoning` 為空的歷史訊息
- **THEN** MessageBlock MUST 不渲染 ReasoningBlock 元件

## ADDED Requirements

### Requirement: Turn 累積狀態管理

系統 SHALL 在 Zustand store 中維護 `turnContentSegments` 陣列，用於累積同一 assistant turn 中的多個 content segments。

#### Scenario: 累積 content segment

- **WHEN** 接收到含非空 content 的 `copilot:message` 事件
- **THEN** store MUST 將 content 推入 `turnContentSegments` 陣列末端

#### Scenario: 清除 turn 狀態

- **WHEN** `clearStreaming()` 被呼叫
- **THEN** store MUST 將 `turnContentSegments` 重置為空陣列 `[]`

#### Scenario: 切換對話時重置

- **WHEN** `setActiveConversationId()` 被呼叫
- **THEN** store MUST 將 `turnContentSegments` 重置為空陣列 `[]`

### Requirement: MessageMetadata 型別定義

系統 SHALL 定義 `MessageMetadata` 和 `ToolRecord` 共用型別於 `frontend/src/lib/api.ts`。

#### Scenario: ToolRecord 型別定義

- **WHEN** 前端需要描述工具執行記錄的型別
- **THEN** `api.ts` MUST export `ToolRecord` interface，包含 `toolCallId: string`、`toolName: string`、`arguments?: unknown`、`status: 'running' | 'success' | 'error'`、`result?: unknown`、`error?: string`

#### Scenario: MessageMetadata 型別定義

- **WHEN** 前端需要描述 message metadata 的型別
- **THEN** `api.ts` MUST export `MessageMetadata` interface，包含 `toolRecords?: ToolRecord[]`、`reasoning?: string`

#### Scenario: Store 型別 re-export

- **WHEN** store 模組需要使用 `ToolRecord` 型別
- **THEN** store MUST 從 `api.ts` import 並 re-export `ToolRecord`，不得重複定義
