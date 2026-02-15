## ADDED Requirements

### Requirement: ToolResultBlock 卡片容器

系統 SHALL 提供重新設計的 `ToolResultBlock` 元件，以卡片風格呈現工具執行結果。元件接收 `result`、`toolName`、`status` props，其中 `status` 型別為 `'running' | 'success' | 'error'`。

#### Scenario: 卡片容器基本樣式

- **WHEN** ToolResultBlock 元件渲染
- **THEN** 外層容器 MUST 使用 `rounded-xl border border-border overflow-hidden` 樣式，提供圓角和邊框的卡片外觀

#### Scenario: 錯誤狀態左側邊框強調

- **WHEN** `status` prop 為 `'error'`
- **THEN** 卡片容器 MUST 增加 `border-l-4 border-l-error` 左側紅色邊框強調，與其他三邊的 `border-border` 區分

#### Scenario: 正常狀態無額外邊框

- **WHEN** `status` prop 為 `'success'` 或 `'running'`
- **THEN** 卡片容器 MUST NOT 添加額外的左側邊框強調，保持四邊一致的 `border-border`

### Requirement: ToolResultBlock Header Bar

ToolResultBlock SHALL 在卡片頂部渲染一個 header bar，包含狀態圖示、工具名稱標籤和 copy 按鈕。

#### Scenario: Header bar 基本佈局

- **WHEN** ToolResultBlock 渲染
- **THEN** header bar MUST 使用 `flex items-center gap-2 px-3 py-2 bg-bg-secondary border-b border-border` 佈局，狀態圖示和工具名稱靠左，copy 按鈕靠右（`ml-auto`）

#### Scenario: 成功狀態圖示

- **WHEN** `status` 為 `'success'`
- **THEN** header MUST 顯示 Lucide `Check` icon，使用 `w-4 h-4 text-success` 樣式

#### Scenario: 錯誤狀態圖示

- **WHEN** `status` 為 `'error'`
- **THEN** header MUST 顯示 Lucide `X` icon，使用 `w-4 h-4 text-error` 樣式

#### Scenario: 執行中狀態圖示

- **WHEN** `status` 為 `'running'`
- **THEN** header MUST 顯示 Lucide `Loader` icon，使用 `w-4 h-4 text-text-muted animate-spin` 樣式

#### Scenario: 工具名稱標籤

- **WHEN** ToolResultBlock 渲染且 `toolName` prop 非空
- **THEN** header MUST 在狀態圖示右側顯示工具名稱，使用 `font-mono text-xs text-text-muted` 樣式

#### Scenario: 工具名稱為空值防護

- **WHEN** `toolName` prop 為 `undefined` 或 `null`
- **THEN** header MUST 顯示 `'unknown'` 作為工具名稱

#### Scenario: Copy 按鈕

- **WHEN** ToolResultBlock 渲染且 `status` 不為 `'running'`
- **THEN** header 右側 MUST 顯示 copy 按鈕（Lucide `Copy` icon），使用 `w-4 h-4 text-text-muted hover:text-text-primary cursor-pointer` 樣式

#### Scenario: 執行中隱藏 copy 按鈕

- **WHEN** `status` 為 `'running'`
- **THEN** header MUST NOT 顯示 copy 按鈕，因為尚無結果可複製

### Requirement: ToolResultBlock Body 內容區

ToolResultBlock SHALL 在 header 下方渲染 body 內容區，以 monospace `<pre>` 區塊顯示工具輸出，支援 max-height 捲動。

#### Scenario: Body 基本樣式

- **WHEN** ToolResultBlock 渲染且 `status` 不為 `'running'`
- **THEN** body 區域 MUST 使用 `<pre>` 元素，套用 `font-mono text-xs leading-relaxed p-3 bg-code-bg text-text-primary whitespace-pre-wrap break-words max-h-96 overflow-y-auto` 樣式

#### Scenario: 執行中不顯示 body

- **WHEN** `status` 為 `'running'`
- **THEN** ToolResultBlock MUST NOT 渲染 body 區域，僅顯示 header bar

#### Scenario: Result 為物件（含 content / detailedContent）

