## MODIFIED Requirements

### Requirement: AppShell 佈局

應用程式 SHALL 使用現代化的 mobile-first AppShell 佈局，風格對標 ChatGPT/Claude/Gemini。

#### Scenario: 手機垂直模式

- **WHEN** 在手機瀏覽器（寬度 < 768px）中開啟應用
- **THEN** 介面 MUST 顯示：精簡 TopBar、全寬對話區、底部輸入區

#### Scenario: 桌面模式

- **WHEN** 在桌面瀏覽器（寬度 >= 768px）中開啟應用
- **THEN** 介面 MUST 保持相同結構，對話欄居中（max-width 768px），Sidebar 可固定顯示

### Requirement: TopBar

TopBar SHALL 為精簡的導航列，整合關鍵操作。

#### Scenario: TopBar 內容顯示

- **WHEN** 應用載入且有 active conversation
- **THEN** TopBar MUST 顯示：左側漢堡選單按鈕、中間對話標題、右側區域（主題切換按鈕 + 連線狀態燈）

#### Scenario: TopBar 模型資訊

- **WHEN** 有 active conversation
- **THEN** TopBar MUST 在標題下方以小字體顯示當前模型名稱

#### Scenario: 連線狀態指示

- **WHEN** WebSocket 連線狀態變更
- **THEN** 指示燈 MUST 即時更新：綠色=已連線、黃色=重連中、紅色=斷線

#### Scenario: 無 active conversation

- **WHEN** 無 active conversation
- **THEN** TopBar MUST 顯示應用名稱「AI Terminal」作為標題

### Requirement: Sidebar（對話列表）

Sidebar SHALL 提供現代化的對話列表，含搜尋和分組功能。

#### Scenario: Sidebar 佈局

- **WHEN** Sidebar 開啟
- **THEN** MUST 顯示：頂部「New Conversation」按鈕 + 搜尋框、Pinned 分組（如有釘選對話）、Recent 對話列表

#### Scenario: 對話項目外觀

- **WHEN** 渲染對話列表項目
- **THEN** 每個項目 MUST 顯示：對話標題、最後更新時間、選中狀態以 accent 色高亮

#### Scenario: 開啟 Sidebar

- **WHEN** 使用者點擊漢堡選單按鈕
- **THEN** Sidebar MUST 從左側滑入，覆蓋在主內容區上方（手機模式）

#### Scenario: 關閉 Sidebar

- **WHEN** 使用者點擊 Sidebar 外部區域
- **THEN** Sidebar MUST 滑出隱藏

#### Scenario: 對話操作

- **WHEN** 使用者觸發對話項目的操作選單
- **THEN** MUST 顯示：重新命名、釘選/取消釘選、刪除

### Requirement: BottomBar

BottomBar SHALL 包含壓縮的 pill-style Agent 切換和寬敞的輸入區域。

#### Scenario: Pill-style Tab 切換

- **WHEN** BottomBar 顯示
- **THEN** 頂部 MUST 顯示一行：左側 pill-style Copilot/Terminal 切換、右側 ModelSelector（僅 Copilot tab）

#### Scenario: Copilot tab

- **WHEN** 當前為 Copilot tab
- **THEN** MUST 顯示 ModelSelector 和寬敞輸入框 + 發送按鈕

#### Scenario: Terminal tab

- **WHEN** 當前為 Terminal tab
- **THEN** MUST 僅顯示 pill tab 切換行，隱藏輸入框

#### Scenario: Pill 視覺狀態

- **WHEN** 某個 tab 被選中
- **THEN** 選中的 pill MUST 以 accent 色填充 + 白色文字，未選中為透明 + muted 文字

### Requirement: 深色主題

應用程式 MUST 支援深色和淺色主題，預設為淺色。

#### Scenario: 主題配色

- **WHEN** 應用程式載入
- **THEN** 背景 MUST 根據當前主題設定渲染

### Requirement: 登入頁面

未認證的使用者 SHALL 看到登入頁面。

#### Scenario: 未認證存取

- **WHEN** 未認證的使用者開啟應用
- **THEN** MUST 顯示現代化的登入頁面（居中卡片、密碼輸入框、登入按鈕）

#### Scenario: 登入成功後跳轉

- **WHEN** 使用者成功登入
- **THEN** MUST 切換到主應用介面，顯示歡迎畫面
