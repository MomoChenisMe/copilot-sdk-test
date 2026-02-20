## MODIFIED Requirements

### Requirement: 所有 UI 元件字串外部化

系統中所有面向使用者的文字 SHALL 使用 `t()` 函式從翻譯檔案中取得，不得硬編碼。所有 "AI Terminal" 品牌字串 MUST 替換為 "CodeForge"。

#### Scenario: 品牌名稱全面更新

- **WHEN** 翻譯檔案被載入
- **THEN** 以下 key 的值 MUST 使用 "CodeForge" 取代 "AI Terminal"：
  - `app.title` — "CodeForge"（en）/ "CodeForge"（zh-TW）
  - `login.title` — "CodeForge"（en）/ "CodeForge"（zh-TW）
  - `chat.welcomeTitle` — "Welcome to CodeForge"（en）/ "歡迎使用 CodeForge"（zh-TW）
  - `chat.welcomeDescription` — 包含 "CodeForge" 的歡迎描述
  - `input.placeholder` — "Message CodeForge..."（en）/ "傳送訊息給 CodeForge..."（zh-TW）

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

## ADDED Requirements

### Requirement: 新功能翻譯 Key

系統 SHALL 為新增的功能元件提供完整的 en 和 zh-TW 翻譯。

#### Scenario: Context command 翻譯 key

- **WHEN** context command 相關 UI 渲染
- **THEN** 翻譯檔案 MUST 包含 `contextCommand.*` 命名空間的所有 key，涵蓋 context command 功能的標題、描述、按鈕文字

#### Scenario: Model multiplier 翻譯 key

- **WHEN** model selector 顯示 premium multiplier badge
- **THEN** 翻譯檔案 MUST 包含 `model.multiplier`（"{{value}}x"）以及相關的 tooltip 說明文字

#### Scenario: Skill installer 翻譯 key

- **WHEN** skill 安裝介面渲染
- **THEN** 翻譯檔案 MUST 包含 `settings.skills.upload`（"Upload"/"上傳"）、`settings.skills.installUrl`（"Install from URL"/"從 URL 安裝"）、`settings.skills.createWithAi`（"Create with AI"/"用 AI 建立"）、`settings.skills.dragDrop`（"Drag and drop ZIP file here"/"拖放 ZIP 檔案至此"）

#### Scenario: SDK upgrade advisor 翻譯 key

- **WHEN** SDK upgrade 提示顯示
- **THEN** 翻譯檔案 MUST 包含 `sdk.upgradeAvailable`（"New SDK version available"/"有新的 SDK 版本可用"）和 `sdk.upgradeAction`（"Upgrade"/"升級"）

#### Scenario: Plan file output 翻譯 key

- **WHEN** plan mode 完成且檔案已輸出
- **THEN** 翻譯檔案 MUST 包含 `planMode.fileWritten`（"Plan saved to {{path}}"/"計畫已儲存至 {{path}}"）和 `planMode.executePlan`（"Execute Plan"/"執行計畫"）和 `planMode.continuePlanning`（"Continue Planning"/"繼續規劃"）

#### Scenario: Plan execution flow 翻譯 key

- **WHEN** plan execution 流程啟動
- **THEN** 翻譯檔案 MUST 包含 `planMode.executing`（"Executing plan..."/"正在執行計畫..."）和 `planMode.executionComplete`（"Plan execution complete"/"計畫執行完成"）

### Requirement: localStorage Key 遷移

系統 SHALL 將所有 `ai-terminal:*` 前綴的 localStorage key 自動遷移為 `codeforge:*` 前綴。

#### Scenario: 首次載入時自動遷移

- **WHEN** 應用程式首次以新版載入
- **THEN** 系統 MUST 掃描所有以 `ai-terminal:` 為前綴的 localStorage key
- **AND** 對每個 key，MUST 將其值複製到對應的 `codeforge:` 前綴 key
- **AND** 遷移完成後 MUST 設定 `codeforge:migrated` 為 `'true'` 以避免重複遷移

#### Scenario: 已遷移時跳過

- **WHEN** 應用程式載入且 `codeforge:migrated` 已為 `'true'`
- **THEN** 系統 MUST 跳過遷移流程，不覆蓋現有的 `codeforge:*` key

#### Scenario: 遷移涵蓋的 key

- **WHEN** 遷移流程執行
- **THEN** 系統 MUST 遷移以下 key（若存在）：
  - `ai-terminal:activePresets` → `codeforge:activePresets`
  - `ai-terminal:theme` → `codeforge:theme`
  - `ai-terminal:language` → `codeforge:language`
  - `ai-terminal:lastSelectedModel` → `codeforge:lastSelectedModel`
  - `ai-terminal:disabledSkills` → `codeforge:disabledSkills`
  - 以及其他所有 `ai-terminal:*` 前綴的 key

#### Scenario: 舊 key 保留不刪除

- **WHEN** 遷移完成
- **THEN** 系統 MUST NOT 刪除原始的 `ai-terminal:*` key，以確保降級相容性

#### Scenario: 新程式碼統一使用新前綴

- **WHEN** 任何元件讀寫 localStorage
- **THEN** 系統 MUST 使用 `codeforge:` 前綴，MUST NOT 使用 `ai-terminal:` 前綴
