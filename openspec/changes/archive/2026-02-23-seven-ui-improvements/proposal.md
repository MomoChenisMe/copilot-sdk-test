## Why

使用者在日常操作中發現 7 個 UI/UX 層面的問題與需求：缺少快速存取 artifacts 的入口、TopBar 按鈕無 tooltip 提示、CWD 路徑過長時截斷不友善、Plan mode banner 在 Bash 模式仍然顯示、OpenSpec 面板的專案設定未善用空間、規格清單缺少摘要且顯示 NaN（前後端型別不匹配）、規格名稱無法快速複製。這些問題影響操作效率與視覺一致性，需要一次性批次修復。

**目標使用者：** 開發者本人，透過手機或桌面瀏覽器使用本工具。

**使用情境：** 日常 AI 對話與 OpenSpec 管理流程中，頻繁接觸 TopBar 工具列和 OpenSpec 面板。

## What Changes

- **TopBar Artifacts 按鈕：** 在 TopBar 右側新增 Artifacts 側邊欄開關按鈕，附帶數量徽章，類似 Claude Code 的 "Open sidebar" 功能
- **規格名稱複製按鈕：** 在 OpenSpec 規格清單每項名稱旁新增複製按鈕，一鍵複製規格名稱到剪貼簿
- **TopBar Tooltip：** 為 TopBar 所有圖示按鈕加上 hover tooltip，提升按鈕辨識度
- **CWD 路徑智慧縮短：** 將過長路徑改為 `~/…/parent/project` 格式顯示，hover 時顯示完整路徑
- **Bash 模式隱藏 Plan Banner：** 切換到 Bash/Terminal 模式時不再顯示 Plan mode 提示橫幅
- **專案設定填滿空間：** OpenSpec 總覽頁的專案設定卡片改為 flex 佈局填滿剩餘垂直空間
- **規格清單加入 Summary：** 後端提取 spec 檔案摘要與正確檔案大小，前端顯示摘要文字，同時修復 NaN 顯示 bug

## Non-Goals

- 不重新設計 ArtifactsPanel 的內部 UI，僅新增 TopBar 入口按鈕
- 不實作 artifact 搜尋或篩選功能
- 不修改 OpenSpec 的 API 認證或存取權限邏輯
- 不新增 spec 檔案編輯功能
- 不涉及 mobile drawer 的 tooltip 支援（僅處理桌面版 TopBar）

## Capabilities

### New Capabilities

（本次無全新 capability，皆為現有 capability 的增量改進）

### Modified Capabilities

- `app-layout`: TopBar 新增 Artifacts 按鈕 + 所有按鈕加上 Tooltip
- `artifacts-panel`: 新增 TopBar 觸發入口（按鈕 + 徽章）
- `openspec-ui-panel`: 規格清單加入 summary 顯示 + 複製按鈕、總覽頁專案設定填滿空間
- `plan-mode`: Bash 模式下隱藏 Plan mode banner
- `bash-exec-mode`: CWD 路徑顯示優化（智慧縮短）

## Impact

- **Frontend 修改：** TopBar.tsx, AppShell.tsx, ChatView.tsx, CwdSelector.tsx, OpenSpecSpecs.tsx, OpenSpecOverview.tsx, OpenSpecPanel.tsx, i18n JSON
- **Backend 修改：** openspec-service.ts（SpecSummary 介面擴展 + listSpecs 方法更新）
- **API 變更：** `GET /api/openspec/specs` 回應新增 `summary` 和 `size` 欄位（向下相容）
- **Dependencies：** 無新增依賴，使用現有 lucide-react icons（PanelRight, Copy, Check）和 Tooltip component
