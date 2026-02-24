## 1. i18n Bug 修復（ConfirmDialog + 封存日期）

- [x] 1.1 撰寫 ConfirmDialog i18n 測試：驗證 confirm 按鈕在 zh-TW locale 下顯示「確認」、loading 時顯示「處理中...」
- [x] 1.2 新增 `common.confirm` 和 `common.processing` 到 en.json 和 zh-TW.json
- [x] 1.3 更新 TabBar.tsx 的 ConfirmDialog 使用處，傳入 `confirmLabel={t('common.delete')}`
- [x] 1.4 撰寫 OpenSpecArchived 條件日期顯示測試：驗證無 archivedAt 時不渲染日期 badge
- [x] 1.5 修改 OpenSpecArchived.tsx 加入 `{item.archivedAt && (...)}` 條件判斷
- [x] 1.6 執行前端測試驗證 `npx vitest run`

## 2. LLM 自訂語言 Bug 修復

- [x] 2.1 撰寫 LlmLanguageSection 測試：驗證選擇「自訂...」後顯示輸入框、輸入文字後 llmLanguage 正確更新
- [x] 2.2 新增 `customMode` local state，初始化時根據 `isCustom` 判斷設定初始值
- [x] 2.3 修改 CustomSelect onChange handler：選擇 `__custom` 時設 `customMode(true)` 不改 llmLanguage，選擇預設語言時設 `customMode(false)`
- [x] 2.4 修改 selectValue 計算：`customMode` 為 true 時固定回傳 `'__custom'`
- [x] 2.5 修改自訂輸入框顯示條件：使用 `customMode` 取代 `selectValue === '__custom'`
- [x] 2.6 執行前端測試驗證

## 3. Tab 拖曳回位動畫延遲修復

- [x] 3.1 撰寫 TabBar 拖曳回位測試：驗證 pointerUp 後 transition 立即啟動（無 rAF 延遲）
- [x] 3.2 修改 handlePointerUp：移除 `requestAnimationFrame` wrapper，同步設定 transition + transform
- [x] 3.3 確保 transitionend 回調一次性清除所有 style（transition、transform）並更新 dragTabId state
- [x] 3.4 保留 setTimeout(150ms) 僅作為 cleanup guard
- [x] 3.5 執行前端測試驗證

## 4. Tab 拖曳交換 FLIP 動畫

- [x] 4.1 撰寫被交換 tab 滑動動畫測試：驗證交換時被交換 tab 的 style.transition 被設定
- [x] 4.2 在 handlePointerMove swap 邏輯中，flushSync 前記錄被交換 tab 的 offsetLeft
- [x] 4.3 flushSync 後計算差異，設定被交換 tab 的 `transform: translateX(diff)`
- [x] 4.4 requestAnimationFrame 中加上 transition 並設 `transform: translateX(0)`
- [x] 4.5 transitionend 後清除被交換 tab 的 styles
- [x] 4.6 處理快速連續交換：在啟動新動畫前先清除前一個動畫的 styles
- [x] 4.7 執行前端測試驗證

## 5. Artifacts 空狀態

- [x] 5.1 撰寫 ArtifactsPanel 空狀態測試：驗證 artifacts 為空時顯示空狀態 UI（icon + 文字）
- [x] 5.2 撰寫 AppShell 測試：驗證 artifactsPanelOpen 為 true 且 artifacts 為空時仍渲染 ArtifactsPanel
- [x] 5.3 新增 `artifacts.empty` 到 en.json 和 zh-TW.json
- [x] 5.4 修改 AppShell.tsx：移除 `activeTab.artifacts.length > 0` 條件
- [x] 5.5 修改 ArtifactsPanel.tsx：在 content 區域加入空狀態 UI（Package icon + i18n 文字）
- [x] 5.6 執行前端測試驗證

## 6. OpenSpec 設定頁籤