- **WHEN** `result` prop 為物件且包含 `content` 或 `detailedContent` 屬性
- **THEN** body MUST 優先顯示 `detailedContent`，fallback 到 `content`

#### Scenario: Result 為字串

- **WHEN** `result` prop 為字串
- **THEN** body MUST 直接顯示字串內容

#### Scenario: Result 為其他型別

- **WHEN** `result` prop 為非字串非物件型別
- **THEN** body MUST 使用 `JSON.stringify(result, null, 2)` 格式化顯示，若 stringify 拋出例外則 fallback 到 `String(result)`

#### Scenario: Result 為 null 或 undefined

- **WHEN** `result` prop 為 `null` 或 `undefined` 且 `status` 為 `'success'`
- **THEN** body MUST 顯示空字串，MUST NOT 顯示 `"null"` 或 `"undefined"` 文字

### Requirement: Copy to Clipboard 功能

ToolResultBlock SHALL 支援將工具輸出結果複製到系統剪貼簿。

#### Scenario: 點擊 copy 按鈕

- **WHEN** 使用者點擊 header 的 copy 按鈕
- **THEN** 系統 MUST 呼叫 `navigator.clipboard.writeText()` 將 body 中顯示的文字內容寫入剪貼簿

#### Scenario: 複製成功回饋

- **WHEN** `navigator.clipboard.writeText()` 成功
- **THEN** copy 按鈕的 icon MUST 暫時替換為 Lucide `Check` icon（`text-success`），2 秒後恢復為 `Copy` icon

#### Scenario: 複製失敗處理

- **WHEN** `navigator.clipboard.writeText()` 拋出例外（如瀏覽器權限不足）
- **THEN** 系統 MUST 以 `console.warn` 記錄錯誤，MUST NOT 顯示錯誤彈窗或中斷使用者操作

### Requirement: 長輸出展開/折疊

ToolResultBlock SHALL 保留現有的展開/折疊行為，針對超長輸出提供可控的顯示方式。

#### Scenario: 長輸出截斷顯示

- **WHEN** result 內容超過 500 行
- **THEN** ToolResultBlock MUST 預設只顯示前 200 行，body 底部 MUST 顯示「展開全部（共 N 行）」按鈕

#### Scenario: 展開全部內容

- **WHEN** 使用者點擊「展開全部」按鈕
- **THEN** body MUST 顯示完整的 result 內容，按鈕文字 MUST 變更為「收合」

#### Scenario: 收合內容

- **WHEN** 使用者點擊「收合」按鈕
- **THEN** body MUST 回到截斷狀態，只顯示前 200 行

#### Scenario: 短輸出不顯示按鈕

- **WHEN** result 內容不超過 500 行
- **THEN** ToolResultBlock MUST NOT 顯示展開/折疊按鈕，直接完整顯示所有內容

### Requirement: 與 Markdown.tsx 程式碼區塊隔離

ToolResultBlock 的樣式 SHALL 完全獨立於 `Markdown.tsx` 中 rehype-highlight 所渲染的 `hljs` 程式碼區塊，兩者 MUST NOT 互相影響。

#### Scenario: ToolResultBlock 不使用 hljs class

- **WHEN** ToolResultBlock 渲染 `<pre>` 元素
- **THEN** 該 `<pre>` MUST NOT 包含任何 `hljs` 相關的 CSS class，MUST NOT 觸發 rehype-highlight 的語法高亮

#### Scenario: Markdown 程式碼區塊不受影響

- **WHEN** Markdown.tsx 渲染含 fenced code block 的 AI 回應
- **THEN** 程式碼區塊 MUST 保持原有的 `hljs` 語法高亮行為，header 顯示語言標籤和 copy 按鈕，MUST NOT 受 ToolResultBlock 樣式影響

#### Scenario: CSS 選擇器隔離

- **WHEN** 全域 CSS 或 Tailwind 樣式套用
- **THEN** ToolResultBlock 的 `<pre>` MUST 使用專屬的 CSS class（如 `tool-result-pre`）或限定在 ToolResultBlock 元件作用域內，避免與 `.markdown-body pre` 的樣式衝突
