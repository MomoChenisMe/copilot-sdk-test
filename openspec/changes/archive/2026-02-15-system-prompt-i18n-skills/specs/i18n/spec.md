## ADDED Requirements

### Requirement: Settings 面板翻譯鍵

系統 SHALL 為 SettingsPanel 的所有 UI 文字提供完整的 en 和 zh-TW 翻譯鍵，使用 `settings.*` 命名空間。

#### Scenario: Settings 翻譯鍵完整性

- **WHEN** SettingsPanel 被渲染
- **THEN** 翻譯檔案 MUST 包含以下命名空間的所有 key：
  - `settings.title` — 面板標題
  - `settings.close` — 關閉按鈕 aria-label
  - `settings.loading` — 載入中文字
  - `settings.tabs.*` — 所有 tab 名稱（systemPrompt、profile、agent、presets、memory、skills）
  - `settings.save` — 儲存按鈕
  - `settings.toast.*` — 所有 toast 訊息（saved、saveFailed、deleted、deleteFailed、reset、resetFailed）
  - `settings.systemPrompt.*` — 系統提示詞相關（resetToDefault、resetConfirm）
  - `settings.memory.*` — 記憶區塊標題（preferences、projects、solutions）
  - `settings.deleteDialog.*` — 刪除確認對話框（message、cancel、confirm）
  - `settings.skills.*` — Skills 相關所有文字

#### Scenario: 英文翻譯

- **WHEN** 語言設定為 en
- **THEN** `settings.title` MUST 為 "Settings"，`settings.save` MUST 為 "Save"，`settings.toast.saved` MUST 為 "Saved"

#### Scenario: 繁體中文翻譯

- **WHEN** 語言設定為 zh-TW
- **THEN** `settings.title` MUST 為 "設定"，`settings.save` MUST 為 "儲存"，`settings.toast.saved` MUST 為 "已儲存"

## MODIFIED Requirements

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

#### Scenario: Settings 面板文字

- **WHEN** SettingsPanel 的任何分頁顯示
- **THEN** 所有面板標題、tab 名稱、按鈕文字、toast 訊息、section 標題、對話框文字、placeholder MUST 使用 `t()` 函式取得翻譯，MUST NOT 包含硬編碼的中文或英文字串
