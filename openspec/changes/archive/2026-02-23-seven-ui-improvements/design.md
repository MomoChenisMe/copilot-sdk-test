## Context

目前系統在多處 UI 體驗上存在小幅度但頻繁影響操作效率的問題：TopBar 按鈕缺少 tooltip、ArtifactsPanel 沒有直覺的入口按鈕、CWD 路徑過長截斷不友善、Plan mode banner 在不相關的 Bash 模式仍顯示、OpenSpec 面板的專案設定區塊未善用空間、規格清單缺少摘要且有 NaN 顯示 bug（前後端型別不匹配）。

所有改動涉及 7 個獨立的 UI 修正，共影響約 10 個檔案（9 前端 + 1 後端），彼此之間低耦合。

## Goals / Non-Goals

**Goals:**

- 為 TopBar 所有圖示按鈕加上 tooltip，提升按鈕辨識度
- 新增 Artifacts 側邊欄 TopBar 按鈕（含數量徽章），提供快速存取入口
- 智慧縮短 CWD 路徑顯示，長路徑以 `~/…/parent/project` 格式呈現
- Bash 模式下隱藏不相關的 Plan mode banner
- OpenSpec 專案設定卡片填滿面板剩餘垂直空間
- 規格清單顯示 summary 摘要文字和正確的檔案大小
- 規格名稱旁加入複製按鈕

**Non-Goals:**

- 不重新設計 ArtifactsPanel 內部 UI
- 不實作 artifact 搜尋/篩選功能
- 不處理 mobile drawer 的 tooltip
- 不新增 spec 檔案編輯功能

## Decisions

### D1: Artifacts 按鈕放置位置

**決策：** 放在 OpenSpec 按鈕和 Settings 按鈕之間。

- **替代方案 A：** 放在 TopBar 最右側（Settings 之後）。取捨：視覺上會與 ConnectionBadge 擠在一起，不如放在功能性按鈕群組中間。
- **理由：** OpenSpec 和 Artifacts 都是內容面板入口，放在相鄰位置形成語義分組，與 Claude Code 的 UI 佈局一致。

### D2: CWD 路徑縮短策略

**決策：** 使用 `shortenPath()` 函數，規則為「替換 home dir 為 `~`，超過 3 段時顯示 `~/…/<倒數第二段>/<最後一段>`」。

- **替代方案 A：** 保持 CSS `truncate` 從右截斷。取捨：截斷後看不到專案名稱，辨識度差。
- **替代方案 B：** 只顯示最後一段資料夾名稱。取捨：失去上層目錄的上下文資訊，在相同名稱的子資料夾下容易混淆。
- **理由：** 顯示最後兩段提供足夠的路徑辨識資訊，`~` 替換大幅縮短前綴長度。保留 `title` attribute 作為 hover 完整路徑提示。

### D3: 規格 Summary 提取方式

**決策：** 從 spec.md 內容中提取第一行非空、非標題（`#`）、非 YAML frontmatter 分隔符（`---`）的文字，截取前 150 字元。

- **替代方案 A：** 提取第一個 heading 文字。取捨：現有 spec 的 heading 多為 `## ADDED Requirements` 等通用標題，語義資訊不足。
- **替代方案 B：** 在 spec 檔案中新增 YAML frontmatter 存放 summary。取捨：需要變更所有現有 spec 檔案格式，工作量過大。
- **理由：** 第一段文字通常是需求描述，提取邏輯簡單且向下相容，不需修改任何現有 spec 檔案。

### D4: OpenSpec Overview 填滿策略

**決策：** 將 Overview 根容器改為 `flex flex-col h-full`，設定卡片使用 `flex-1 min-h-0`，並在 Panel 層級對 overview tab 使用 `overflow-hidden` 取代 `overflow-y-auto`。

- **替代方案 A：** 使用 CSS `calc(100vh - ...)` 計算固定高度。取捨：不同環境下 header/tab 高度可能不同，計算值不可靠。
- **理由：** flexbox 方案自適應且不依賴硬編碼數值。將滾動責任下放到設定卡片內部，其他 tab 維持外部捲動。

## Risks / Trade-offs

- **[風險] CWD 路徑縮短可能遺失重要路徑資訊** → 緩解：保留 `title` 全路徑 hover 提示；顯示最後兩段而非僅一段
- **[風險] 後端 `fs.statSync` 在大量 spec 時可能影響效能** → 緩解：spec 數量通常 < 100，且 stat 呼叫極快（< 1ms）；已在讀取 content 的同一迴圈中執行
- **[風險] Overview flex 佈局在無 config 時可能留大片空白** → 緩解：flex-1 卡片僅在 `config` 存在時渲染，無 config 時 Overview 維持原有佈局
- **[取捨] TopBar 按鈕增多可能在窄螢幕上擠壓標題空間** → 標題已有 `flex-1 min-w-0 truncate`，可自動壓縮；手機上 TopBar 按鈕已透過 hamburger menu 收折
