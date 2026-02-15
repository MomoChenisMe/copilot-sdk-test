## ADDED Requirements

### Requirement: ToolResultBlock 卡片式渲染

系統 SHALL 將工具執行結果以卡片式 UI 呈現，取代原有的裸 `<pre>` 區塊。卡片結構 MUST 參照 `tool-result-ui` capability 定義的 ToolResultBlock 元件，包含 header（status icon + 工具名稱 + 複製按鈕）和 body（格式化輸出內容）。卡片樣式 MUST 與現有 ToolRecord 元件保持視覺一致性。

#### Scenario: ToolResultBlock 卡片結構

- **WHEN** assistant 回應中包含工具執行結果（tool result content）
- **THEN** MessageBlock MUST 渲染 ToolResultBlock 元件，使用 `rounded-xl border border-border overflow-hidden` 外框，header 使用 `bg-code-header-bg` 背景並顯示 status icon（成功為 Check、失敗為 X）、工具名稱（`font-mono text-xs`）和 hover 時顯示的複製按鈕

#### Scenario: ToolResultBlock 成功狀態

- **WHEN** 工具執行結果的 status 為 `'success'`
- **THEN** header 的 status icon MUST 為綠色 Check icon（`text-success`），body MUST 以格式化方式顯示 result 內容

#### Scenario: ToolResultBlock 失敗狀態

- **WHEN** 工具執行結果的 status 為 `'error'`
- **THEN** header 的 status icon MUST 為紅色 X icon（`text-error`），body MUST 顯示 error 訊息，使用 `text-error` 文字色彩

#### Scenario: ToolResultBlock 複製功能

- **WHEN** 使用者點擊 ToolResultBlock header 中的複製按鈕
- **THEN** 系統 MUST 將工具執行結果的 body 內容複製到剪貼簿，按鈕 icon 暫時切換為 Check icon 表示成功

#### Scenario: ToolResultBlock body 長內容折疊

- **WHEN** 工具執行結果的 body 超過 20 行
- **THEN** ToolResultBlock MUST 預設折疊 body，僅顯示前 10 行，並提供「顯示全部」按鈕展開完整內容

### Requirement: 側邊欄串流指示器

系統 SHALL 在 Sidebar 的對話列表中，為正在進行背景串流的對話顯示視覺指示器。此指示器 MUST 即時反映 StreamManager 中各對話的串流狀態。

#### Scenario: 活躍串流對話顯示脈衝圓點

- **WHEN** Sidebar 對話列表渲染，且某個對話 ID 存在於 `activeStreams` 狀態中
- **THEN** 該對話項目 MUST 在右側顯示一個脈衝動畫的小圓點（`w-2 h-2 rounded-full bg-accent`），使用 `animate-pulse` 動畫效果

#### Scenario: 串流完成後圓點消失

- **WHEN** 接收到 `copilot:stream-status` 訊息且 `status` 為 `'idle'` 或 `'completed'`
- **THEN** 對應對話項目的脈衝圓點 MUST 立即移除

#### Scenario: 多對話同時串流

- **WHEN** 多個對話同時有活躍串流
- **THEN** 每個活躍串流的對話項目 MUST 各自獨立顯示脈衝圓點

#### Scenario: 頁面載入時同步串流狀態

- **WHEN** 前端 WebSocket 連線建立或重連
- **THEN** 前端 MUST 發送 `copilot:status` 訊息查詢當前所有活躍串流，並根據回傳的 `copilot:active-streams` 更新 Sidebar 中的脈衝圓點

### Requirement: 設定面板入口

系統 SHALL 在 TopBar 提供齒輪按鈕開啟設定面板 slide-over。設定面板用於管理系統提示詞和記憶檔案。

#### Scenario: TopBar 顯示設定按鈕

- **WHEN** TopBar 渲染
- **THEN** TopBar MUST 在右側操作區域顯示齒輪 icon 按鈕（Settings Lucide icon），使用 `p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary` 樣式

#### Scenario: 點擊設定按鈕開啟面板

- **WHEN** 使用者點擊 TopBar 的齒輪按鈕
- **THEN** 系統 MUST 從右側滑入 SettingsPanel slide-over，使用 `fixed inset-y-0 right-0 w-80 bg-bg-primary border-l border-border shadow-lg` 樣式，帶有 `transition-transform duration-300` 動畫

#### Scenario: 關閉設定面板

- **WHEN** 使用者點擊 SettingsPanel 的關閉按鈕或面板外的 overlay 區域
- **THEN** SettingsPanel MUST 以反向動畫滑出並隱藏

#### Scenario: 設定面板與聊天互斥操作

- **WHEN** SettingsPanel 已開啟
- **THEN** 聊天輸入框 MUST 維持可見但被 overlay 遮擋（`bg-black/20`），使用者 MUST 先關閉面板才能繼續輸入

### Requirement: 活躍 Preset 指示器

系統 SHALL 在輸入區域上方顯示目前啟用的 preset pills/badges，讓使用者了解當前 AI 行為模式。此功能為 Phase 2 增強，初期可使用簡化實作。

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
