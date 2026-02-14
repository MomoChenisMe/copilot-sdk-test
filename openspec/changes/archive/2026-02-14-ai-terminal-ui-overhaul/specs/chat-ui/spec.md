## MODIFIED Requirements

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

### Requirement: 串流文字顯示

系統 SHALL 即時顯示 AI 正在生成的文字，並在串流中顯示閃爍游標。streaming block 的間距 MUST 與 MessageBlock 一致（`mb-4`）。

#### Scenario: 串流進行中

- **WHEN** 接收到 `copilot:delta` 事件
- **THEN** 介面 MUST 將增量文字附加到當前 assistant block，末尾顯示閃爍游標 `|`

#### Scenario: 串流完成

- **WHEN** 接收到 `copilot:idle` 事件
- **THEN** 介面 MUST 移除閃爍游標，將原始文字替換為 Markdown 渲染後的 HTML（含語法高亮）

### Requirement: 訊息區域間距

Chat 介面的訊息區域 SHALL 使用統一的間距系統。

#### Scenario: 訊息區域垂直間距

- **WHEN** 聊天訊息區域顯示
- **THEN** 外部容器 MUST 使用 `px-4 py-6` 提供充足的呼吸空間

#### Scenario: 訊息間間距

- **WHEN** 多條訊息依序顯示
- **THEN** 每條訊息（包含 streaming block）MUST 使用 `mb-4` 作為底部間距，保持一致
