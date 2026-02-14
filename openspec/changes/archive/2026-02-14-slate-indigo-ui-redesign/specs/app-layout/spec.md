## MODIFIED Requirements

### Requirement: AppShell 佈局

應用程式 SHALL 使用 mobile-first 的 AppShell 佈局，包含 TopBar、TabBar、主要內容區。BottomBar 已移除，Input 移入 ChatView 內部。

#### Scenario: 手機垂直模式

- **WHEN** 在手機瀏覽器（寬度 < 768px）中開啟應用
- **THEN** 介面 MUST 顯示垂直佈局：TopBar（h-12）、TabBar（h-10）、內容區填滿剩餘空間（flex-1 overflow-hidden）

#### Scenario: 桌面模式

- **WHEN** 在桌面瀏覽器（寬度 >= 768px）中開啟應用
- **THEN** 介面 MUST 保持相同佈局結構，Sidebar 可固定顯示在左側

### Requirement: TopBar

TopBar SHALL 為精簡化設計，高度 h-12，包含 Sidebar 按鈕、新對話按鈕（左側）、對話標題（中央，可點擊回首頁）、主題切換和連線狀態（右側）。語言切換和模型名稱已移除。

#### Scenario: TopBar 內容顯示

- **WHEN** 應用程式載入完成
- **THEN** TopBar MUST 顯示：左側 Sidebar 按鈕（Menu icon）和新對話按鈕（Plus icon）、中央對話標題（`text-sm font-medium`）、右側主題切換按鈕和連線狀態指示燈

#### Scenario: 連線狀態指示

- **WHEN** WebSocket 連線狀態變更
- **THEN** 指示燈 MUST 即時更新：綠色=已連線、黃色=重連中、紅色=斷線

#### Scenario: TopBar 間距

- **WHEN** TopBar 渲染
- **THEN** TopBar MUST 使用 `h-12 px-4` 尺寸，背景為 `bg-bg-primary`，底部邊框為 `border-border-subtle`

#### Scenario: 回到首頁

- **WHEN** 使用者點擊 TopBar 中的對話標題
- **THEN** 系統 MUST 將 `activeConversationId` 設為 `null`，顯示歡迎畫面

#### Scenario: 新增對話快捷

- **WHEN** 使用者點擊 TopBar 中的 Plus 按鈕
- **THEN** 系統 MUST 建立新對話並切換到該對話

### Requirement: Sidebar（對話列表）

Sidebar SHALL 顯示所有對話列表，底部新增設定區（語言切換、登出）。手機上預設收合。所有操作圖標 MUST 使用 Lucide React icons。

#### Scenario: 開啟 Sidebar

- **WHEN** 使用者點擊漢堡選單按鈕
- **THEN** Sidebar MUST 從左側滑入顯示（`duration-300 ease-out`），覆蓋在主內容區上方，backdrop 使用 `bg-black/40 backdrop-blur-sm`

#### Scenario: 關閉 Sidebar

- **WHEN** 使用者點擊 Sidebar 外部區域或關閉按鈕
- **THEN** Sidebar MUST 滑出隱藏

#### Scenario: 對話列表排序

- **WHEN** Sidebar 顯示
- **THEN** 對話列表 MUST 按釘選優先、更新時間遞減排序

#### Scenario: 新增對話

- **WHEN** 使用者點擊 Sidebar 中的「新對話」按鈕
- **THEN** 系統 MUST 建立新對話並切換到該對話。按鈕 MUST 為全寬 accent 色按鈕搭配 Plus icon

#### Scenario: 對話操作

- **WHEN** 使用者 hover 對話項目
- **THEN** 介面 MUST 顯示操作按鈕：重新命名（Pencil icon）、釘選/取消釘選（Star icon，釘選時 fill）、刪除（Trash2 icon）

#### Scenario: 活躍對話標示

- **WHEN** 對話為當前活躍對話
- **THEN** 該項目 MUST 使用 `bg-accent-soft` 背景色和 `text-accent` 文字色標示

#### Scenario: 搜尋欄位

- **WHEN** Sidebar 搜尋欄位渲染
- **THEN** 搜尋輸入 MUST 內嵌 Search icon，使用 `bg-bg-tertiary rounded-lg` 樣式

#### Scenario: 設定區

- **WHEN** Sidebar 渲染
- **THEN** Sidebar 底部 MUST 顯示設定區（以 border-t 分隔），包含語言切換按鈕（Globe icon + 當前語言）和登出按鈕（LogOut icon）

## ADDED Requirements

### Requirement: TabBar

系統 SHALL 提供獨立的 TabBar 元件，放置於 TopBar 和內容區之間，用於 Copilot/Terminal tab 切換。

#### Scenario: TabBar 顯示

- **WHEN** 應用程式載入完成
- **THEN** TabBar MUST 顯示在 TopBar 下方，高度 h-10，包含「Copilot」和「Terminal」兩個 tab 按鈕，各搭配 Lucide icon（Sparkles 和 TerminalSquare）

#### Scenario: Active tab 樣式

- **WHEN** tab 為 active 狀態
- **THEN** tab 按鈕 MUST 使用 `text-accent bg-accent-soft rounded-lg` 樣式

#### Scenario: Inactive tab 樣式

- **WHEN** tab 為 inactive 狀態
- **THEN** tab 按鈕 MUST 使用 `text-text-muted hover:text-text-secondary hover:bg-bg-tertiary` 樣式

#### Scenario: Tab 切換

- **WHEN** 使用者點擊 tab 按鈕
- **THEN** 主內容區 MUST 切換到對應的視圖（ChatView 或 TerminalView）

## REMOVED Requirements

### Requirement: BottomBar

**Reason**: BottomBar 過度集中（tab 切換 + ModelSelector + Input），已拆分為 TabBar（獨立元件）和 Input（移入 ChatView）。
**Migration**: Tab 切換改用新的 TabBar 元件；Input 和 ModelSelector 整合至 ChatView 底部。

### Requirement: 深色主題

**Reason**: 已被 design-system spec 的「Slate Indigo 色彩系統」和「主題切換」需求取代。新系統支援 light/dark 雙主題，不再限定為深色。
**Migration**: 使用 `design-system` spec 中定義的 Slate Indigo 色彩系統。

### Requirement: 工作目錄切換

**Reason**: 從 TopBar 中移除以精簡化設計。工作目錄功能保留在後端，但 UI 暫不顯示。
**Migration**: 功能在後端仍存在，未來可在 Terminal tab 或設定頁面中恢復。
