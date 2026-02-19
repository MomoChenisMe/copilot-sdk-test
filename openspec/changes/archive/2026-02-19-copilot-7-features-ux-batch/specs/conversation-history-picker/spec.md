## ADDED Requirements

### Requirement: Welcome page 最近對話區段

ChatView 的歡迎頁面 SHALL 在「開始新對話」按鈕下方顯示最近 10 筆對話列表。

#### Scenario: 顯示最近對話

- WHEN ChatView 渲染歡迎頁面（draft tab，無 conversationId）
- THEN 歡迎頁面 MUST 在「開始新對話」按鈕下方顯示最近對話區段
- AND 區段標題 MUST 使用 `t('chat.recentConversations')` 取得翻譯

#### Scenario: 最多顯示 10 筆

- WHEN Zustand store 中有超過 10 筆 conversations
- THEN 歡迎頁面 MUST 僅顯示最近的 10 筆（按更新時間排序）

#### Scenario: 每筆對話項目內容

- WHEN 最近對話列表渲染
- THEN 每筆項目 MUST 包含：
  - 對話標題（title）
  - 模型 badge（顯示使用的 AI model 名稱）
  - 相對時間戳（如「剛剛」、「5 分鐘前」、「2 小時前」）
- AND 時間格式 MUST 重用 sidebar 現有的 i18n key（`sidebar.justNow`、`sidebar.minutesAgo` 等）

#### Scenario: 點擊開啟對話

- WHEN 使用者點擊最近對話列表中的某筆項目
- THEN 系統 MUST 呼叫 `openTab(conversationId, title)` 在新 tab 中開啟該對話

#### Scenario: 無對話歷史

- WHEN Zustand store 中沒有任何 conversations
- THEN 歡迎頁面 MUST NOT 顯示最近對話區段
- AND 僅顯示「開始新對話」按鈕

#### Scenario: 對話列表為空但載入中

- WHEN conversations 資料尚在載入
- THEN 歡迎頁面 SHOULD 不顯示最近對話區段（避免閃爍空狀態）

---

### Requirement: TabBar 歷史下拉按鈕

TabBar SHALL 在「+」（新增 tab）按鈕旁邊提供歷史下拉按鈕（ChevronDown 圖示），展開時重用 `ConversationPopover` 元件。

#### Scenario: 歷史按鈕渲染

- WHEN TabBar 渲染
- THEN 「+」按鈕右側 MUST 顯示一個 ChevronDown 圖示按鈕
- AND 按鈕的 `title` 屬性 MUST 使用 `t('tabBar.history')` 取得翻譯

#### Scenario: 點擊展開 Popover

- WHEN 使用者點擊歷史下拉按鈕
- THEN 系統 MUST 展開 `ConversationPopover` 元件
- AND Popover MUST 顯示所有對話列表（含搜尋、pin、rename、delete 功能）

#### Scenario: 選擇對話

- WHEN 使用者在 Popover 中選擇一個對話
- THEN 系統 MUST 開啟該對話（新 tab 或切換至既有 tab）
- AND Popover MUST 關閉

#### Scenario: 新增對話

- WHEN 使用者在 Popover 中點擊「新對話」
- THEN 系統 MUST 呼叫 `onNewTab()` 建立新 tab
- AND Popover MUST 關閉

#### Scenario: 點擊外部關閉

- WHEN Popover 已展開且使用者點擊 Popover 外部區域
- THEN Popover MUST 關閉

#### Scenario: Popover anchor 位置

- WHEN Popover 展開
- THEN Popover MUST 以歷史下拉按鈕作為 anchor
- AND 顯示位置 MUST 在按鈕下方
