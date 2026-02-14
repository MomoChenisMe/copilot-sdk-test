## ADDED Requirements

### Requirement: 居中對話欄

ChatView SHALL 使用居中的對話欄佈局，提供舒適的閱讀寬度和充足的留白。

#### Scenario: 桌面寬度

- **WHEN** 視窗寬度 >= 768px
- **THEN** 對話欄 MUST 居中顯示，最大寬度 768px，兩側有對稱留白

#### Scenario: 手機寬度

- **WHEN** 視窗寬度 < 768px
- **THEN** 對話欄 MUST 佔滿全寬，左右 padding 為 16px

### Requirement: User 訊息區塊

User 訊息 SHALL 以簡潔的右對齊風格呈現，與 assistant 訊息視覺區分。

#### Scenario: User 訊息外觀

- **WHEN** 渲染 user role 的訊息
- **THEN** 訊息 MUST 顯示為：右對齊的圓角區塊、accent 色（或淺灰色）背景、深色文字、適當的 padding（12-16px）

#### Scenario: User 訊息只顯示文字

- **WHEN** 渲染 user 訊息
- **THEN** MUST 僅顯示純文字內容，不需要 Markdown 渲染、不需要 avatar

### Requirement: Assistant 訊息區塊

Assistant 訊息 SHALL 以全寬左對齊風格呈現，支援豐富的內容類型。

#### Scenario: Assistant 訊息外觀

- **WHEN** 渲染 assistant role 的訊息
- **THEN** 訊息 MUST 顯示為：左對齊全寬、透明或極淺背景、頂部顯示小型 assistant 標籤（含模型圖示）、Markdown 渲染的內容

#### Scenario: Assistant 訊息 Markdown 渲染

- **WHEN** assistant 訊息包含 Markdown 內容
- **THEN** MUST 正確渲染標題、列表、表格、連結，程式碼區塊帶語法高亮和 copy 按鈕

### Requirement: Code Block 增強

程式碼區塊 SHALL 提供現代化的顯示體驗，含語法高亮、語言標籤和 copy 按鈕。

#### Scenario: Fenced code block 渲染

