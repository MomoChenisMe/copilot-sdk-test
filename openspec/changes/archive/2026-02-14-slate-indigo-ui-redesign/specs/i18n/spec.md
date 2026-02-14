## MODIFIED Requirements

### Requirement: 語言切換器 UI

系統 SHALL 在 Sidebar 底部設定區提供語言切換按鈕（從 TopBar 移至 Sidebar），使用 Globe icon，支援 zh-TW 和 en 之間切換。

#### Scenario: 顯示當前語言

- **WHEN** Sidebar 開啟
- **THEN** Sidebar 底部設定區 MUST 顯示 Globe icon 和當前語言文字（如「Language: 中文」或「Language: English」）

#### Scenario: 切換語言

- **WHEN** 使用者在 Sidebar 設定區點擊語言切換按鈕
- **THEN** 介面 MUST 立即切換到另一種語言（zh-TW ↔ en），所有 UI 文字即時更新，無需重新載入頁面

#### Scenario: 語言切換持久化

- **WHEN** 使用者切換語言
- **THEN** 系統 MUST 將選擇儲存到 localStorage，下次開啟時自動使用該語言

### Requirement: 所有 UI 元件字串外部化

系統中所有面向使用者的文字 SHALL 使用 `t()` 函式從翻譯檔案中取得，不得硬編碼。

#### Scenario: 聊天介面文字

- **WHEN** 聊天介面顯示
- **THEN** 歡迎標題、歡迎描述、開始對話按鈕、空狀態提示、助手標籤 MUST 使用翻譯 key

#### Scenario: 版面元件文字

- **WHEN** TopBar、TabBar、Sidebar 顯示
- **THEN** 對話標題預設值、tab 文字（Copilot/Terminal）、側邊欄標題、搜尋 placeholder、操作按鈕、首頁按鈕、新對話按鈕 MUST 使用翻譯 key

#### Scenario: 功能元件文字

- **WHEN** 模型選擇器、推理區塊、工具記錄、輸入框、登入頁面顯示
- **THEN** 所有靜態文字（Loading、Error、placeholder、按鈕文字等）MUST 使用翻譯 key

#### Scenario: 連線狀態文字

- **WHEN** 連線狀態指示燈顯示
- **THEN** 狀態文字（已連線、連線中、已斷線）MUST 使用翻譯 key

#### Scenario: 時間格式文字

- **WHEN** Sidebar 顯示對話的更新時間
- **THEN** 時間描述（剛剛、X 分鐘前、X 小時前、X 天前）MUST 使用翻譯 key 搭配插值

## ADDED Requirements

### Requirement: 新增翻譯 key

系統 SHALL 為新增的 UI 元件提供完整的 zh-TW 和 en 翻譯。

#### Scenario: TopBar 新增 key

- **WHEN** TopBar 渲染
- **THEN** 翻譯檔案 MUST 包含 `topBar.home`（"Home"/"首頁"）和 `topBar.newChat`（"New chat"/"新對話"）

#### Scenario: TabBar 新增 key

- **WHEN** TabBar 渲染
- **THEN** 翻譯檔案 MUST 包含 `tabBar.copilot`（"Copilot"/"Copilot"）和 `tabBar.terminal`（"Terminal"/"終端機"）

#### Scenario: Sidebar 設定區 key

- **WHEN** Sidebar 設定區渲染
- **THEN** 翻譯檔案 MUST 包含 `sidebar.language`（"Language"/"語言"）和 `sidebar.logout`（"Log out"/"登出"）
