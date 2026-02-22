## ADDED Requirements

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

## MODIFIED Requirements

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
