## 1. Tab 啟用狀態持久化

- [x] 1.1 撰寫 `persistOpenTabs` 測試：驗證新格式包含 `activeTabId` 欄位，且 localStorage 和 settingsApi.patch 都包含此值
- [x] 1.2 修改 `persistOpenTabs()` 函數：從純陣列格式改為 `{ tabs: [...], activeTabId }` 物件格式
- [x] 1.3 撰寫 `restoreOpenTabs` 測試：驗證新格式還原 activeTabId、舊格式 fallback 到 tabOrder[0]、activeTabId 不存在於 tabOrder 時 fallback
- [x] 1.4 修改 `restoreOpenTabs()` 函數：偵測新/舊格式，新格式讀取 `activeTabId` 並驗證存在性
- [x] 1.5 在 `settings-store.ts` 的 `AppSettings` interface 新增 `activeTabId?: string | null` 欄位
- [x] 1.6 驗證前後端測試通過 + 手動測試：切換 tab → 重新載入 → 確認回到同一個 tab

## 2. Tab 右鍵選單 — 刪除對話

- [x] 2.1 撰寫 `TabContextMenu` 元件測試：驗證右鍵顯示選單、選擇刪除觸發 confirm、確認後呼叫 onDelete callback、取消不觸發
- [x] 2.2 實作 `TabContextMenu` 元件：絕對定位選單 UI，包含「刪除對話」和「關閉 tab」選項，點擊外部/Escape 關閉
- [x] 2.3 撰寫 `TabBar` context menu 整合測試：驗證右鍵觸發 contextmenu 事件、draft tab 隱藏刪除選項
- [x] 2.4 修改 `TabBar.tsx`：新增 `onContextMenu` handler，管理 contextMenuState（position + tabId），渲染 TabContextMenu
- [x] 2.5 撰寫 store `deleteTabConversation` action 測試：驗證呼叫 conversation API DELETE + closeTab + loadConversations
- [x] 2.6 在 store 新增 `deleteTabConversation(tabId)` action：呼叫 conversation DELETE API → closeTab → 刷新 conversations
- [x] 2.7 在 `AppShell.tsx` 傳遞 `onDeleteConversation` callback 到 TabBar
- [x] 2.8 新增 i18n keys：`tabBar.deleteConversation`、`tabBar.closeTab`、`tabBar.deleteConfirm`（en.json + zh-TW.json）
- [x] 2.9 撰寫手機端 long-press 測試：驗證 touchstart + 500ms 後顯示選單、提前 touchend 不觸發
- [x] 2.10 修改 `TabBar.tsx`：新增 `onTouchStart`/`onTouchEnd` handler 搭配 500ms timer 觸發 context menu
- [x] 2.11 驗證所有測試通過 + 手動測試右鍵刪除對話流程

## 3. SDK 版本檢查日誌層級調整

- [x] 3.1 撰寫 `getInstalledVersion` 測試：驗證 Strategy 1 失敗 + Strategy 2 成功時用 debug 日誌、兩者都失敗時用 warn 日誌
- [x] 3.2 修改 `sdk-update.ts` 的 `getInstalledVersion()`：Strategy 1 失敗日誌從 `warn` 改為 `debug`
- [x] 3.3 驗證後端測試通過 + 確認啟動時不再出現 WARN 日誌

## 4. 新增頁籤顯示最近對話

- [x] 4.1 修改 `ChatView.tsx` 的空白 tab 區塊：在「發送訊息以開始...」下方新增最近對話清單（複用 welcome page 的 recentConversations 邏輯）
- [x] 4.2 新增 `onSwitchConversation` callback：點擊最近對話時，在當前 tab 切換到該對話（而非開啟新 tab）
- [x] 4.3 驗證：新增空白 tab → 顯示最近對話 → 點擊對話切換到當前 tab → 無對話時不顯示

## 5. 刪除 OpenSpec 資料夾

- [x] 5.1 後端新增 `DELETE /api/openspec/delete` 路由：接收 `cwd` 參數，驗證 openspec 資料夾存在後遞迴刪除
- [x] 5.2 前端新增 `openspecApi.deleteOpenspec(cwd)` API 呼叫
- [x] 5.3 在 `OpenSpecPanel.tsx` 的總覽頁面底部新增「刪除 OpenSpec」按鈕（紅色危險樣式）
- [x] 5.4 實作雙重確認邏輯：第一次 window.confirm → 第二次 window.prompt 要求輸入 "DELETE" 才執行
- [x] 5.5 刪除成功後呼叫 `refreshAll()` 回到無 openspec 狀態
- [x] 5.6 新增 i18n keys：`openspecPanel.deleteFolder`、`deleteConfirm`、`deletePrompt`、`deleteSuccess`（en.json + zh-TW.json）
- [x] 5.7 驗證：刪除按鈕顯示 → 第一次確認 → 第二次輸入 DELETE → 資料夾刪除 → 面板刷新

## 6. 移除 OpenSpec 重新整理按鈕

- [x] 6.1 移除 `OpenSpecHeader.tsx` 中的 `onRefresh` 和 `loading` props 及 RefreshCw 按鈕
- [x] 6.2 更新 `OpenSpecPanel.tsx` 中的 `<OpenSpecHeader>` 呼叫，移除 `onRefresh` 和 `loading` props
