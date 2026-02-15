## Requirements

### Requirement: Block 式訊息列表

Chat 介面 SHALL 以氣泡式呈現對話：使用者訊息靠右顯示為氣泡（accent 色底），助手訊息靠左顯示帶有 avatar icon。對話欄位 MUST 使用 `max-w-3xl mx-auto` 置中，訊息之間使用 `space-y-6` 間距。

#### Scenario: 顯示對話歷史

- **WHEN** 使用者切換到一個有歷史訊息的對話
- **THEN** 介面 MUST 按時間順序顯示所有 message block，包含 user 和 assistant 訊息

#### Scenario: 使用者訊息樣式

- **WHEN** 顯示使用者訊息
- **THEN** 訊息 MUST 靠右對齊（`justify-end`），使用 `bg-user-msg-bg` 背景色搭配 `border border-user-msg-border`，圓角為 `rounded-2xl rounded-br-sm`，最大寬度為容器的 85%，文字為 `text-sm leading-relaxed`

#### Scenario: 助手訊息樣式

- **WHEN** 顯示助手訊息
- **THEN** 訊息 MUST 靠左對齊，使用 `flex items-start gap-3` 佈局：左側為 `w-7 h-7 rounded-lg bg-accent-soft` 的 avatar（Sparkles icon），右側為角色標籤（`text-xs font-medium text-text-muted`）和 Markdown 渲染內容

#### Scenario: 新訊息顯示

- **WHEN** 使用者發送新訊息
- **THEN** 介面 MUST 立即新增 user message block（靠右氣泡），並在下方新增 assistant block 等待回應

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

### Requirement: 輸入元件

系統 SHALL 在 ChatView 底部提供浮動卡片風格的輸入區域，包含自動增長的 textarea 和 icon-only 按鈕。

#### Scenario: 輸入區域樣式

- **WHEN** ChatView 渲染
- **THEN** 輸入區域 MUST 位於 ChatView 底部（`shrink-0`），使用 `max-w-3xl mx-auto` 置中，卡片使用 `bg-bg-elevated border border-border rounded-2xl shadow-[var(--shadow-input)]`

#### Scenario: 輸入區域 focus 狀態

- **WHEN** 使用者 focus 輸入框
- **THEN** 卡片 MUST 使用 `focus-within:border-border-focus focus-within:shadow-[var(--shadow-md)]` 過渡效果

#### Scenario: 發送訊息

- **WHEN** 使用者在輸入框中輸入文字並按發送按鈕（ArrowUp icon）或 Enter
- **THEN** 系統 MUST 透過 WebSocket 發送 `copilot:send` 訊息，並清空輸入框

#### Scenario: 串流中顯示中止按鈕

- **WHEN** AI 正在串流回應
- **THEN** 發送按鈕 MUST 替換為中止按鈕（Square icon），使用 `bg-bg-tertiary hover:bg-error hover:text-white` 樣式

#### Scenario: 中止操作

- **WHEN** 使用者按下中止按鈕
- **THEN** 系統 MUST 發送 `copilot:abort` 訊息

#### Scenario: 輸入框自動增長

- **WHEN** 使用者輸入多行文字
- **THEN** 輸入框 MUST 自動增高，最大高度為 200px

### Requirement: Markdown 渲染

AI 回應 MUST 使用 Markdown 渲染，包含語法高亮。程式碼區塊 MUST 使用 `rounded-xl overflow-hidden border border-border` 容器。

#### Scenario: 程式碼區塊高亮

