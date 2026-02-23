### Requirement: OpenSpec 面板容器
系統 SHALL 提供右側滑出面板作為 OpenSpec 視覺化管理的主容器。

#### Scenario: Desktop 面板顯示
- **WHEN** 使用者在 desktop 開啟 OpenSpec 面板
- **THEN** 面板 MUST 以 420px 寬度從右側顯示
- **AND** MUST 有 `border-l border-border` 分隔線

#### Scenario: Mobile 面板顯示
- **WHEN** 使用者在 mobile 開啟 OpenSpec 面板
- **THEN** 面板 MUST 以全螢幕覆蓋顯示（`fixed inset-0 z-50`）
- **AND** 背後 MUST 有半透明 backdrop

#### Scenario: 面板與 ArtifactsPanel 互斥
- **WHEN** OpenSpec 面板開啟且 ArtifactsPanel 已開啟
- **THEN** ArtifactsPanel MUST 自動關閉

#### Scenario: OpenSpec 未啟用時隱藏
- **WHEN** settings 中 OpenSpec SDD 未啟用
- **THEN** TopBar 的 OpenSpec 按鈕 MUST 不顯示
- **AND** Alt+O 快捷鍵 MUST 不執行任何操作

### Requirement: OpenSpec 面板導航
面板 SHALL 提供四個主要區塊的分頁導航。

#### Scenario: 分頁切換
- **WHEN** 使用者點擊導航分頁（總覽/變更/規格/已封存）
- **THEN** 面板內容 MUST 切換到對應區塊

#### Scenario: 預設分頁
- **WHEN** 面板首次開啟
- **THEN** MUST 預設顯示「變更」分頁

### Requirement: 總覽區塊
面板 SHALL 顯示 OpenSpec 專案的統計概覽。

#### Scenario: 統計資訊顯示
- **WHEN** 使用者切換到「總覽」分頁
- **THEN** 面板 MUST 顯示：進行中變更數量、總任務數、完成率、主規格數量

#### Scenario: 搜尋功能
- **WHEN** 使用者在搜尋框輸入關鍵字
- **THEN** 系統 MUST 篩選顯示名稱包含關鍵字的變更和規格

### Requirement: 變更列表區塊
面板 SHALL 顯示所有進行中的 OpenSpec 變更。

#### Scenario: 變更列表渲染
- **WHEN** 使用者切換到「變更」分頁
- **THEN** 系統 MUST 從 `GET /api/openspec/changes` 載入變更列表
- **AND** 每個變更 MUST 顯示：名稱、進度條（completed/total tasks）、最後修改時間

#### Scenario: 無變更空狀態
- **WHEN** `openspec/changes/` 目錄下沒有變更
- **THEN** 面板 MUST 顯示「沒有進行中的變更」提示

#### Scenario: 展開變更詳情
- **WHEN** 使用者點擊某個變更卡片
- **THEN** 卡片 MUST 展開顯示內部分頁（任務/提案/設計/規格）

### Requirement: 變更任務分頁
展開的變更卡片 SHALL 顯示可互動的任務勾選清單。

#### Scenario: 任務列表渲染
- **WHEN** 使用者切換到變更的「任務」分頁
- **THEN** 系統 MUST 解析 `tasks.md` 的 `- [x]` 和 `- [ ]` 格式
- **AND** MUST 以互動式 checkbox 列表渲染，`## N. Title` 格式的行 MUST 作為群組標題

#### Scenario: 任務勾選切換
- **WHEN** 使用者點擊某個任務的 checkbox
- **THEN** 系統 MUST 呼叫 `PATCH /api/openspec/changes/:name/tasks`
- **AND** MUST optimistic update UI，然後與 server 回傳結果 reconcile

#### Scenario: 進度條即時更新
- **WHEN** 任務勾選狀態改變
- **THEN** 變更卡片的進度條 MUST 即時更新百分比

#### Scenario: 批次操作
- **WHEN** 使用者點擊「全部完成」按鈕
- **THEN** 所有未完成任務 MUST 標記為完成
- **WHEN** 使用者點擊「重置任務」按鈕
- **THEN** 所有任務 MUST 標記為未完成
- **WHEN** 使用者點擊「下一個未完成」按鈕
- **THEN** 視圖 MUST 捲動到第一個未完成的任務

