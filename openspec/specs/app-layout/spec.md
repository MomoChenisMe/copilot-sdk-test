## ADDED Requirements

### Requirement: AppShell 佈局

應用程式 SHALL 使用 mobile-first 的 AppShell 佈局，包含 TopBar、主要內容區和 BottomBar。

#### Scenario: 手機垂直模式

- **WHEN** 在手機瀏覽器（寬度 < 768px）中開啟應用
- **THEN** 介面 MUST 顯示全螢幕佈局：頂部 TopBar、中間內容區填滿剩餘空間、底部 BottomBar

#### Scenario: 桌面模式

- **WHEN** 在桌面瀏覽器（寬度 >= 768px）中開啟應用
- **THEN** 介面 MUST 保持相同佈局結構，Sidebar 可固定顯示在左側

### Requirement: TopBar

TopBar SHALL 顯示漢堡選單按鈕、對話標題、主題切換、語言切換和連線狀態指示燈。TopBar MUST 使用 `px-4 py-3` 作為內距。

#### Scenario: TopBar 內容顯示

- **WHEN** 應用程式載入完成
- **THEN** TopBar MUST 顯示：左側漢堡選單按鈕、中間對話標題、右側依序為語言切換按鈕、主題切換按鈕、連線狀態指示燈

#### Scenario: 連線狀態指示

- **WHEN** WebSocket 連線狀態變更
- **THEN** 指示燈 MUST 即時更新：綠色=已連線、黃色=重連中、紅色=斷線

#### Scenario: TopBar 間距

- **WHEN** TopBar 渲染
- **THEN** TopBar MUST 使用 `px-4 py-3` 內距，元素之間使用 `gap-3` 間距

### Requirement: Sidebar（對話列表）

Sidebar SHALL 顯示所有對話列表，手機上預設收合。搜尋輸入欄位 MUST 使用 `px-4 py-3` 內距。

#### Scenario: 開啟 Sidebar

- **WHEN** 使用者點擊漢堡選單按鈕
- **THEN** Sidebar MUST 從左側滑入顯示，覆蓋在主內容區上方（手機模式）

#### Scenario: 關閉 Sidebar

- **WHEN** 使用者點擊 Sidebar 外部區域或再次點擊漢堡按鈕
- **THEN** Sidebar MUST 滑出隱藏

#### Scenario: 對話列表排序

- **WHEN** Sidebar 顯示
- **THEN** 對話列表 MUST 按釘選優先、更新時間遞減排序

#### Scenario: 新增對話

- **WHEN** 使用者點擊 Sidebar 中的「新對話」按鈕
- **THEN** 系統 MUST 建立新對話並切換到該對話

#### Scenario: 對話操作

- **WHEN** 使用者長按或右滑對話項目
- **THEN** 介面 MUST 顯示操作選單：重新命名、釘選/取消釘選、刪除

#### Scenario: Sidebar 搜尋間距

- **WHEN** Sidebar 搜尋欄位渲染
- **THEN** 搜尋輸入 MUST 使用 `px-4 py-3` 內距

### Requirement: BottomBar

BottomBar SHALL 包含 Agent 切換 tab 和輸入區域。Tab 列 MUST 使用 `px-4` 水平內距。

#### Scenario: Tab 切換

- **WHEN** 使用者點擊「Copilot」或「Terminal」tab
- **THEN** 主內容區 MUST 切換到對應的視圖，輸入框行為隨之改變

#### Scenario: Copilot tab 輸入

- **WHEN** 當前為 Copilot tab
- **THEN** 輸入區 MUST 顯示文字輸入框 + 發送按鈕 + 模型選擇器

#### Scenario: Terminal tab 輸入

- **WHEN** 當前為 Terminal tab
- **THEN** 輸入區 MUST 隱藏（鍵盤輸入直接進入 xterm.js）

#### Scenario: BottomBar tab 列間距

- **WHEN** BottomBar tab 列渲染
- **THEN** tab 列 MUST 使用 `px-4 py-2` 內距

#### Scenario: 輸入區間距

- **WHEN** 輸入區渲染
- **THEN** 輸入區 MUST 使用 `px-4 pb-4 pt-2` 內距，提供充足的底部安全區域

### Requirement: 深色主題

應用程式 MUST 使用深色主題，風格參考 Warp 終端。

#### Scenario: 主題配色

- **WHEN** 應用程式載入
- **THEN** 背景 MUST 為深色（約 #1a1a2e 或類似），文字為淺色，整體配色統一

### Requirement: 工作目錄切換

TopBar SHALL 顯示當前工作目錄並支援切換。

#### Scenario: 顯示工作目錄

- **WHEN** 應用程式載入
- **THEN** TopBar MUST 顯示當前工作目錄路徑

#### Scenario: 切換工作目錄

- **WHEN** 使用者點擊工作目錄並輸入新路徑
- **THEN** 系統 MUST 發送 `cwd:change` WebSocket 訊息，更新 Copilot 和 Terminal 的工作目錄

### Requirement: 登入頁面

未認證的使用者 SHALL 看到登入頁面。

#### Scenario: 未認證存取

- **WHEN** 未認證的使用者開啟應用
- **THEN** 介面 MUST 顯示密碼輸入框和登入按鈕

#### Scenario: 登入成功後跳轉

- **WHEN** 使用者成功登入
- **THEN** 介面 MUST 切換到主應用介面
