## MODIFIED Requirements

### Requirement: 串流文字顯示

系統 SHALL 即時顯示 AI 正在生成的文字，並在串流中顯示閃爍游標。streaming block MUST 根據 `turnSegments` 按事件實際順序交錯渲染已完成的段落，尾端顯示當前 streaming text。系統 MUST 累積同一 turn 中所有 `copilot:message` 事件的 content segments，在 `copilot:idle` 時合併為單一 assistant message（含 metadata.turnSegments）。

#### Scenario: 串流進行中

- **WHEN** 接收到 `copilot:delta` 事件
- **THEN** 介面 MUST 將增量文字附加到當前 assistant block，末尾顯示使用 `cursor-blink` step-end 動畫的閃爍游標 `|`

#### Scenario: copilot:message 累積

- **WHEN** 接收到 `copilot:message` 事件且 `content` 非空
- **THEN** 系統 MUST 將 content 推入 `turnContentSegments` 陣列中累積，將 `{ type: 'text', content }` 推入 `turnSegments` 陣列，並清除當前 `streamingText`，但 MUST NOT 建立永久 message

#### Scenario: copilot:message 空內容

- **WHEN** 接收到 `copilot:message` 事件且 `content` 為空字串
- **THEN** 系統 MUST 忽略此事件的 content，僅清除 `streamingText`

#### Scenario: 串流完成 — turn 合併

- **WHEN** 接收到 `copilot:idle` 事件
- **THEN** 系統 MUST 執行以下步驟：
  1. 若 `turnContentSegments` 有內容，MUST 將所有非空 segments 以 `\n\n` 合併為最終 content
  2. 若 `turnContentSegments` 為空但 `streamingText` 有值，MUST 使用 `streamingText` 作為 content（fallback）
  3. 若有 turnSegments、tool records 或 reasoning text，MUST 將其附加為 message metadata：`{ turnSegments: TurnSegment[], toolRecords: ToolRecord[], reasoning: string }`
  4. 若有 content 或 metadata，MUST 建立一筆 assistant message
  5. MUST 清除所有 streaming state（streamingText、toolRecords、reasoningText、turnContentSegments、turnSegments、copilotError）

#### Scenario: idle 無內容無 metadata

- **WHEN** 接收到 `copilot:idle` 事件但 turn 中無任何 content 且無 tool records 或 reasoning
- **THEN** 系統 MUST NOT 建立空白 message

### Requirement: 模型選擇器

系統 SHALL 在 ChatView 的 Input 區域上方提供模型切換 pill 按鈕，觸發下拉選單。選擇模型後 MUST 更新對話的 model 欄位。

#### Scenario: 顯示可用模型

- **WHEN** 使用者點擊模型選擇器 pill
- **THEN** 介面 MUST 顯示 SDK 回傳的所有可用模型列表，dropdown 使用 `rounded-xl shadow-lg` 樣式，寬度 `min-w-48`，超長名稱以 ellipsis 截斷並提供 title tooltip

#### Scenario: 模型列表捲動

- **WHEN** 可用模型數量超過可視區域
- **THEN** dropdown MUST 提供垂直捲動（max-h-60 overflow-y-auto）

#### Scenario: 模型來源標示

- **WHEN** 模型下拉選單顯示
- **THEN** dropdown 頂部 MUST 顯示「GitHub Copilot Models」標題

#### Scenario: 切換模型

- **WHEN** 使用者選擇不同模型
- **THEN** 系統 MUST 呼叫 `updateConversation(conversationId, { model: modelId })`，更新 DB 中對話的 model 欄位，已選擇的模型 MUST 使用 `text-accent bg-accent-soft` 標示

#### Scenario: 模型切換後生效

- **WHEN** 使用者切換模型後發送新訊息
- **THEN** 系統 MUST 使用新模型建立 SDK session（透過 `getOrCreateSession` 的 model 參數）

### Requirement: 工具呼叫記錄

系統 SHALL 在 AI 回應中顯示工具呼叫記錄，使用圓角卡片樣式，預設折疊。工具記錄 MUST 在 streaming 期間即時顯示，且 MUST 在 streaming 結束後持久化於 message metadata 中，在對話歷史中可查看。ToolRecord 元件 MUST 對異常資料做防護處理。

#### Scenario: 工具記錄卡片樣式

- **WHEN** 工具記錄顯示
- **THEN** 卡片 MUST 使用 `rounded-xl border border-border overflow-hidden` 樣式

#### Scenario: 工具開始執行

