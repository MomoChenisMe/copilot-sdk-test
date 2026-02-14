## MODIFIED Requirements

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

系統 SHALL 即時顯示 AI 正在生成的文字，並在串流中顯示閃爍游標。streaming block 的間距 MUST 與 MessageBlock 一致。

#### Scenario: 串流進行中

- **WHEN** 接收到 `copilot:delta` 事件
- **THEN** 介面 MUST 將增量文字附加到當前 assistant block，末尾顯示使用 `cursor-blink` step-end 動畫的閃爍游標 `|`

#### Scenario: 串流完成

- **WHEN** 接收到 `copilot:idle` 事件
- **THEN** 介面 MUST 移除閃爍游標，將原始文字替換為 Markdown 渲染後的 HTML（含語法高亮）

### Requirement: 模型選擇器

系統 SHALL 在 ChatView 的 Input 區域上方提供模型切換 pill 按鈕，觸發下拉選單。

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
- **THEN** 介面 MUST 更新當前對話的模型設定，已選擇的模型 MUST 使用 `text-accent bg-accent-soft` 標示

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

## ADDED Requirements

### Requirement: 訊息去重

系統 SHALL 防止相同 ID 的訊息被重複加入 store。

#### Scenario: 相同 messageId 的重複 copilot:message 事件

- **WHEN** Copilot SDK 在 multi-turn agent loop 中對同一 messageId 觸發多次 `copilot:message` 事件
- **THEN** store 的 `addMessage` MUST 檢查 `message.id` 是否已存在，若存在則忽略，不得產生重複訊息

#### Scenario: copilot:message 後清除 streaming text

- **WHEN** 接收到 `copilot:message` 事件
- **THEN** 系統 MUST 清除當前的 `streamingText` state，防止在 `copilot:idle` 時將 streaming text 再次轉為永久訊息

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

系統 SHALL 在 AI 回應中顯示工具呼叫記錄，使用圓角卡片樣式，預設折疊。

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

### Requirement: 推理過程顯示

系統 SHALL 顯示 AI 的推理過程，使用圓角卡片樣式，預設折疊。

#### Scenario: 推理串流

- **WHEN** 接收到 `copilot:reasoning_delta` 事件
- **THEN** 介面 MUST 在 assistant block 頂部顯示可折疊的「推理過程」卡片（`rounded-xl border border-border`），即時附加內容

#### Scenario: 展開/折疊推理

- **WHEN** 使用者點擊推理區塊標題
- **THEN** 介面 MUST 切換推理內容的顯示/隱藏狀態
