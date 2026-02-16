## MODIFIED Requirements

### Requirement: TopBar

TopBar SHALL 為精簡化設計，高度 h-12，包含 Sidebar 按鈕（左側）、對話標題（中央，可點擊回首頁）、設定齒輪按鈕、主題切換和連線狀態（右側）。新對話按鈕已從 TopBar 移除。

#### Scenario: TopBar 內容顯示
- **WHEN** 應用程式載入完成
- **THEN** TopBar MUST 顯示：左側 Sidebar 按鈕（Menu icon），中央對話標題（`text-sm font-medium`），右側設定齒輪按鈕、主題切換按鈕和連線狀態指示燈

#### Scenario: 連線狀態指示
- **WHEN** WebSocket 連線狀態變更
- **THEN** 指示燈 MUST 即時更新：綠色=已連線、黃色=重連中、紅色=斷線

#### Scenario: TopBar 間距
- **WHEN** TopBar 渲染
- **THEN** TopBar MUST 使用 `h-12 px-4` 尺寸，背景為 `bg-bg-primary`，底部邊框為 `border-border-subtle`

#### Scenario: 回到首頁
- **WHEN** 使用者點擊 TopBar 中的對話標題
- **THEN** 系統 MUST 將 `activeConversationId` 設為 `null`，顯示歡迎畫面

### Requirement: TabBar

系統 SHALL 提供多 Tab 管理元件，放置於 TopBar 和內容區之間。每個 Tab 代表一個獨立的 Copilot 實例。Tab 擁有獨立的 UUID（tabId），與 conversationId 解耦。

#### Scenario: TabBar 顯示
- **WHEN** 應用程式載入完成
- **THEN** TabBar MUST 顯示在 TopBar 下方，高度 h-10，包含所有已開啟的 Tab 和末端的 "+" 按鈕

#### Scenario: Active tab 樣式
- **WHEN** tab 為 active 狀態
- **THEN** tab 按鈕 MUST 使用 `text-accent bg-accent-soft rounded-lg` 樣式

#### Scenario: Inactive tab 樣式
- **WHEN** tab 為 inactive 狀態
- **THEN** tab 按鈕 MUST 使用 `text-text-muted hover:text-text-secondary hover:bg-bg-tertiary` 樣式

#### Scenario: Tab 切換
- **WHEN** 使用者點擊非標題區域的 tab 按鈕
- **THEN** 系統 MUST 將該 tab 設為 active，載入其 conversationId 對應的訊息

#### Scenario: 新增 Tab
- **WHEN** 使用者點擊 Tab Bar 末端的 "+" 按鈕
- **THEN** 系統 MUST 建立新對話（POST /api/conversations）、生成獨立 tabId、開啟新 Tab 並設為 active

#### Scenario: Tab 標題點擊開啟 Conversation Popover
- **WHEN** 使用者點擊 active tab 的標題文字區域
- **THEN** 系統 MUST 在 tab 下方開啟 ConversationPopover，顯示可切換的對話列表

#### Scenario: Tab 標題顯示 Chevron
- **WHEN** Tab 渲染
- **THEN** Tab 標題文字旁 MUST 顯示 ChevronDown icon，提示可點擊開啟 Popover

#### Scenario: Tab 關閉
- **WHEN** 使用者點擊 tab 的關閉按鈕（X icon）
- **THEN** 系統 MUST 移除該 tab，如果是 active tab 則切換到相鄰 tab

#### Scenario: Tab 上限警告
- **WHEN** 已開啟 Tab 數量達到 15
- **THEN** 系統 MUST 顯示警告訊息，"+" 按鈕 MUST 被停用

### Requirement: Conversation Popover

系統 SHALL 提供 ConversationPopover 元件，作為 Tab 內切換對話的主要介面。

#### Scenario: Popover 開啟
- **WHEN** 使用者點擊 Tab 標題
- **THEN** Popover MUST 在 Tab 下方彈出，包含搜尋框、已釘選對話區、最近對話區、「新對話」按鈕