- **WHEN** 接收到 `copilot:tool_start` 事件
- **THEN** 介面 MUST 在當前 assistant block 中新增工具記錄卡片，顯示工具名稱（`font-mono text-xs`）和 spinner，同時將 tool segment 推入 `turnSegments`

#### Scenario: 工具執行完成

- **WHEN** 接收到 `copilot:tool_end` 事件
- **THEN** 介面 MUST 將 spinner 替換為成功（Check icon）或失敗（X icon）Lucide 圖示，同時更新 `turnSegments` 中對應的 tool segment

#### Scenario: 展開工具詳情

- **WHEN** 使用者點擊工具記錄卡片
- **THEN** 介面 MUST 展開顯示工具的 arguments 和 result

#### Scenario: 歷史訊息中的工具記錄（有 turnSegments）

- **WHEN** 渲染一筆 assistant message 且 `metadata.turnSegments` 存在
- **THEN** MessageBlock MUST 按 turnSegments 順序渲染每個 tool segment 為 ToolRecord 元件

#### Scenario: 歷史訊息中的工具記錄（無 turnSegments，向後相容）

- **WHEN** 渲染一筆 assistant message 且 `metadata.turnSegments` 不存在但 `metadata.toolRecords` 非空
- **THEN** MessageBlock MUST fallback 到現有渲染：所有 ToolRecords 顯示於 reasoning 之後、text content 之前

#### Scenario: 歷史訊息無工具記錄

- **WHEN** 渲染一筆 assistant message 且 `metadata` 為 `null` 或工具相關欄位皆未定義
- **THEN** MessageBlock MUST 不渲染任何 ToolRecord 元件

#### Scenario: ToolRecord 異常資料防護

- **WHEN** ToolRecord 的 `arguments` 或 `result` 包含無法 JSON.stringify 的資料（如 circular reference）
- **THEN** ToolRecord MUST 使用 `safeStringify` 函式以 try-catch 包裝 `JSON.stringify`，失敗時 fallback 到 `String(value)`

#### Scenario: ToolRecord 空值防護

- **WHEN** ToolRecord 的 `toolName` 為 `undefined` 或 `null`
- **THEN** ToolRecord MUST 顯示 `'unknown'` 作為工具名稱

#### Scenario: ToolRecord 渲染錯誤防護

- **WHEN** ToolRecord 元件在渲染過程中拋出未捕捉的錯誤
- **THEN** 外層 Error Boundary MUST 捕捉錯誤並顯示 fallback UI：「Failed to render tool: {toolName}」，使用 `border-error/30 bg-error-soft text-error` 樣式，MUST NOT 導致整個頁面白屏

### Requirement: Turn 累積狀態管理

系統 SHALL 在 Zustand store 中維護 `turnContentSegments` 陣列和 `turnSegments` 陣列，用於累積同一 assistant turn 中的多個 content segments 和有序事件段落。

#### Scenario: 累積 content segment

- **WHEN** 接收到含非空 content 的 `copilot:message` 事件
- **THEN** store MUST 將 content 推入 `turnContentSegments` 陣列末端

#### Scenario: 清除 turn 狀態

- **WHEN** `clearStreaming()` 被呼叫
- **THEN** store MUST 將 `turnContentSegments` 和 `turnSegments` 重置為空陣列 `[]`

#### Scenario: 切換對話時重置

- **WHEN** `setActiveConversationId()` 被呼叫
- **THEN** store MUST 將 `turnContentSegments` 和 `turnSegments` 重置為空陣列 `[]`

### Requirement: MessageMetadata 型別定義

系統 SHALL 定義 `MessageMetadata`、`ToolRecord` 和 `TurnSegment` 共用型別於 `frontend/src/lib/api.ts`。

#### Scenario: ToolRecord 型別定義

- **WHEN** 前端需要描述工具執行記錄的型別
- **THEN** `api.ts` MUST export `ToolRecord` interface，包含 `toolCallId: string`、`toolName: string`、`arguments?: unknown`、`status: 'running' | 'success' | 'error'`、`result?: unknown`、`error?: string`

#### Scenario: MessageMetadata 型別定義

- **WHEN** 前端需要描述 message metadata 的型別
- **THEN** `api.ts` MUST export `MessageMetadata` interface，包含 `toolRecords?: ToolRecord[]`、`reasoning?: string`、`turnSegments?: TurnSegment[]`

#### Scenario: Store 型別 re-export

- **WHEN** store 模組需要使用 `ToolRecord` 或 `TurnSegment` 型別
- **THEN** store MUST 從 `api.ts` import 並 re-export，不得重複定義
