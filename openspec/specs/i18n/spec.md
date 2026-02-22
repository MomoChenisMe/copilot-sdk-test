### Requirement: 快捷鍵面板翻譯 key

翻譯檔案 SHALL 包含 `shortcuts.*` 命名空間，為 ShortcutsPanel 中所有快捷鍵動作提供翻譯。

#### Scenario: shortcuts 命名空間完整性

- **WHEN** ShortcutsPanel 被渲染
- **THEN** 翻譯檔案 MUST 包含以下 key：
  - `shortcuts.title` — 面板標題（en: "Keyboard Shortcuts" / zh-TW: "鍵盤快捷鍵"）
  - `shortcuts.newTab` — 新增頁籤（en: "New Tab" / zh-TW: "新增頁籤"）
  - `shortcuts.closeTab` — 關閉頁籤（en: "Close Tab" / zh-TW: "關閉頁籤"）
  - `shortcuts.switchTab` — 切換頁籤（en: "Switch Tab (1-9)" / zh-TW: "切換頁籤 (1-9)"）
  - `shortcuts.prevTab` — 上一個頁籤（en: "Previous Tab" / zh-TW: "上一個頁籤"）
  - `shortcuts.nextTab` — 下一個頁籤（en: "Next Tab" / zh-TW: "下一個頁籤"）
  - `shortcuts.aiMode` — AI 模式（en: "AI Mode" / zh-TW: "AI 模式"）
  - `shortcuts.bashMode` — Bash 模式（en: "Bash Mode" / zh-TW: "Bash 模式"）
  - `shortcuts.settings` — 設定（en: "Settings" / zh-TW: "設定"）
  - `shortcuts.clearChat` — 清除對話（en: "Clear Chat" / zh-TW: "清除對話"）
  - `shortcuts.toggleTheme` — 切換主題（en: "Toggle Theme" / zh-TW: "切換主題"）
  - `shortcuts.upload` — 上傳檔案（en: "Upload File" / zh-TW: "上傳檔案"）
  - `shortcuts.modelSelector` — 模型選擇器（en: "Model Selector" / zh-TW: "模型選擇器"）
  - `shortcuts.showShortcuts` — 顯示快捷鍵（en: "Show Shortcuts" / zh-TW: "顯示快捷鍵"）

#### Scenario: 中文顯示快捷鍵面板

- **WHEN** 語言設定為 zh-TW
- **AND** 使用者開啟快捷鍵面板
- **THEN** 面板標題 MUST 顯示「鍵盤快捷鍵」
- **AND** 所有快捷鍵動作名稱 MUST 顯示對應的中文翻譯

### Requirement: 通用翻譯 key

翻譯檔案 SHALL 包含 `common.*` 命名空間，為跨元件共用的通用文字提供翻譯。

#### Scenario: common 命名空間完整性

- **WHEN** 任何使用 `common.*` 翻譯 key 的元件被渲染
- **THEN** 翻譯檔案 MUST 包含以下 key：
  - `common.close` — 關閉（en: "Close" / zh-TW: "關閉"）
  - `common.delete` — 刪除（en: "Delete" / zh-TW: "刪除"）
  - `common.cancel` — 取消（en: "Cancel" / zh-TW: "取消"）

#### Scenario: ShortcutsPanel 使用 common.close

- **WHEN** ShortcutsPanel 渲染關閉按鈕
- **THEN** 按鈕的 aria-label MUST 使用 `t('common.close')` 取得翻譯

#### Scenario: ArtifactsPanel 使用 common.close

- **WHEN** ArtifactsPanel 渲染關閉按鈕
- **THEN** 按鈕的 aria-label MUST 使用 `t('common.close')` 取得翻譯

### Requirement: 對話刪除確認翻譯 key

翻譯檔案 SHALL 在 `sidebar.*` 命名空間中包含對話刪除確認相關的 key。

#### Scenario: sidebar 刪除確認 key 完整性

- **WHEN** ConversationPopover 中的刪除確認 UI 被渲染
- **THEN** 翻譯檔案 MUST 包含以下 key：
  - `sidebar.deleteConfirm` — 刪除確認文字（en: "Delete?" / zh-TW: "刪除？"）
  - `sidebar.deleteConversation` — 刪除對話 aria-label（en: "Delete conversation" / zh-TW: "刪除對話"）

#### Scenario: 中文顯示刪除確認

- **WHEN** 語言設定為 zh-TW
- **AND** 使用者在 ConversationPopover 中觸發刪除確認
- **THEN** 確認文字 MUST 顯示「刪除？」
- **AND** 刪除按鈕 MUST 顯示「刪除」
- **AND** 取消按鈕 MUST 顯示「取消」

### Requirement: MCP 參數 placeholder 翻譯

MCP 伺服器設定中的參數輸入欄位 placeholder SHALL 使用 `t()` 函式從翻譯檔案取得。

#### Scenario: MCP 參數 placeholder 翻譯 key

- **WHEN** MCP 伺服器新增表單被渲染
- **THEN** 參數輸入欄位的 placeholder MUST 使用 `t('mcp.argsPlaceholder')` 取得翻譯
- **AND** 翻譯檔案 MUST 包含：
  - en: `"mcp.argsPlaceholder": "e.g. -y, @angular/cli, mcp"`
  - zh-TW: `"mcp.argsPlaceholder": "例如 -y, @angular/cli, mcp"`

#### Scenario: MCP placeholder 不再硬編碼

- **WHEN** McpTab 元件渲染
- **THEN** 參數輸入欄位 MUST NOT 包含硬編碼的 "comma-separated" 字串

### Requirement: GitHub 功能翻譯 key