### Requirement: 變更提案/設計分頁
展開的變更卡片 SHALL 提供 Markdown 檢視器顯示 proposal.md 和 design.md。

#### Scenario: 提案內容顯示
- **WHEN** 使用者切換到變更的「提案」分頁
- **THEN** 系統 MUST 從 `GET /api/openspec/changes/:name` 載入 proposal 欄位
- **AND** MUST 以 Markdown 格式渲染

#### Scenario: 設計內容顯示
- **WHEN** 使用者切換到變更的「設計」分頁
- **THEN** 系統 MUST 渲染 design 欄位的 Markdown 內容

#### Scenario: 無內容時顯示空狀態
- **WHEN** 變更沒有 proposal.md 或 design.md
- **THEN** 對應分頁 MUST 顯示「尚未建立」提示

### Requirement: 變更規格分頁
展開的變更卡片 SHALL 顯示 delta specs 列表及變更統計。

#### Scenario: Delta specs 列表
- **WHEN** 使用者切換到變更的「規格」分頁
- **THEN** 系統 MUST 列出所有 delta spec 目錄名稱
- **AND** 每個 spec 旁 MUST 顯示 `+N` 新增和 `-N` 移除的變更數量指示

### Requirement: 變更操作按鈕
每個展開的變更卡片 SHALL 提供驗證、封存、刪除操作。

#### Scenario: 驗證操作
- **WHEN** 使用者點擊「驗證」按鈕
- **THEN** 系統 MUST 呼叫 `POST /api/openspec/changes/:name/verify`
- **AND** MUST 將回傳的 command 字串 dispatch 到 chat input

#### Scenario: 封存操作
- **WHEN** 使用者點擊「封存」按鈕
- **THEN** 系統 MUST 顯示確認對話框
- **AND** 確認後 MUST 呼叫 `POST /api/openspec/changes/:name/archive`
- **AND** 成功後 MUST 從變更列表中移除該項目

#### Scenario: 刪除操作
- **WHEN** 使用者點擊「刪除」按鈕
- **THEN** 系統 MUST 顯示確認對話框（含警告文字）
- **AND** 確認後 MUST 呼叫 `DELETE /api/openspec/changes/:name`
- **AND** 成功後 MUST 從變更列表中移除該項目

### Requirement: 主規格區塊
面板 SHALL 提供主規格檔案的瀏覽功能。

#### Scenario: 規格目錄列表
- **WHEN** 使用者切換到「規格」分頁
- **THEN** 系統 MUST 從 `GET /api/openspec/specs` 載入規格列表
- **AND** MUST 顯示每個規格目錄名稱和其包含的 .md 檔案數量

#### Scenario: 規格內容檢視
- **WHEN** 使用者點擊某個規格檔案
- **THEN** 系統 MUST 從 `GET /api/openspec/specs/:name/:file` 載入內容
- **AND** MUST 以 Markdown 格式渲染

### Requirement: 已封存區塊
面板 SHALL 提供已封存變更的歷史瀏覽。

#### Scenario: 已封存列表
- **WHEN** 使用者切換到「已封存」分頁
- **THEN** 系統 MUST 從 `GET /api/openspec/archived` 載入列表
- **AND** 每個項目 MUST 顯示名稱、任務完成統計、最後修改時間

#### Scenario: 已封存詳情檢視
- **WHEN** 使用者點擊某個已封存項目
- **THEN** 系統 MUST 展開顯示 proposal、design、tasks 內容（唯讀）

### Requirement: OpenSpec 面板開關控制
系統 SHALL 提供多種方式開關 OpenSpec 面板。

#### Scenario: TopBar 按鈕切換
- **WHEN** OpenSpec 已啟用且使用者點擊 TopBar 的 OpenSpec 按鈕（BookOpen icon）
- **THEN** 面板 MUST toggle 開/關

#### Scenario: 快捷鍵切換
- **WHEN** 使用者按 Alt+O
- **THEN** 面板 MUST toggle 開/關

