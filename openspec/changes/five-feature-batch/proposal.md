## Why

使用者在日常操作中發現 5 個不同層面的問題與需求：一個影響基本操作流暢度的頁簽關閉 bug（關閉執行中頁簽後下一個頁簽無限 Loading）、OpenSpec 總覽頁面未顯示 config.yaml 設定、AI/Bash 模式切換快捷鍵不直覺且 Bash 模式下不應有計劃/執行切換、設定頁面的 SDK 版本管理功能不完整（缺少版本檢查與手動更新）、以及 OpenSpec 相關技能缺乏視覺辨識標記。這些問題涵蓋 bug 修復、UX 改進和功能補全，需一次性批次處理以提升整體使用品質。

**目標使用者：** 單人使用的開發者（本人），透過手機瀏覽器或桌面瀏覽器操作 AI Terminal。

**使用情境：**
- 多頁簽並行工作時關閉頁簽不應中斷工作流
- 在 OpenSpec 面板快速瀏覽專案設定
- 透過鍵盤快捷鍵高效切換 AI/Bash 模式
- 在設定頁面管理 SDK 版本與更新
- 從技能列表中快速辨識 OpenSpec 相關技能

## What Changes

- **[Bug Fix] 頁簽關閉後 lazy-load 修復**：`handleCloseTab` 改為呼叫 `handleSelectTab(newActiveTabId)` 以觸發新 active tab 的訊息 lazy-load，修復無限 Loading 問題
- **[Feature] OpenSpec 總覽顯示 config.yaml**：前端 `OverviewData` 對齊後端欄位名並新增 `config` 欄位，OpenSpecOverview 新增 Tab 切換卡片（專案說明/產出規則）以 Markdown 渲染 config 內容
- **[UX] AI/Bash 快捷切換改為 Cmd/Ctrl+Shift+Tab**：新增 toggle 式快捷鍵，移除舊的 Alt+Shift+A/B，且 Bash 模式下自動 disabled 計劃/執行切換
- **[Feature] SDK 手動版本檢查與更新**：設定頁面 General Tab 新增版本比較顯示、「檢查更新」按鈕和「更新 SDK」按鈕（接線現有後端 API）
- **[UI] OpenSpec 技能 UI 標記**：在設定頁面技能列表和 Slash Command 選單中，對 `openspec-*` 前綴的技能新增紫色 "OpenSpec" badge

## Non-Goals（非目標）

- 不實作 SDK 自動更新（需後端定時檢查機制，留待後續）
- 不重構整個頁簽管理架構（僅修復關閉時的 lazy-load 觸發）
- 不新增 config.yaml 的線上編輯功能（僅顯示）
- 不調整其他非 AI/Bash 模式的快捷鍵

## Capabilities

### New Capabilities

_無新增 capability，全部為既有 capability 的修改與補強。_

### Modified Capabilities

- `app-layout`: 修復 handleCloseTab 中缺少 handleSelectTab 呼叫導致的無限 Loading bug
- `openspec-ui-panel`: 總覽頁面新增 config.yaml 顯示（Tab 切換卡片 + Markdown 渲染），對齊前後端 OverviewData 欄位名
- `keyboard-shortcuts`: AI/Bash 切換快捷鍵改為 Cmd/Ctrl+Shift+Tab（移除 Alt+Shift+A/B）
- `bash-exec-mode`: Bash 模式下 disabled 計劃/執行 toggle
- `plan-mode`: Terminal 模式下阻止 Plan toggle 切換（快捷鍵和 UI 同步）
- `sdk-upgrade-advisor`: 設定頁面 GeneralTab 新增版本比較顯示、手動檢查更新按鈕、手動更新 SDK 按鈕
- `skills-management`: 對 openspec-* 前綴的技能在設定頁面和 Slash Command 選單新增紫色 "OpenSpec" badge
- `openspec-sdd-toggle`: 技能視覺標記連動 OpenSpec 開關狀態

## Impact

**前端修改（9 個檔案）：**
- `frontend/src/components/layout/AppShell.tsx` — tab close handler 修復 + 快捷鍵 handler 接線
- `frontend/src/hooks/useGlobalShortcuts.ts` — 新增 Cmd/Ctrl+Shift+Tab，移除 Alt+Shift+A/B
- `frontend/src/components/copilot/ChatView.tsx` — PlanActToggle disabled 條件
- `frontend/src/lib/openspec-api.ts` — OverviewData 欄位對齊 + config
- `frontend/src/components/openspec/OpenSpecOverview.tsx` — config 顯示 UI
- `frontend/src/components/settings/SettingsPanel.tsx` — SDK 版本管理 UI + 技能 badge
- `frontend/src/components/shared/SlashCommandMenu.tsx` — 技能 badge
- `frontend/src/locales/en.json` — i18n keys
- `frontend/src/locales/zh-TW.json` — i18n keys

**後端：** 無修改（現有 API 已滿足需求）

**依賴：** 無新增依賴