翻譯檔案 SHALL 包含 `github.*` 命名空間，為 GitHub 倉庫選擇功能提供翻譯。

#### Scenario: github 命名空間完整性

- **WHEN** DirectoryPicker 的 GitHub 頁籤被渲染
- **THEN** 翻譯檔案 MUST 包含以下 key：
  - `github.tab` — en: "GitHub" / zh-TW: "GitHub"
  - `github.localTab` — en: "Local" / zh-TW: "本地"
  - `github.loading` — en: "Loading repositories..." / zh-TW: "載入倉庫中..."
  - `github.cloning` — en: "Cloning..." / zh-TW: "Clone 中..."
  - `github.cloned` — en: "Cloned successfully" / zh-TW: "Clone 成功"
  - `github.alreadyCloned` — en: "Already cloned" / zh-TW: "已 clone"
  - `github.noRepos` — en: "No repositories found" / zh-TW: "找不到倉庫"
  - `github.ghNotAvailable` — en: "Please install and authenticate gh CLI" / zh-TW: "請先安裝並認證 gh CLI"
  - `github.private` — en: "Private" / zh-TW: "私有"
  - `github.searchRepos` — en: "Search repositories..." / zh-TW: "搜尋倉庫..."
  - `github.cloneFailed` — en: "Clone failed" / zh-TW: "Clone 失敗"

### Requirement: Settings 面板翻譯鍵

系統 SHALL 為 SettingsPanel 的所有 UI 文字提供完整的 en 和 zh-TW 翻譯鍵，使用 `settings.*` 命名空間。

#### Scenario: Settings 翻譯鍵完整性

- **WHEN** SettingsPanel 被渲染
- **THEN** 翻譯檔案 MUST 包含以下命名空間的所有 key：
  - `settings.title` — 面板標題
  - `settings.close` — 關閉按鈕 aria-label
  - `settings.loading` — 載入中文字
  - `settings.tabs.*` — 所有 tab 名稱（general、systemPrompt、profile、openspec、memory、skills、webSearch、mcp）
  - `settings.groups.*` — 所有群組名稱（general、prompts、memory、tools）
  - `settings.save` — 儲存按鈕
  - `settings.toast.*` — 所有 toast 訊息（saved、saveFailed、deleted、deleteFailed、reset、resetFailed）
  - `settings.systemPrompt.*` — 系統提示詞相關（resetToDefault、resetConfirm）
  - `settings.memory.*` — 記憶區塊標題
  - `settings.deleteDialog.*` — 刪除確認對話框（message、cancel、confirm）
  - `settings.skills.*` — Skills 相關所有文字
- **AND** `settings.tabs.apiKeys` MUST 被 `settings.tabs.webSearch` 取代

### Requirement: 設定群組翻譯 key

翻譯檔案 SHALL 包含 `settings.groups.*` 命名空間，為設定面板的群組標題提供翻譯。

#### Scenario: settings.groups 命名空間完整性

- **WHEN** SettingsPanel 被渲染
- **THEN** 翻譯檔案 MUST 包含以下 key：
  - `settings.groups.general` — en: "General" / zh-TW: "一般"
  - `settings.groups.prompts` — en: "Prompts" / zh-TW: "提示詞"
  - `settings.groups.memory` — en: "Memory" / zh-TW: "記憶"
  - `settings.groups.tools` — en: "Tools" / zh-TW: "工具"

#### Scenario: 中文顯示群組標題

- **WHEN** 語言設定為 zh-TW
- **AND** 使用者開啟設定面板
- **THEN** sidebar 群組標題 MUST 分別顯示「一般」「提示詞」「記憶」「工具」

### Requirement: Cron 功能翻譯 key

翻譯檔案 SHALL 包含 `cron.*` 命名空間，為對話 cron 功能提供翻譯。

#### Scenario: cron 命名空間完整性

- **WHEN** CronConfigPanel 或 cron 相關 UI 被渲染
- **THEN** 翻譯檔案 MUST 包含以下 key：
  - `cron.configTitle` — en: "Scheduled Task" / zh-TW: "排程任務"
  - `cron.enable` — en: "Enable" / zh-TW: "啟用"
  - `cron.disable` — en: "Disable" / zh-TW: "停用"
  - `cron.scheduleType` — en: "Schedule Type" / zh-TW: "排程類型"
  - `cron.cronExpression` — en: "Cron Expression" / zh-TW: "Cron 表達式"
  - `cron.interval` — en: "Interval" / zh-TW: "間隔"
  - `cron.scheduleValue` — en: "Schedule Value" / zh-TW: "排程值"
  - `cron.prompt` — en: "Prompt" / zh-TW: "提示詞"
  - `cron.save` — en: "Save" / zh-TW: "儲存"
  - `cron.cancel` — en: "Cancel" / zh-TW: "取消"
  - `cron.saved` — en: "Cron saved" / zh-TW: "排程已儲存"
  - `cron.noActiveConversations` — en: "No conversations with active cron" / zh-TW: "沒有啟用排程的對話"
  - `slashCommand.cronDesc` — en: "Configure scheduled cron prompt" / zh-TW: "設定排程提示詞"

### Requirement: WebSearch 命名更新

翻譯檔案中的「API 金鑰」tab 名稱 SHALL 更新為「WebSearch」。

#### Scenario: WebSearch 翻譯 key

- **WHEN** SettingsPanel 工具群組被渲染
- **THEN** 翻譯檔案 MUST 包含：
  - `settings.tabs.webSearch` — en: "WebSearch" / zh-TW: "WebSearch"
- **AND** 原 `settings.tabs.apiKeys` 的顯示用途 MUST 被 `settings.tabs.webSearch` 取代
