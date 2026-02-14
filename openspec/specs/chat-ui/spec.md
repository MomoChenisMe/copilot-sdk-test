## ADDED Requirements

### Requirement: Block 式訊息列表

Chat 介面 SHALL 以氣泡式呈現對話：使用者訊息靠右顯示為氣泡，助手訊息靠左顯示帶有角色 icon。對話欄位 MUST 使用 `max-w-3xl mx-auto` 置中，內部訊息根據角色對齊。

#### Scenario: 顯示對話歷史

- **WHEN** 使用者切換到一個有歷史訊息的對話
- **THEN** 介面 MUST 按時間順序顯示所有 message block，包含 user 和 assistant 訊息

#### Scenario: 使用者訊息樣式

- **WHEN** 顯示使用者訊息
- **THEN** 訊息 MUST 靠右對齊（`justify-end`），使用半透明 accent 背景色（`bg-accent/10`），圓角氣泡樣式，最大寬度為容器的 80%

#### Scenario: 助手訊息樣式

- **WHEN** 顯示助手訊息
- **THEN** 訊息 MUST 靠左對齊，頂部帶有 Sparkles icon 和角色標籤，內容區域向右縮排（`pl-8`）以對齊 icon 右側

#### Scenario: 新訊息顯示

- **WHEN** 使用者發送新訊息
- **THEN** 介面 MUST 立即新增 user message block（靠右氣泡），並在下方新增 assistant block 等待回應

### Requirement: 串流文字顯示

系統 SHALL 即時顯示 AI 正在生成的文字，並在串流中顯示閃爍游標。streaming block 的間距 MUST 與 MessageBlock 一致（`mb-4`）。

#### Scenario: 串流進行中

- **WHEN** 接收到 `copilot:delta` 事件
- **THEN** 介面 MUST 將增量文字附加到當前 assistant block，末尾顯示閃爍游標 `|`

#### Scenario: 串流完成

- **WHEN** 接收到 `copilot:idle` 事件
- **THEN** 介面 MUST 移除閃爍游標，將原始文字替換為 Markdown 渲染後的 HTML（含語法高亮）

### Requirement: 工具呼叫記錄

系統 SHALL 在 AI 回應中顯示工具呼叫記錄，預設折疊。

#### Scenario: 工具開始執行

- **WHEN** 接收到 `copilot:tool_start` 事件
- **THEN** 介面 MUST 在當前 assistant block 中新增工具記錄卡片，顯示工具名稱和 spinner

#### Scenario: 工具執行完成

- **WHEN** 接收到 `copilot:tool_end` 事件
- **THEN** 介面 MUST 將 spinner 替換為成功（✓）或失敗（✗）圖示

#### Scenario: 展開工具詳情

- **WHEN** 使用者點擊工具記錄卡片
- **THEN** 介面 MUST 展開顯示工具的 arguments 和 result

### Requirement: 推理過程顯示

系統 SHALL 顯示 AI 的推理過程，預設折疊。

#### Scenario: 推理串流

- **WHEN** 接收到 `copilot:reasoning_delta` 事件
- **THEN** 介面 MUST 在 assistant block 頂部顯示可折疊的「推理過程」區塊，即時附加內容

#### Scenario: 展開/折疊推理

- **WHEN** 使用者點擊「推理過程」標題
- **THEN** 介面 MUST 切換推理內容的顯示/隱藏狀態

### Requirement: 模型選擇器

系統 SHALL 提供模型切換下拉選單，支援完整顯示所有模型名稱，並標示模型來源。

#### Scenario: 顯示可用模型

- **WHEN** 使用者點擊模型選擇器
- **THEN** 介面 MUST 顯示 SDK 回傳的所有可用模型列表，dropdown 寬度 MUST 足以容納大部分模型名稱（min-w-48 max-w-72），超長名稱以 ellipsis 截斷並提供 title tooltip

#### Scenario: 模型列表捲動

- **WHEN** 可用模型數量超過可視區域
- **THEN** dropdown MUST 提供垂直捲動（max-h-60 overflow-y-auto），使用者可捲動查看所有模型

#### Scenario: 模型來源標示

- **WHEN** 模型下拉選單顯示
- **THEN** dropdown 頂部 MUST 顯示「GitHub Copilot Models」標題，標示模型來源為 @github/copilot-sdk

#### Scenario: 切換模型

- **WHEN** 使用者選擇不同模型
- **THEN** 介面 MUST 更新當前對話的模型設定，後續訊息使用新模型

### Requirement: 輸入元件

系統 SHALL 提供自動增長的文字輸入區域，支援發送和中止操作。

#### Scenario: 發送訊息

- **WHEN** 使用者在輸入框中輸入文字並按發送按鈕（或 Enter）
- **THEN** 系統 MUST 透過 WebSocket 發送 `copilot:send` 訊息，並清空輸入框

#### Scenario: 串流中顯示中止按鈕

- **WHEN** AI 正在串流回應
- **THEN** 發送按鈕 MUST 替換為中止按鈕

#### Scenario: 中止操作

- **WHEN** 使用者按下中止按鈕
- **THEN** 系統 MUST 發送 `copilot:abort` 訊息

#### Scenario: 輸入框自動增長

- **WHEN** 使用者輸入多行文字
- **THEN** 輸入框 MUST 自動增高以容納所有文字，最大高度為視窗的 1/3

### Requirement: Markdown 渲染

AI 回應 MUST 使用 Markdown 渲染，包含語法高亮。

#### Scenario: 程式碼區塊高亮

- **WHEN** AI 回應包含 fenced code block（如 ```javascript）
- **THEN** 介面 MUST 渲染為帶語法高亮的程式碼區塊

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
- **THEN** 外部容器 MUST 使用 `px-4 py-6` 提供充足的呼吸空間

#### Scenario: 訊息間間距

- **WHEN** 多條訊息依序顯示
- **THEN** 每條訊息（包含 streaming block）MUST 使用 `mb-4` 作為底部間距，保持一致
