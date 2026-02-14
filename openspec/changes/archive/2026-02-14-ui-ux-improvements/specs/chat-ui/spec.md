## ADDED Requirements

### Requirement: Error 訊息始終可見

Chat 介面 SHALL 確保 Copilot 錯誤訊息在所有情況下都可見。

#### Scenario: 錯誤發生在串流開始前

- **WHEN** `copilot:error` 事件在任何 `copilot:delta` 之前觸發（`streamingText` 為空、`toolRecords` 為空）
- **THEN** 錯誤訊息 MUST 仍然可見顯示，以紅色背景 card 呈現

#### Scenario: 錯誤發生在串流中

- **WHEN** `copilot:error` 事件在串流進行中觸發
- **THEN** 錯誤訊息 MUST 顯示在 streaming block 底部

### Requirement: 模型列表共享狀態

模型列表 SHALL 使用 Zustand 共享狀態管理，所有需要模型資訊的元件從 store 讀取。

#### Scenario: 模型載入成功

- **WHEN** 應用啟動後成功呼叫 `GET /api/copilot/models`
- **THEN** store MUST 儲存模型列表，ModelSelector 和其他元件 MUST 從 store 讀取

#### Scenario: 模型載入失敗

- **WHEN** `GET /api/copilot/models` 請求失敗
- **THEN** store MUST 記錄錯誤訊息，ModelSelector MUST 顯示「Failed to load models」錯誤提示，不使用 hardcoded fallback

#### Scenario: 模型載入中

- **WHEN** 模型列表正在載入
- **THEN** ModelSelector MUST 顯示 loading 狀態（如「Loading models...」）

## MODIFIED Requirements

### Requirement: 串流文字顯示

系統 SHALL 即時顯示 AI 正在生成的文字，並在串流中顯示閃爍游標。串流完成時 MUST 確保累積的文字轉為永久 message。

#### Scenario: 串流進行中

- **WHEN** 接收到 `copilot:delta` 事件
- **THEN** 介面 MUST 將增量文字附加到當前 assistant block，末尾顯示閃爍的 block cursor（█）

#### Scenario: 串流完成（有 copilot:message）

- **WHEN** 接收到 `copilot:message` 事件後再接收到 `copilot:idle` 事件
- **THEN** 介面 MUST 使用 `copilot:message` 的完整內容新增 assistant message，並清除 streaming 狀態

#### Scenario: 串流完成（無 copilot:message）

- **WHEN** 接收到 `copilot:idle` 事件但未收到 `copilot:message`，且 `streamingText` 不為空
- **THEN** 介面 MUST 將累積的 `streamingText` 轉為永久 assistant message，存入 `messages[]`，並清除 streaming 狀態

#### Scenario: 串流完成（無任何內容）

- **WHEN** 接收到 `copilot:idle` 事件但未收到 `copilot:message` 且 `streamingText` 為空
- **THEN** 介面 MUST 僅清除 streaming 狀態，不新增空白 message

### Requirement: 模型選擇器

系統 SHALL 提供模型切換下拉選單，僅顯示 Copilot SDK 授權的模型。下拉選單向上展開並支援 click-outside 關閉。

#### Scenario: 顯示可用模型

- **WHEN** 使用者點擊模型選擇器
- **THEN** 介面 MUST 從 Zustand store 讀取 SDK 授權的模型列表並顯示，不使用 hardcoded fallback

#### Scenario: 切換模型

- **WHEN** 使用者選擇不同模型
- **THEN** 介面 MUST 更新當前對話的模型設定

#### Scenario: 下拉方向

- **WHEN** 使用者點擊位於 BottomBar 的模型選擇器
- **THEN** 下拉選單 MUST 向上展開（`bottom-full`），避免被螢幕底部遮住

#### Scenario: 點擊外部關閉

- **WHEN** 下拉選單開啟時使用者點擊選單外部區域
- **THEN** 下拉選單 MUST 自動關閉

### Requirement: 輸入元件

系統 SHALL 提供寬敞的文字輸入區域，風格類似 ChatGPT 的輸入設計。

#### Scenario: 預設高度

- **WHEN** 輸入框未輸入任何文字
- **THEN** 輸入框 MUST 預設顯示 3 行高度，有圓角邊框和 16px padding

#### Scenario: 自動增長

- **WHEN** 使用者輸入多行文字
- **THEN** 輸入框 MUST 自動增高，最大高度為視窗的 1/3

#### Scenario: 發送訊息

- **WHEN** 使用者按 Enter（非 Shift+Enter）
- **THEN** 系統 MUST 發送訊息並清空輸入框

#### Scenario: 無 active conversation 時 disabled

- **WHEN** 無 active conversation
- **THEN** 輸入框 MUST 為 disabled 狀態，placeholder 文字提示建立新對話

### Requirement: 工具呼叫記錄

系統 SHALL 在 AI 回應中以 inline card 形式顯示工具呼叫記錄，風格借鑒 Claude Code CLI。

#### Scenario: 工具開始執行

- **WHEN** 接收到 `copilot:tool_start` 事件
- **THEN** MUST 在 assistant block 中顯示 inline card：spinner + 工具名稱（monospace）+ subtle 背景

#### Scenario: 工具執行完成

- **WHEN** 接收到 `copilot:tool_end` 事件
- **THEN** MUST 將 spinner 替換為成功（✓ 綠色）或失敗（✗ 紅色）圖示

#### Scenario: 展開工具詳情

- **WHEN** 使用者點擊工具 card
- **THEN** MUST 展開顯示 arguments 和 result（JSON 格式 + 語法高亮）

### Requirement: 推理過程顯示

系統 SHALL 顯示 AI 的推理過程，預設折疊，風格現代化。

#### Scenario: 推理串流

- **WHEN** 接收到 `copilot:reasoning_delta` 事件
- **THEN** MUST 在 assistant block 頂部顯示「Thinking...」可折疊區塊

#### Scenario: 推理完成後折疊

- **WHEN** 推理完成
- **THEN** 區塊 MUST 自動折疊，標題更新為「Thought for Xs」