#### Scenario: 關閉面板
- **WHEN** 使用者點擊面板 header 的關閉按鈕（或 mobile 的 backdrop）
- **THEN** 面板 MUST 關閉

### Requirement: OpenSpec 後端 API
後端 SHALL 提供 RESTful API 支援面板的所有資料操作。

#### Scenario: 概覽 API
- **WHEN** 前端呼叫 `GET /api/openspec/overview`
- **THEN** 後端 MUST 回傳 `{ projectName, activeChangesCount, archivedChangesCount, totalTasks, completedTasks, specCount }`

#### Scenario: 變更列表 API
- **WHEN** 前端呼叫 `GET /api/openspec/changes`
- **THEN** 後端 MUST 讀取 `openspec/changes/` 目錄（排除 archive/）
- **AND** MUST 回傳每個變更的 name, totalTasks, completedTasks, lastModified, hasProposal, hasDesign, specCount

#### Scenario: 變更詳情 API
- **WHEN** 前端呼叫 `GET /api/openspec/changes/:name`
- **THEN** 後端 MUST 回傳 proposal, design, tasks 的原始 Markdown 內容和 delta specs 列表

#### Scenario: 任務更新 API
- **WHEN** 前端呼叫 `PATCH /api/openspec/changes/:name/tasks`
- **THEN** 後端 MUST 根據 action（toggle/complete-all/reset-all）修改 tasks.md
- **AND** MUST 回傳更新後的 tasks 完整內容

#### Scenario: 封存 API
- **WHEN** 前端呼叫 `POST /api/openspec/changes/:name/archive`
- **THEN** 後端 MUST 將變更目錄移至 `openspec/changes/archive/YYYY-MM-DD-<name>/`
- **AND** MUST 回傳 `{ ok: true, archivedName }`

#### Scenario: 刪除 API
- **WHEN** 前端呼叫 `DELETE /api/openspec/changes/:name`
- **THEN** 後端 MUST 遞迴刪除變更目錄
- **AND** MUST 回傳 `{ ok: true }`

#### Scenario: 目錄不存在時回傳 404
- **WHEN** 前端呼叫的 change name 或 spec name 不存在
- **THEN** 後端 MUST 回傳 HTTP 404

#### Scenario: OpenSpec 目錄不存在時回傳空結果
- **WHEN** 專案根目錄下沒有 `openspec/` 目錄
- **THEN** 所有 list API MUST 回傳空陣列，overview MUST 回傳全 0 統計

### Requirement: OpenSpec 面板 i18n
面板 SHALL 提供完整的繁體中文和英文翻譯。

#### Scenario: 繁體中文介面
- **WHEN** 語系為 zh-TW
- **THEN** 所有面板文字 MUST 以繁體中文顯示（總覽、變更、規格、已封存、驗證、封存、刪除等）

#### Scenario: 英文介面
- **WHEN** 語系為 en
- **THEN** 所有面板文字 MUST 以英文顯示（Overview, Changes, Specs, Archived, Verify, Archive, Delete 等）

### Requirement: Panel container styling
OpenSpec 面板容器 SHALL 使用 `bg-bg-primary` 背景色（取代 `bg-bg-secondary`），`border-border` 邊框色（取代 `border-border-subtle`），以對齊 Artifacts 側邊欄的視覺風格。

#### Scenario: 面板容器背景與邊框一致
- **WHEN** 使用者開啟 OpenSpec 面板
- **THEN** 面板容器的背景色 MUST 為 `bg-bg-primary`
- **THEN** 面板的桌面左邊框 MUST 使用 `border-border`（非 `border-border-subtle`）

### Requirement: Panel header layout
OpenSpec 面板 header SHALL 移除固定 `h-12` 高度，改用 `px-4 py-3` 間距和 `gap-2`（取代 `gap-3`），以對齊 Artifacts 側邊欄 header 的佈局。header 邊框 SHALL 使用 `border-border`。

