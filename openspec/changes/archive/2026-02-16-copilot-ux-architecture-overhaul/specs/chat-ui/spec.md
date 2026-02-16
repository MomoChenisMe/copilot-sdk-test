## ADDED Requirements

### Requirement: 工作目錄選擇器（CwdSelector）

ChatView 的輸入區域 SHALL 在 ModelSelector 旁顯示 CwdSelector 元件，讓使用者查看和切換當前工作目錄。

#### Scenario: CwdSelector 顯示
- **WHEN** ChatView 渲染
- **THEN** 輸入區域上方 MUST 在 ModelSelector 旁顯示 CwdSelector pill，包含 FolderOpen icon 和截斷的路徑文字

#### Scenario: 路徑截斷
- **WHEN** 工作目錄路徑超過 25 個字元
- **THEN** CwdSelector MUST 顯示路徑末段（最後 25 個字元），前方加 "..."，完整路徑以 tooltip 顯示

#### Scenario: 點擊進入編輯模式
- **WHEN** 使用者點擊 CwdSelector
- **THEN** CwdSelector MUST 展開為 text input 編輯模式，文字全選方便替換

#### Scenario: Enter 確認路徑變更
- **WHEN** 使用者在編輯模式輸入新路徑並按 Enter
- **THEN** 系統 MUST 呼叫 PATCH API 更新 conversation 的 `cwd` 欄位，同時清除 `sdkSessionId`，CwdSelector 回到顯示模式

#### Scenario: Escape 取消編輯
- **WHEN** 使用者在編輯模式按 Escape
- **THEN** CwdSelector MUST 回到顯示模式，不儲存變更

#### Scenario: 點擊外部關閉編輯
- **WHEN** 使用者在編輯模式點擊 CwdSelector 外部
- **THEN** CwdSelector MUST 回到顯示模式，不儲存變更

#### Scenario: CwdSelector 樣式
- **WHEN** CwdSelector 渲染
- **THEN** 顯示模式 MUST 使用 pill 樣式（類似 ModelSelector），包含 `text-xs text-text-secondary` 文字和 `FolderOpen` icon

### Requirement: Slash Command 輸入區域整合

ChatView SHALL 將 slash command 相關 props 傳遞給 Input 元件。

#### Scenario: 傳遞 slash commands 到 Input
- **WHEN** ChatView 渲染 Input 元件
- **THEN** ChatView MUST 組裝包含內建命令和已啟用技能的 `slashCommands` 陣列，傳遞給 Input

#### Scenario: 內建命令 handler
- **WHEN** Input 回報選取了內建 slash command
- **THEN** ChatView MUST 根據命令類型執行對應操作（clear/settings/new）

### Requirement: 附件區域整合

ChatView SHALL 將附件相關資料和 handlers 傳遞給 Input 元件。

#### Scenario: 附件發送 flow
- **WHEN** Input 回報帶有附件的 onSend
- **THEN** ChatView MUST 先上傳檔案再透過 WS 發送帶有 file references 的訊息

## MODIFIED Requirements

### Requirement: 活躍 Preset 指示器

系統 SHALL 在輸入區域上方顯示目前啟用的 preset pills/badges 和 CwdSelector，讓使用者了解當前 AI 行為模式和工作目錄。

#### Scenario: 顯示活躍 preset 標籤
- **WHEN** 使用者有啟用一個或多個 presets，且 ChatView 渲染
- **THEN** 輸入區域上方 MUST 顯示一排 preset pill 標籤，每個 pill 使用 `px-2 py-0.5 rounded-full text-xs bg-accent-soft text-accent border border-accent/20` 樣式，顯示 preset 名稱

#### Scenario: 無活躍 preset
- **WHEN** 使用者未啟用任何 preset
- **THEN** 輸入區域上方 MUST NOT 顯示 preset 區域，不佔用空間

#### Scenario: 點擊 preset pill 移除
- **WHEN** 使用者點擊某個 preset pill 的 X 按鈕
- **THEN** 系統 MUST 將該 preset 從活躍列表中移除，pill MUST 立即消失

#### Scenario: preset 標籤過多時水平捲動
- **WHEN** 活躍 preset 數量超過輸入區域寬度
- **THEN** preset 容器 MUST 提供水平捲動（`overflow-x-auto whitespace-nowrap`），不換行

#### Scenario: 輸入區域工具列佈局
- **WHEN** ChatView 輸入區域渲染
- **THEN** 工具列 MUST 按此順序水平排列：ModelSelector、CwdSelector（新增），preset pills 在工具列下方