- **WHEN** AI 回應包含 fenced code block（如 ```javascript）
- **THEN** 介面 MUST 渲染為帶語法高亮的程式碼區塊，header 顯示語言名稱（正確提取，不含 `hljs` 前綴）和 copy 按鈕（hover 時顯示），body 使用 `bg-code-bg` 背景

#### Scenario: 語言標籤提取

- **WHEN** rehype-highlight 為 code 元素加入 className（如 `"hljs language-python"`）
- **THEN** 系統 MUST 使用 `split(/\s+/).find(c => c.startsWith('language-'))` 正確提取語言名稱 `"python"`，不得顯示 `"hljs python"`

#### Scenario: Inline code 樣式

- **WHEN** AI 回應包含 inline code
- **THEN** inline code MUST 使用 `bg-bg-tertiary text-accent px-1.5 py-0.5 rounded-md text-[13px] font-mono` 樣式

#### Scenario: 一般 Markdown 元素

- **WHEN** AI 回應包含標題、列表、表格、連結等 Markdown 元素
- **THEN** 介面 MUST 正確渲染為對應的 HTML 元素

### Requirement: 自動捲動

Chat 介面 SHALL 在新內容產生時自動捲動到底部。

#### Scenario: 串流中自動捲動

- **WHEN** AI 正在串流回應且使用者未向上捲動
- **THEN** 介面 MUST 自動捲動到最新內容

#### Scenario: 使用者向上捲動時不干擾

- **WHEN** 使用者手動向上捲動查看歷史
- **THEN** 介面 MUST 停止自動捲動，不打斷使用者閱讀

### Requirement: 訊息區域間距

Chat 介面的訊息區域 SHALL 使用統一的間距系統。

#### Scenario: 訊息區域垂直間距

- **WHEN** 聊天訊息區域顯示
- **THEN** 外部容器 MUST 使用 `px-4 py-6 space-y-6` 提供充足的呼吸空間

#### Scenario: 訊息間間距

- **WHEN** 多條訊息依序顯示
- **THEN** 每條訊息 MUST 使用 `mb-6` 作為底部間距

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

### Requirement: 前端綜合事件去重

前端 `useCopilot` hook SHALL 使用三組持久化 `useRef<Set<string>>`（`seenMessageIdsRef`、`seenToolCallIdsRef`、`seenReasoningIdsRef`）追蹤所有已處理的事件 ID，作為 belt-and-suspenders 防護機制。去重 Set MUST 跨 turn 永不重置（事件 ID 為全域唯一 UUID），與後端行為一致。

#### Scenario: 接收到重複 messageId 的 copilot:message 事件

- **WHEN** 前端接收到 `copilot:message` 事件且 `messageId` 已存在於 seen set 中
- **THEN** hook MUST 跳過此事件，不推入任何 segment

#### Scenario: 接收到重複 toolCallId 的 copilot:tool_start 事件

- **WHEN** 前端接收到 `copilot:tool_start` 事件且 `toolCallId` 已存在於 `seenToolCallIdsRef` 中
- **THEN** hook MUST 跳過此事件

#### Scenario: 接收到 copilot:tool_end 但無對應 tool record

- **WHEN** 前端接收到 `copilot:tool_end` 事件但 store 的 `toolRecords` 中無對應 `toolCallId` 的記錄
- **THEN** hook MUST 跳過此事件

#### Scenario: 接收到重複 reasoningId 的 reasoning 事件

- **WHEN** 前端接收到 `copilot:reasoning_delta` 或 `copilot:reasoning` 事件且 `reasoningId` 已存在於 seen set 中
- **THEN** hook MUST 跳過此事件

#### Scenario: 去重 Set 跨 turn 持久化

- **WHEN** 接收到 `copilot:idle` 事件或使用者發送新訊息
- **THEN** hook MUST NOT 清空任何去重 Set，因為事件 ID 為全域唯一 UUID

### Requirement: ChatView 捲動容器

ChatView MUST 使用正確的 flex 容器結構，確保訊息區域可捲動。

#### Scenario: 正確的 flex 結構

- **WHEN** ChatView 渲染
- **THEN** ChatView 的父容器 MUST 為 `h-full flex flex-col`，ChatView 本身 MUST 為 `flex flex-col h-full`，訊息區域 MUST 為 `flex-1 overflow-y-auto`

#### Scenario: 長對話可捲動

- **WHEN** 對話訊息超過可視區域高度
- **THEN** 訊息區域 MUST 提供垂直捲動功能，不得溢出至 TopBar 或 TabBar 區域

### Requirement: 歡迎畫面

系統 SHALL 在無活躍對話時顯示歡迎畫面。

#### Scenario: 歡迎畫面顯示

- **WHEN** `activeConversationId` 為 `null`
- **THEN** 介面 MUST 顯示置中的歡迎畫面：`w-14 h-14 rounded-2xl bg-accent-soft` 的 Sparkles icon、標題（`text-2xl font-semibold tracking-tight`）、描述（`text-sm leading-relaxed`）、CTA 按鈕（`rounded-xl bg-accent shadow-sm` 搭配 Plus icon）

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

### Requirement: 前端 reasoning 加入 turnSegments

前端 `useCopilot` hook 的 `copilot:reasoning` 完成事件處理器 SHALL 始終將 reasoning 加入 `turnSegments`，確保 reasoning segment 出現在正確的交錯位置。

#### Scenario: reasoning 完成事件加入 turnSegments

- **WHEN** 接收到 `copilot:reasoning` 完成事件且 `reasoningText` 有內容
- **THEN** hook MUST 將 `{ type: 'reasoning', content: reasoningText }` 加入 `turnSegments`

### Requirement: ChatView 串流中 reasoning 渲染

ChatView 串流區塊 SHALL 在 turnSegments 渲染路徑中正確顯示 reasoning，即使 reasoning segment 尚未加入 turnSegments（中間態：reasoning deltas 累積中但 reasoning complete 尚未到達）。

#### Scenario: turnSegments 無 reasoning 但 reasoningText 不為空（中間態）

- **WHEN** 串流中 turnSegments 不包含 reasoning segment，但 store 的 `reasoningText` 不為空
- **THEN** ChatView MUST 在 turnSegments 渲染列表的最前面顯示 ReasoningBlock

### Requirement: MessageBlock legacy reasoning 降級渲染

MessageBlock SHALL 在渲染歷史訊息時，若 `metadata.turnSegments` 存在但不包含 reasoning segment，且 `metadata.reasoning` 有值，MUST 在 turnSegments 渲染列表的最前面補上 ReasoningBlock。

#### Scenario: turnSegments 無 reasoning 但 metadata.reasoning 有值（legacy 格式）

- **WHEN** 渲染歷史訊息且 `turnSegments` 存在且非空但不包含 reasoning segment，且 `metadata.reasoning` 有值
- **THEN** MessageBlock MUST 在 turnSegments 渲染列表的最前面渲染 ReasoningBlock

#### Scenario: 防止 reasoning 重複渲染

- **WHEN** 渲染歷史訊息且 `turnSegments` 包含 reasoning segment，且 `metadata.reasoning` 也有值
- **THEN** MessageBlock MUST 僅渲染 turnSegments 中的 reasoning segment，MUST NOT 額外渲染 `metadata.reasoning`

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