#### Scenario: Header 高度和間距對齊 Artifacts
- **WHEN** 使用者開啟 OpenSpec 面板
- **THEN** header MUST 使用 `px-4 py-3 border-b border-border` 佈局
- **THEN** header 內元素間距 MUST 為 `gap-2`
- **THEN** header MUST NOT 使用固定 `h-12` 高度

### Requirement: Close button styling
OpenSpec 面板的 close 按鈕 SHALL 使用 `text-text-tertiary hover:text-text-primary hover:bg-bg-secondary` 色彩（取代 `hover:bg-bg-tertiary text-text-secondary`），close icon 大小 SHALL 為 16px（取代 14px），以對齊 Artifacts 側邊欄的 close 按鈕。

#### Scenario: Close 按鈕色彩對齊
- **WHEN** 使用者查看 OpenSpec 面板的 close 按鈕
- **THEN** 按鈕 MUST 使用 `text-text-tertiary` 預設色
- **THEN** hover 時 MUST 切換為 `text-text-primary` + `bg-bg-secondary`
- **THEN** icon 大小 MUST 為 16px

### Requirement: Navigation tab styling
OpenSpec 面板的 nav tab SHALL 使用描邊風格：active tab 為 `border-accent text-accent bg-accent/5 rounded-lg border`，inactive tab 為 `border-transparent text-text-secondary hover:bg-bg-secondary rounded-lg border`。此取代原本的填滿色風格（`bg-accent text-white`）。

#### Scenario: Active tab 描邊風格
- **WHEN** 使用者查看 active 狀態的 nav tab
- **THEN** tab MUST 顯示 `border-accent` 描邊 + `text-accent` 文字 + `bg-accent/5` 淺背景
- **THEN** tab MUST NOT 使用 `bg-accent text-white` 填滿色風格

#### Scenario: Inactive tab 樣式
- **WHEN** 使用者查看非 active 狀態的 nav tab
- **THEN** tab MUST 使用 `border-transparent` + `text-text-secondary`
- **THEN** hover 時 MUST 顯示 `bg-bg-secondary`

### Requirement: Change detail sub-tab styling
OpenSpecChangeDetail 中的子 tab（Tasks/Proposal/Design/Specs）SHALL 使用與主 nav tab 一致的描邊風格，取代原本的填滿色風格。

#### Scenario: 子 tab 風格一致
- **WHEN** 使用者進入 change detail 頁面
- **THEN** 子 tab 的 active 狀態 MUST 使用 `border-accent text-accent bg-accent/5` 描邊風格
- **THEN** 子 tab 的 inactive 狀態 MUST 使用 `border-transparent text-text-secondary hover:bg-bg-secondary`

### Requirement: Slide-in animation from global CSS
OpenSpec 面板的 slide-in 動畫 SHALL 使用全域 CSS 定義的 `.animate-slide-in-right` class，MUST NOT 使用 inline `<style>` 標籤。

#### Scenario: 動畫使用全域 class
- **WHEN** OpenSpec 面板開啟
- **THEN** 面板 MUST 使用 `animate-slide-in-right` CSS class
- **THEN** 面板 MUST NOT 渲染 inline `<style>` 標籤

### Requirement: Refresh button styling
OpenSpec 面板 header 的 refresh 按鈕 SHALL 使用 `text-text-tertiary hover:text-text-primary hover:bg-bg-secondary` 色彩以對齊 close 按鈕風格。

#### Scenario: Refresh 按鈕色彩一致
- **WHEN** 使用者查看 refresh 按鈕
- **THEN** 按鈕 MUST 使用 `text-text-tertiary` 預設色
- **THEN** hover 時 MUST 切換為 `text-text-primary` + `bg-bg-secondary`

### Requirement: Internal border consistency
OpenSpec 面板內部所有 sub-component 的邊框色 SHALL 統一使用 `border-border`，MUST NOT 使用 `border-border-subtle`。

#### Scenario: 內部邊框統一
- **WHEN** 使用者瀏覽 OpenSpec 面板的任何子頁面（overview、changes、specs、change detail）
- **THEN** 所有可見邊框 MUST 使用 `border-border` 色彩
- **THEN** MUST NOT 出現 `border-border-subtle`