#### Scenario: 搜尋對話
- **WHEN** 使用者在 Popover 搜尋框中輸入關鍵字
- **THEN** 對話列表 MUST 即時過濾，只顯示標題匹配的對話

#### Scenario: 選取對話
- **WHEN** 使用者在 Popover 中點擊某個對話
- **THEN** 系統 MUST 將當前 Tab 的 conversationId 切換為選取的對話，載入該對話的訊息

#### Scenario: 同一對話已在其他 Tab 開啟
- **WHEN** 使用者選取的對話已在其他 Tab 中載入
- **THEN** 系統 MUST 顯示提示並自動跳轉到該 Tab，MUST NOT 在兩個 Tab 中載入同一對話

#### Scenario: 切換時正在 Streaming
- **WHEN** 使用者嘗試切換對話但當前 Tab 正在 streaming
- **THEN** 系統 MUST 顯示確認對話框，確認後 abort 當前 stream 再切換

#### Scenario: 建立新對話
- **WHEN** 使用者點擊 Popover 中的「新對話」按鈕
- **THEN** 系統 MUST 建立新對話並在當前 Tab 中載入

#### Scenario: 當前對話高亮
- **WHEN** Popover 列表渲染
- **THEN** 當前 Tab 載入的對話 MUST 使用不同的背景色高亮顯示

#### Scenario: 鍵盤導航
- **WHEN** Popover 開啟中
- **THEN** 系統 MUST 支援 ArrowUp/ArrowDown 選擇、Enter 確認、Escape 關閉

#### Scenario: 點擊外部關閉
- **WHEN** 使用者點擊 Popover 外部區域
- **THEN** Popover MUST 關閉

### Requirement: Sidebar（對話列表）

Sidebar SHALL 作為對話管理器，提供對話的搜尋、釘選、重新命名和刪除功能。對話的開啟改由 Conversation Popover 處理。

#### Scenario: 開啟 Sidebar
- **WHEN** 使用者點擊漢堡選單按鈕
- **THEN** Sidebar MUST 從左側滑入顯示（`duration-300 ease-out`），覆蓋在主內容區上方，backdrop 使用 `bg-black/40 backdrop-blur-sm`

#### Scenario: 關閉 Sidebar
- **WHEN** 使用者點擊 Sidebar 外部區域或關閉按鈕
- **THEN** Sidebar MUST 滑出隱藏

#### Scenario: 對話列表排序
- **WHEN** Sidebar 顯示
- **THEN** 對話列表 MUST 按釘選優先、更新時間遞減排序

#### Scenario: 對話操作
- **WHEN** 使用者 hover 對話項目
- **THEN** 介面 MUST 顯示操作按鈕：重新命名（Pencil icon）、釘選/取消釘選（Star icon，釘選時 fill）、刪除（Trash2 icon）

#### Scenario: 點擊對話載入到當前 Tab
- **WHEN** 使用者點擊 Sidebar 中的對話
- **THEN** 系統 MUST 將該對話載入到當前 active Tab（等同於在 Popover 中選取），Sidebar 自動關閉

#### Scenario: 搜尋欄位
- **WHEN** Sidebar 搜尋欄位渲染
- **THEN** 搜尋輸入 MUST 內嵌 Search icon，使用 `bg-bg-tertiary rounded-lg` 樣式

#### Scenario: 設定區
- **WHEN** Sidebar 渲染
- **THEN** Sidebar 底部 MUST 顯示設定區（以 border-t 分隔），包含語言切換按鈕（Globe icon + 當前語言）和登出按鈕（LogOut icon）

## REMOVED Requirements

### Requirement: 新增對話快捷
**Reason**: TopBar 的 "+" 按鈕已移除，新增 Tab/對話統一由 Tab Bar 的 "+" 按鈕處理。
**Migration**: 使用 Tab Bar 末端的 "+" 按鈕建立新 Tab 和對話。