- [x] 6.1 撰寫 OpenSpecSettings 元件測試：驗證渲染危險區 UI 和刪除按鈕
- [x] 6.2 撰寫 OpenSpecPanel 測試：驗證 settings tab 存在且點擊後顯示 OpenSpecSettings
- [x] 6.3 新增 `openspecPanel.tabs.settings` 到 en.json 和 zh-TW.json
- [x] 6.4 新增 OpenSpecSettings.tsx 元件（接收 onDeleteOpenspec、deleting props）
- [x] 6.5 修改 OpenSpecPanel.tsx：新增 `'settings'` 到 tab type、新增 tab 按鈕、新增 render case
- [x] 6.6 修改 OpenSpecOverview.tsx：移除危險區 JSX（lines 131-155）
- [x] 6.7 撰寫 OpenSpecOverview 測試：驗證 Overview 不再渲染危險區
- [x] 6.8 執行前端測試驗證

## 7. 自定義 Tab 名稱和顏色

- [x] 7.1 撰寫 store 測試：驗證 setTabCustomTitle 和 setTabColor actions 正確更新 TabState
- [x] 7.2 擴充 Zustand store TabState 新增 `customTitle?: string` 和 `color?: string`，新增 setter actions
- [x] 7.3 撰寫 TabBar 雙擊重新命名測試：驗證雙擊進入編輯模式、Enter 確認、Escape 取消
- [x] 7.4 實作 TabBar 雙擊重新命名：title span onDoubleClick → input 元素，Enter/Escape/blur 處理
- [x] 7.5 撰寫 TabBar 右鍵顏色選擇測試：驗證 context menu 顯示色盤、選色後更新 store
- [x] 7.6 實作 TabContextMenu 顏色選擇：新增「設定顏色」選項 + 8 色色盤 + 清除選項
- [x] 7.7 撰寫 Tab 背景淡彩顯示測試：驗證有顏色的 active/hover/rest tab 正確套用 inline style
- [x] 7.8 實作 Tab 背景淡彩：根據 color 動態套用 `backgroundColor` inline style
- [x] 7.9 新增 `tabBar.rename`、`tabBar.setColor`、`tabBar.clearColor` 到 en.json 和 zh-TW.json
- [x] 7.10 執行前端測試驗證

## 8. 後端 OpenSpec 元資料資料庫

- [x] 8.1 撰寫 openspec_metadata 表 schema 測試：驗證 CREATE TABLE 正確執行且 idempotent
- [x] 8.2 在 db.ts 新增 `openspec_metadata` 表的 CREATE TABLE IF NOT EXISTS migration
- [x] 8.3 撰寫 metadata CRUD 函式測試：upsert、query by cwd、delete
- [x] 8.4 在 openspec-service.ts 新增 metadata CRUD 函式（upsertMeta、queryMeta、deleteMeta）
- [x] 8.5 撰寫 archive 操作元資料記錄測試：驗證封存時 type 更新為 'archived' 且 archived_at 被設定
- [x] 8.6 修改 openspec-routes.ts 的 archive 操作：封存成功後更新 metadata record
- [x] 8.7 撰寫 delete 操作元資料清理測試：驗證刪除 change 時對應 metadata 被移除
- [x] 8.8 修改 openspec-routes.ts 的 delete 操作：刪除成功後移除 metadata record
- [x] 8.9 撰寫 overview API 元資料回傳測試：驗證 changes/archived/specs 回傳包含 metadata 欄位
- [x] 8.10 修改 openspec-routes.ts：overview/changes/archived API 回傳增加 metadata 欄位
- [x] 8.11 修改 openspec-service.ts 的 overview 呼叫：sync metadata for newly detected specs
- [x] 8.12 更新 frontend openspec-api.ts types 以包含 metadata 欄位
- [x] 8.13 更新 OpenSpecArchived.tsx 使用 DB metadata 的 archivedAt（若 DB 值可用）
- [x] 8.14 執行後端和前端測試驗證

## 9. 整合測試與收尾

- [x] 9.1 執行完整前端測試套件 `cd frontend && npx vitest run`
- [x] 9.2 手動驗證所有 9 項改進的 E2E 行為
- [x] 9.3 檢查 TypeScript 編譯無錯誤 `cd frontend && npx tsc --noEmit`
