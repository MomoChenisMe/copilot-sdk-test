## MODIFIED Requirements

### Requirement: 新增翻譯 key

系統 SHALL 為新增的 UI 元件提供完整的 zh-TW 和 en 翻譯。

#### Scenario: TopBar 新增 key

- WHEN TopBar 渲染
- THEN 翻譯檔案 MUST 包含 `topBar.home`（"Home"/"首頁"）和 `topBar.newChat`（"New chat"/"新對話"）
- AND 翻譯檔案 MUST 包含 `topBar.shortcuts`（"Keyboard shortcuts"/"鍵盤快捷鍵"）
- AND 翻譯檔案 MUST 包含 `topBar.settings`（"Settings"/"設定"）

#### Scenario: TabBar 新增 key

- WHEN TabBar 渲染
- THEN 翻譯檔案 MUST 包含 `tabBar.copilot`（"Copilot"/"Copilot"）和 `tabBar.terminal`（"Terminal"/"終端機"）

#### Scenario: Sidebar 設定區 key

- WHEN Sidebar 設定區渲染
- THEN 翻譯檔案 MUST 包含 `sidebar.language`（"Language"/"語言"）和 `sidebar.logout`（"Log out"/"登出"）

---

### Requirement: 所有 UI 元件字串外部化

系統中所有面向使用者的文字 SHALL 使用 `t()` 函式從翻譯檔案中取得，不得硬編碼。

#### Scenario: 聊天介面文字

- WHEN 聊天介面顯示
- THEN 歡迎標題、歡迎描述、開始對話按鈕、空狀態提示、助手標籤 MUST 使用翻譯 key

#### Scenario: 版面元件文字

- WHEN TopBar、TabBar、Sidebar 顯示
- THEN 對話標題預設值、tab 文字（Copilot/Terminal）、側邊欄標題、搜尋 placeholder、操作按鈕、首頁按鈕、新對話按鈕 MUST 使用翻譯 key

#### Scenario: 功能元件文字

- WHEN 模型選擇器、推理區塊、工具記錄、輸入框、登入頁面顯示
- THEN 所有靜態文字（Loading、Error、placeholder、按鈕文字等）MUST 使用翻譯 key

#### Scenario: 連線狀態文字

- WHEN 連線狀態指示燈顯示
- THEN 狀態文字（已連線、連線中、已斷線）MUST 使用翻譯 key

#### Scenario: 時間格式文字

- WHEN Sidebar 顯示對話的更新時間
- THEN 時間描述（剛剛、X 分鐘前、X 小時前、X 天前）MUST 使用翻譯 key 搭配插值

#### Scenario: Settings 面板文字

- WHEN SettingsPanel 的任何分頁顯示
- THEN 所有面板標題、tab 名稱、按鈕文字、toast 訊息、section 標題、對話框文字、placeholder MUST 使用 `t()` 函式取得翻譯，MUST NOT 包含硬編碼的中文或英文字串

#### Scenario: UserInputDialog placeholder

- WHEN UserInputDialog 渲染自由文字輸入欄位
- THEN placeholder 文字 MUST 使用 `t('userInput.typeResponse')` 取得翻譯
- AND MUST NOT 硬編碼 `"Type your response..."`

#### Scenario: PlanActToggle 按鈕文字

- WHEN PlanActToggle 元件渲染
- THEN "Plan" 按鈕文字 MUST 使用 `t('planMode.plan')` 取得翻譯
- AND "Act" 按鈕文字 MUST 使用 `t('planMode.act')` 取得翻譯
- AND MUST NOT 硬編碼 `"Plan"` 或 `"Act"`

#### Scenario: CwdSelector 模式標籤

- WHEN CwdSelector 元件渲染模式切換按鈕
- THEN "AI" 模式標籤 MUST 使用 `t('terminal.modeAI')` 取得翻譯
- AND "Bash" 模式標籤 MUST 使用 `t('terminal.modeBash')` 取得翻譯
- AND MUST NOT 硬編碼 `"AI"` 或 `"Bash"`

#### Scenario: ScrollToBottom aria-label

- WHEN ScrollToBottom 元件渲染
- THEN 按鈕的 `aria-label` MUST 使用 `t('scrollToBottom.label')` 取得翻譯
- AND MUST NOT 硬編碼 `"Scroll to bottom"`
