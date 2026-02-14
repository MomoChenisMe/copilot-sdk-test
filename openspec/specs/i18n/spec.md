## Requirements

### Requirement: i18n 初始化

系統 SHALL 使用 i18next + react-i18next 提供多語系支援，預設語言為繁體中文（zh-TW），支援英文（en）作為備用語言。

#### Scenario: 首次載入（瀏覽器語言為中文）

- **WHEN** 使用者首次開啟應用，且瀏覽器語言設定為 zh-TW 或 zh
- **THEN** 介面 MUST 以繁體中文顯示所有 UI 文字

#### Scenario: 首次載入（瀏覽器語言為英文）

- **WHEN** 使用者首次開啟應用，且瀏覽器語言設定為 en
- **THEN** 介面 MUST 以英文顯示所有 UI 文字

#### Scenario: 首次載入（瀏覽器語言為其他語言）

- **WHEN** 使用者首次開啟應用，且瀏覽器語言非 zh-TW/zh/en
- **THEN** 介面 MUST 使用 en 作為 fallback 語言

#### Scenario: 語言偏好持久化

- **WHEN** 使用者手動切換語言後重新開啟應用
- **THEN** 系統 MUST 從 localStorage 讀取上次選擇的語言，優先於瀏覽器偵測結果

### Requirement: 翻譯檔案結構

系統 SHALL 維護 zh-TW 和 en 兩套翻譯檔案，使用巢狀 JSON 結構，以功能區域為命名空間。

#### Scenario: 翻譯 key 完整性

- **WHEN** 任一語言的翻譯檔案被載入
- **THEN** 該檔案 MUST 包含所有 UI 元件使用到的翻譯 key，不得有遺漏

#### Scenario: 翻譯 key 命名慣例

- **WHEN** 新增翻譯 key
- **THEN** key MUST 使用 `<area>.<item>` 的點分隔格式（如 `chat.welcomeTitle`, `sidebar.pinned`）

#### Scenario: 插值支援

- **WHEN** 翻譯文字包含動態變數（如時間、數量）
- **THEN** 翻譯 MUST 使用 i18next 的 `{{variable}}` 插值語法

### Requirement: 語言切換器 UI

系統 SHALL 在 TopBar 右側提供語言切換按鈕，使用 Globe icon，支援 zh-TW 和 en 之間切換。

#### Scenario: 顯示當前語言

- **WHEN** 應用程式載入完成
- **THEN** TopBar MUST 顯示 Globe icon 和當前語言代碼（如「中」或「EN」）

#### Scenario: 切換語言

- **WHEN** 使用者點擊語言切換按鈕
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

- **WHEN** TopBar、BottomBar、Sidebar 顯示
- **THEN** 對話標題預設值、tab 文字（Copilot/Terminal）、側邊欄標題、搜尋 placeholder、操作按鈕 MUST 使用翻譯 key

#### Scenario: 功能元件文字

- **WHEN** 模型選擇器、推理區塊、工具記錄、輸入框、登入頁面顯示
- **THEN** 所有靜態文字（Loading、Error、placeholder、按鈕文字等）MUST 使用翻譯 key

#### Scenario: 連線狀態文字

- **WHEN** 連線狀態指示燈顯示
- **THEN** 狀態文字（已連線、連線中、已斷線）MUST 使用翻譯 key

#### Scenario: 時間格式文字

- **WHEN** Sidebar 顯示對話的更新時間
- **THEN** 時間描述（剛剛、X 分鐘前、X 小時前、X 天前）MUST 使用翻譯 key 搭配插值
