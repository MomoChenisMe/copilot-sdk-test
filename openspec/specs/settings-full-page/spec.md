## ADDED Requirements

### Requirement: Full page overlay 設定頁面

Settings SHALL 以 fixed inset-0 z-50 的 full-page overlay 形式渲染，取代原有的右側 drawer 設計。

#### Scenario: 開啟設定頁面

- WHEN 使用者點擊設定按鈕
- THEN Settings SHALL 以 full-page overlay 方式渲染
- AND overlay SHALL 使用 `position: fixed; inset: 0; z-index: 50`
- AND overlay 背景 SHALL 完全覆蓋底層 chat 介面

#### Scenario: 設定頁面不再使用 drawer

- WHEN Settings overlay 渲染
- THEN SHALL NOT 使用右側滑出的 drawer 樣式
- AND SHALL 佔滿整個 viewport

---

### Requirement: 桌面端左側導航列

Desktop 版面 SHALL 顯示左側 sidebar（w-56），包含各分類按鈕，active 分類以 accent color 高亮。

#### Scenario: 左側 sidebar 渲染

- WHEN viewport 寬度 >= md breakpoint
- THEN Settings SHALL 在左側顯示寬度為 `w-56` 的 navigation sidebar
- AND sidebar 中 SHALL 顯示所有設定分類按鈕

#### Scenario: Active 分類高亮

- WHEN 使用者選中某一設定分類
- THEN 對應的 sidebar button SHALL 以 accent color 背景高亮
- AND 其他分類按鈕保持預設狀態

#### Scenario: 點擊分類按鈕切換內容

- WHEN 使用者點擊 sidebar 中的另一個分類按鈕
- THEN 右側 content area SHALL 切換至對應分類的設定內容
- AND 被點擊的按鈕 SHALL 變為 active 高亮狀態

---

### Requirement: 行動端頂部導航

當 viewport 低於 md breakpoint 時，navigation SHALL 切換為水平可捲動的 tabs，顯示在設定頁面頂部。

#### Scenario: 行動端水平 tabs

- WHEN viewport 寬度 < md breakpoint
- THEN Settings 左側 sidebar SHALL 隱藏
- AND navigation SHALL 改為水平排列的可捲動 tabs，位於頁面頂部

#### Scenario: 行動端 tab 可橫向捲動

- WHEN 分類 tabs 超出 viewport 寬度
- THEN tabs 容器 SHALL 支援水平捲動
- AND 使用者可透過滑動瀏覽所有分類

---

### Requirement: 設定分類結構

Settings SHALL 包含 8 個分類：General、System Prompt、Profile、Agent Rules、Presets、Memory、Skills、API Keys。

#### Scenario: 全部 8 個分類渲染

- WHEN Settings overlay 開啟
- THEN navigation SHALL 顯示以下 8 個分類按鈕（依序）：
  1. General
  2. System Prompt
  3. Profile
  4. Agent Rules
  5. Presets
  6. Memory
  7. Skills
  8. API Keys

#### Scenario: 預設選中第一個分類

- WHEN Settings 首次開啟
- THEN "General" 分類 SHALL 為預設 active 狀態
- AND 右側顯示 General 的設定內容

---

### Requirement: API Keys 獨立分頁

Brave Search API key 管理功能 SHALL 從 General tab 中抽取至獨立的 API Keys tab。

#### Scenario: API Keys tab 內容

- WHEN 使用者切換至 API Keys 分類
- THEN content area SHALL 顯示 Brave Search API key 的輸入欄位
- AND SHALL 支援新增、編輯、刪除 API key

#### Scenario: General tab 不再包含 API Keys

- WHEN 使用者瀏覽 General 分類
- THEN General tab SHALL NOT 包含 Brave Search API key 相關設定
- AND API key 管理僅在 API Keys tab 中可用

---

### Requirement: 關閉行為

Escape 鍵與返回箭頭按鈕 SHALL 關閉設定頁面並返回 chat 介面。

#### Scenario: Escape 鍵關閉設定

- WHEN Settings overlay 已開啟
- AND 使用者按下 Escape 鍵
- THEN Settings overlay SHALL 關閉
- AND 畫面 SHALL 返回 chat 介面

#### Scenario: 返回箭頭按鈕關閉設定

- WHEN Settings overlay 已開啟
- AND 使用者點擊 header 中的返回箭頭按鈕
- THEN Settings overlay SHALL 關閉
- AND 畫面 SHALL 返回 chat 介面

#### Scenario: 點擊背景不關閉

- WHEN Settings overlay 已開啟
- THEN overlay 背景不可點擊穿透
- AND 僅能透過 Escape 鍵或返回箭頭按鈕關閉

---

### Requirement: Content area 版面

右側 content area SHALL 為可捲動區域，內容以 `max-w-2xl` 置中顯示。

#### Scenario: Content area 置中佈局

- WHEN 設定分類的內容渲染
- THEN content area SHALL 使用 `max-w-2xl` 限制最大寬度
- AND 內容 SHALL 水平置中

#### Scenario: Content area 可捲動

- WHEN 設定內容超出可視區域高度
- THEN content area SHALL 支援垂直捲動
- AND sidebar 或 tabs navigation SHALL 保持固定不捲動

---

### Requirement: 各分類內部邏輯保留

每個分類的內部邏輯（editors、toggles、lists 等）SHALL 維持功能不變。

#### Scenario: General tab 功能保留

- WHEN 使用者在 General tab 中操作語言切換或主題切換
- THEN 功能 SHALL 與原 drawer 版本行為完全一致

#### Scenario: System Prompt tab 功能保留

- WHEN 使用者在 System Prompt tab 中編輯 prompt 內容
- THEN editor 功能 SHALL 與原 drawer 版本行為完全一致

#### Scenario: 所有 toggles 與 editors 正常運作

- WHEN 使用者在任一分類 tab 中操作 toggles、editors 或 lists
- THEN 操作結果 SHALL 與原 drawer 版本完全一致
- AND 資料 SHALL 正確持久化
