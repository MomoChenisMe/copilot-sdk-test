## Why

專案經過多輪迭代後，累積了數個 UI/UX 不一致、bug 以及功能缺口需要統一處理。具體包括：OpenSpec 危險操作放置位置不當、TabBar 拖曳動畫品質不佳、ConfirmDialog 與 LLM 語言設定的 i18n bug、Artifacts 面板缺乏空狀態處理，以及 OpenSpec 規格缺少結構化元資料記錄。這些問題個別看起來不大，但整體影響使用者體驗和系統可維護性，需要一次性修復。

**目標使用者**：專案唯一使用者（開發者本人），透過手機瀏覽器操作。
**使用情境**：日常使用中遇到的 UI 不一致、功能缺失和 bug。

## What Changes

### Bug 修復
- **ConfirmDialog i18n**：補齊 `common.confirm` 和 `common.processing` 翻譯 key；刪除對話框傳入 `confirmLabel` 以顯示「刪除」而非泛用「確認」
- **LLM 自訂語言 bug**：修復選擇「自訂...」後立即跳回預設語言的邏輯錯誤，使用獨立 local state 追蹤自訂模式
- **已封存規格日期**：無 `archivedAt` 時不渲染日期 badge

### 動畫修復
- **Tab 拖曳回位延遲**：修復 `handlePointerUp` 中 transitionend/setTimeout 競爭導致的回位動畫延遲
- **Tab 拖曳交換動畫**：為被交換的 tab 加入 FLIP 動畫，從跳躍改為平滑滑動

### 功能增強
- **Artifacts 空狀態**：移除 `artifacts.length > 0` 的面板開啟限制，加入空狀態 UI
- **OpenSpec 設定頁籤**：將危險區（刪除 OpenSpec）從 Overview 移至新的「設定」頁籤
- **自定義 Tab 名稱與顏色**：雙擊 tab 可重新命名、右鍵選單可設定顏色、tab 背景顯示指定顏色的淡彩

### 後端功能
- **OpenSpec 元資料資料庫**：在 SQLite 新增 `openspec_metadata` 表，在建立/封存/刪除規格時同步記錄元資料（建立者、建立日期、封存日期等）

## Non-Goals（非目標）

- 不重新設計 TabBar 的整體佈局或樣式
- 不實作使用者帳號系統（`created_by` 暫時記錄為固定值，因為是單人使用）
- 不支援 Tab 顏色的自訂色碼輸入（僅預設色盤）
- 不修改 OpenSpec CLI 工具本身
- 不重構 CustomSelect 元件（僅修復使用端的 bug）

## Capabilities

### New Capabilities

- `tab-customization`: Tab 自定義名稱（雙擊重新命名）和顏色（右鍵選單選擇 + 背景淡彩）功能
- `openspec-metadata-db`: 後端 SQLite 資料庫記錄 OpenSpec 規格元資料（建立者、日期等）

### Modified Capabilities

- `tab-drag-reorder`: 修復拖曳回位動畫延遲 + 為被交換 tab 加入 FLIP 滑動動畫
- `openspec-ui-panel`: 新增「設定」頁籤，將危險區從 Overview 移入
- `artifacts-panel`: 移除空陣列時的面板開啟限制，加入空狀態 UI
- `llm-language-setting`: 修復「自訂...」選項的 state 管理 bug
- `i18n`: 補齊 `common.confirm`、`common.processing` 翻譯 key，修復 ConfirmDialog 按鈕文字；封存規格無日期時隱藏日期 badge

## Impact

### 前端
- **元件修改**：TabBar.tsx、ConfirmDialog 使用處、SettingsPanel.tsx (LlmLanguageSection)、OpenSpecPanel.tsx、OpenSpecOverview.tsx、ArtifactsPanel.tsx、AppShell.tsx、OpenSpecArchived.tsx
- **新增元件**：OpenSpecSettings.tsx
- **Store**：TabState 新增 `customTitle` 和 `color` 欄位及 actions
- **i18n**：en.json 和 zh-TW.json 新增/修正多個 key

### 後端
- **資料庫**：SQLite 新增 `openspec_metadata` 表 (db.ts migration)
- **Service**：openspec-service.ts 在建立/封存/刪除時寫入/更新 metadata
- **Routes**：openspec-routes.ts API 回傳增加 metadata 欄位
- **Types**：openspec-api.ts 型別更新

### 測試
- 前端：更新 TabBar、ConfirmDialog、SettingsPanel、ArtifactsPanel、OpenSpecArchived 的 Vitest 測試
- 後端：openspec metadata CRUD 測試
