## MODIFIED Requirements

### Requirement: TopBar 頂部導航列

TopBar SHALL 顯示為固定高度 h-12 的水平導航列。左側不再顯示漢堡選單按鈕。中央顯示當前對話標題（可點擊回首頁）。右側依序顯示：設定齒輪按鈕、主題切換按鈕（太陽/月亮）、連線狀態 badge。

#### Scenario: TopBar 渲染（無漢堡按鈕）

- WHEN 應用程式載入
- THEN TopBar 左側 SHALL NOT 顯示漢堡選單按鈕
- AND 中央顯示對話標題
- AND 右側顯示設定、主題切換、連線狀態

#### Scenario: 首頁導航

- WHEN 使用者點擊 TopBar 中央的對話標題
- THEN 系統 SHALL 導航至首頁（清除 activeConversationId 與 activeTabId）

---

### Requirement: TabBar 歷史下拉按鈕

TabBar SHALL 在「+」（新增 tab）按鈕旁邊包含歷史下拉按鈕（ChevronDown 圖示），用於快速瀏覽和開啟歷史對話。

#### Scenario: 歷史按鈕渲染位置

- WHEN TabBar 渲染
- THEN 「+」按鈕右側 MUST 顯示一個 ChevronDown 圖示按鈕
- AND 按鈕的 `title` 屬性 MUST 使用 `t('tabBar.history')` 取得翻譯

#### Scenario: 點擊展開 ConversationPopover

- WHEN 使用者點擊歷史下拉按鈕
- THEN 系統 MUST 展開 `ConversationPopover` 元件（重用現有元件）
- AND Popover MUST 以歷史下拉按鈕作為 anchor 顯示

#### Scenario: 選擇對話

- WHEN 使用者在 Popover 中選擇一個對話
- THEN 系統 MUST 開啟該對話（建立新 tab 或切換至既有 tab）
- AND Popover MUST 關閉

#### Scenario: 點擊外部關閉 Popover

- WHEN Popover 已展開且使用者點擊外部區域
- THEN Popover MUST 關閉

---

### Requirement: 模型選擇器持久化

模型選擇器 SHALL 透過 localStorage 持久化使用者的最後選擇，確保跨 server 重啟和頁面重載時保持選擇。

#### Scenario: Zustand store 初始化從 localStorage 讀取

- WHEN Zustand store 初始化
- THEN `lastSelectedModel` MUST 嘗試從 `localStorage.getItem('ai-terminal:lastSelectedModel')` 讀取
- AND 若讀取成功，`lastSelectedModel` MUST 設為該值
- AND 若讀取失敗（localStorage 不可用或無此 key），`lastSelectedModel` MUST 為 `null`

#### Scenario: localStorage 讀取錯誤處理

- WHEN `localStorage.getItem()` 拋出例外（如 private browsing 模式）
- THEN store 初始化 MUST 捕捉錯誤
- AND `lastSelectedModel` MUST 回退為 `null`
- AND MUST NOT 影響應用程式啟動

#### Scenario: useModels 驗證已儲存的 model

- WHEN model list 從 API 載入完成
- THEN `useModels` hook MUST 檢查 `lastSelectedModel` 是否存在於載入的 model list 中
- AND 若存在，MUST 保持 `lastSelectedModel` 不變
- AND 若不存在（model 已被移除或更名），MUST 將 `lastSelectedModel` 重設為 model list 的第一個 model ID

#### Scenario: Model list 為空

- WHEN model list 從 API 載入完成但為空陣列
- THEN `useModels` MUST 將 `lastSelectedModel` 設為空字串 `''`

#### Scenario: Server 重啟後保持選擇

- WHEN 使用者選擇 model "gpt-4o" → server 重啟 → 頁面重載
- THEN store 初始化 MUST 從 localStorage 讀回 "gpt-4o"
- AND model list 載入後驗證 "gpt-4o" 仍存在
- AND 模型選擇器 MUST 顯示 "gpt-4o" 為當前選擇

---

### Requirement: Split layout 支援

AppShell 主內容區域 SHALL 支援 side-by-side flex layout，使 ChatView 與 ArtifactsPanel 可並排顯示。

#### Scenario: Flex layout 容器

- WHEN AppShell 渲染主內容區域
- THEN 容器 SHALL 使用 `display: flex` 與 `flex-direction: row` 佈局
- AND 容器 SHALL 佔滿 TopBar 與 TabBar 之間的剩餘空間

#### Scenario: 僅 ChatView 時的佈局

- WHEN ArtifactsPanel 未開啟
- THEN ChatView SHALL 使用 `flex: 1` 佔滿整個主內容區域
- AND 佈局 SHALL 與先前無 artifacts 功能時表現一致

---

### Requirement: Artifacts panel 渲染

當 `artifactsPanelOpen` 為 true 時，ArtifactsPanel SHALL 渲染在 ChatView 旁邊。

#### Scenario: Panel 開啟時渲染

- WHEN store 中 `artifactsPanelOpen` 狀態為 true
- THEN AppShell SHALL 在 ChatView 右側渲染 ArtifactsPanel component
- AND 兩者 SHALL 並排顯示於 flex 容器中

#### Scenario: Panel 關閉時不渲染

- WHEN store 中 `artifactsPanelOpen` 狀態為 false
- THEN AppShell SHALL NOT 渲染 ArtifactsPanel component
- AND ChatView SHALL 獨自佔滿主內容區域

---

### Requirement: Chat 寬度自動調整

當 artifacts panel 開啟時，ChatView SHALL 自動縮減寬度以容納 panel。

#### Scenario: Panel 開啟時 ChatView 縮減

- WHEN ArtifactsPanel 開啟（寬度 480px）
- THEN ChatView SHALL 使用 `flex: 1` 自動縮減寬度
- AND ChatView 的可用寬度 SHALL 為 viewport 寬度減去 480px

#### Scenario: Panel 關閉時 ChatView 恢復全寬

- WHEN ArtifactsPanel 從開啟變為關閉
- THEN ChatView SHALL 恢復為全寬佈局
- AND 過渡 SHALL 平滑自然

#### Scenario: 小螢幕不影響 ChatView 寬度

- WHEN viewport 寬度 < 768px
- AND ArtifactsPanel 開啟
- THEN ArtifactsPanel SHALL 以 overlay 模式渲染
- AND ChatView SHALL 保持全寬不受影響

---

### Requirement: SettingsPanel General Tab

SettingsPanel SHALL 新增 `general` tab 作為第一個分頁，包含語言切換和登出功能。

#### Scenario: General tab 顯示

- WHEN 使用者開啟設定面板
- THEN tab 列表的第一個項目 SHALL 為 「General」（或翻譯後的「一般」）

#### Scenario: 語言切換

- WHEN 使用者在 General tab 中點擊語言切換按鈕
- THEN 系統 SHALL 在 en 與 zh-TW 間切換
- AND UI 立即更新為新語言
- AND 選擇保存至 localStorage

#### Scenario: 登出按鈕

- WHEN 使用者在 General tab 中點擊登出按鈕
- THEN 系統 SHALL 執行登出流程（呼叫 `onLogout` callback）