- **WHEN** assistant 訊息包含 fenced code block（如 ```javascript）
- **THEN** MUST 渲染為：深色背景的程式碼區塊、頂部顯示語言標籤（如 "javascript"）、右上角顯示 copy 按鈕、使用 rehype-highlight 語法高亮

#### Scenario: Copy 按鈕行為

- **WHEN** 使用者點擊 code block 的 copy 按鈕
- **THEN** MUST 將程式碼複製到剪貼簿，按鈕圖示暫時變為勾勾（✓）表示成功

#### Scenario: Inline code 渲染

- **WHEN** assistant 訊息包含 inline code（`code`）
- **THEN** MUST 渲染為帶淺色背景和 monospace 字體的行內元素

### Requirement: 工具呼叫 Inline Card

工具呼叫記錄 SHALL 以 inline card 形式嵌入 assistant 訊息流中，提供 Claude Code CLI 風格的步驟可視化。

#### Scenario: 工具正在執行

- **WHEN** 接收到 `copilot:tool_start` 事件
- **THEN** MUST 在 assistant 區塊中顯示 inline card：左側綠色 spinner 圖示、工具名稱以 monospace 粗體顯示、背景為 subtle 色（淺灰或半透明）、可展開查看 arguments

#### Scenario: 工具執行成功

- **WHEN** 接收到 `copilot:tool_end` 且 `success: true`
- **THEN** card MUST 更新為：左側綠色勾勾（✓）圖示、顯示工具名稱和簡短結果摘要、可展開查看完整 result

#### Scenario: 工具執行失敗

- **WHEN** 接收到 `copilot:tool_end` 且 `success: false`
- **THEN** card MUST 更新為：左側紅色叉叉（✗）圖示、顯示工具名稱和錯誤訊息、可展開查看完整 error

#### Scenario: 展開工具詳情

- **WHEN** 使用者點擊工具 card
- **THEN** card MUST 展開顯示：arguments（JSON 格式、語法高亮）、result 或 error（JSON 格式）

#### Scenario: 多個工具呼叫

- **WHEN** 一次 assistant 回應包含多個工具呼叫
- **THEN** 每個工具呼叫 MUST 以獨立 card 依序顯示，視覺上像 Claude Code CLI 的步驟列表

### Requirement: 推理過程區塊

推理過程 SHALL 以可折疊的區塊呈現，預設折疊，位於 assistant 訊息頂部。

#### Scenario: 推理過程顯示

- **WHEN** 接收到 `copilot:reasoning_delta` 事件
- **THEN** MUST 在 assistant 區塊頂部顯示可折疊區塊：標題「Thinking...」（串流中）或「Thought for Xs」（完成後）、淺色背景、monospace 字體內容

#### Scenario: 預設折疊

- **WHEN** 推理過程完成
- **THEN** 區塊 MUST 預設折疊，只顯示標題行，點擊可展開

### Requirement: 歡迎畫面

ChatView SHALL 在無 active conversation 時顯示現代化的歡迎畫面。

#### Scenario: 無 active conversation

- **WHEN** `activeConversationId` 為 null
- **THEN** MUST 顯示居中的歡迎畫面：大型應用圖示或 Logo、「Welcome to AI Terminal」標題（大字體）、簡短說明文字、prominent 的「New Conversation」按鈕、可選的快速操作提示

#### Scenario: 點擊開始新對話

- **WHEN** 使用者點擊歡迎畫面的「New Conversation」按鈕
- **THEN** MUST 使用第一個可用模型建立新對話並切換

#### Scenario: 有 conversation 但無訊息

- **WHEN** 有 active conversation 但 messages 為空
- **THEN** MUST 顯示居中的提示文字（如「Send a message to start...」），風格與歡迎畫面一致但更簡潔

### Requirement: 串流打字效果

Assistant 串流回應 SHALL 使用自然的打字效果，帶閃爍游標。

#### Scenario: 串流文字顯示

- **WHEN** 接收到 `copilot:delta` 事件
- **THEN** MUST 即時附加文字，末尾顯示閃爍的 block cursor（█），Markdown 即時渲染

#### Scenario: 串流完成

- **WHEN** 接收到 `copilot:idle` 事件
- **THEN** MUST 移除閃爍游標，完整渲染 Markdown 內容

### Requirement: 現代化 Sidebar

Sidebar SHALL 提供現代化的對話列表體驗，含搜尋和分組。

#### Scenario: Sidebar 佈局

- **WHEN** Sidebar 開啟
- **THEN** MUST 顯示：頂部搜尋框、「New Conversation」按鈕、Pinned 分組（如有）、Recent 對話列表

#### Scenario: 對話項目

- **WHEN** 渲染對話列表項目
- **THEN** 每個項目 MUST 顯示：對話標題、最後訊息時間、選中狀態以 accent 色背景高亮

#### Scenario: 對話操作選單

- **WHEN** 使用者在對話項目上觸發操作選單（long press 或右鍵）
- **THEN** MUST 顯示：重新命名、釘選/取消釘選、刪除

### Requirement: 現代化 TopBar

TopBar SHALL 提供精簡的導航列，整合關鍵操作。

#### Scenario: TopBar 佈局

- **WHEN** 應用載入
- **THEN** TopBar MUST 顯示：左側漢堡選單按鈕、中間對話標題（可截斷）、右側操作區域（主題切換 + 連線狀態燈）

#### Scenario: 模型顯示

- **WHEN** 有 active conversation
- **THEN** TopBar MUST 在標題下方或旁邊以小字體顯示當前模型名稱

### Requirement: 現代化 BottomBar 輸入區

BottomBar SHALL 提供寬敞的輸入體驗，類似 ChatGPT 的輸入設計。

#### Scenario: 輸入區佈局

- **WHEN** 當前為 Copilot tab
- **THEN** BottomBar MUST 顯示：頂部一行 pill-style tab 切換（Copilot/Terminal）+ ModelSelector、下方寬敞的輸入框（預設 3 行高度）+ 發送按鈕

#### Scenario: 輸入框風格

- **WHEN** 輸入框渲染
- **THEN** MUST 有圓角邊框、適當 padding（16px）、placeholder 文字（「Message AI Terminal...」）、自動增長（最大 1/3 視窗高度）

#### Scenario: Terminal tab

- **WHEN** 當前為 Terminal tab
- **THEN** BottomBar MUST 僅顯示 pill tab 切換行，不顯示輸入框
