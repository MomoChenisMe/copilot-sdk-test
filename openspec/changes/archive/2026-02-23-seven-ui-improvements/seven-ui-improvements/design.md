## Context

目前的 tab 系統透過 Zustand store 管理，`persistOpenTabs()` 將 tab 資料存入 localStorage 和後端 settings API，`restoreOpenTabs()` 在頁面載入時還原。問題是 `activeTabId` 未被持久化，每次都回到第一個 tab。

Tab 的 close 按鈕（X）已存在於 `TabBar.tsx`，hover 時顯示。但「關閉 tab」只是從 tab bar 移除，對話仍保留在歷史中。使用者需要另外打開歷史下拉選單來刪除對話。

SDK 版本檢查使用兩階段 fallback：Strategy 1 用 `createRequire` 解析，Strategy 2 用硬編碼路徑尋找 `package.json`。由於 `@github/copilot-sdk` 的 exports 欄位沒有匯出 main entry，Strategy 1 必然失敗，但目前用 WARN 層級記錄此預期行為。

## Goals / Non-Goals

**Goals:**

- 跨頁面重新載入保持使用者最後啟用的 tab
- 讓使用者能從 tab 直接刪除對話（一步完成，而非兩步）
- 消除後端啟動時的 SDK 版本檢查噪音日誌

**Non-Goals:**

- 不改變 tab 的拖曳排序、釘選、或分組功能
- 不改變對話歷史下拉選單的現有刪除功能
- 不修改 SDK 自動更新邏輯
- 不新增 tab 的其他右鍵選單功能（重新命名、複製等）

## Decisions

### D1: activeTabId 持久化位置

**選擇**：與 tab 陣列一起存在同一個 localStorage key（`codeforge:openTabs`）中，新增一個 wrapper 物件格式。

**格式遷移**：
```typescript
// 舊格式（純陣列）
[{ id, title, conversationId }, ...]

// 新格式（物件包裹）
{ tabs: [{ id, title, conversationId }, ...], activeTabId: "xxx" }
```

`restoreOpenTabs()` 需偵測格式：若 `JSON.parse` 結果是 Array → 舊格式；若是 Object with `.tabs` → 新格式。

**替代方案**：存在獨立的 localStorage key。但這增加了兩個 key 的同步問題，不如放在同一處。

**替代方案**：僅存在後端 settings API。但 localStorage 是即時的，後端 API 有延遲，首次載入需等待。

### D2: Tab 刪除對話的 UI 入口

**選擇**：右鍵選單（context menu），包含「刪除對話」和「關閉 tab」兩個選項。手機端用 long-press 觸發。

**實作方式**：
- 在 `TabBar.tsx` 新增 `onContextMenu` handler（桌面端）
- 新增 `onTouchStart`/`onTouchEnd` handler 搭配 500ms timer（手機端）
- Context menu 為簡單的絕對定位 `<div>`，使用 portal 或直接在 TabBar 中渲染
- 點擊外部或 Escape 鍵關閉 menu

**替代方案**：在 hover X 按鈕旁新增垃圾桶 icon。但 tab 空間有限（特別是手機端），兩個 icon 太擁擠。

**替代方案**：Swipe gesture（手機端向上滑刪除）。實作複雜度高，且與拖曳排序衝突。

### D3: 刪除確認機制

**選擇**：使用 `window.confirm()` 原生對話框。

**理由**：這是個人工具、單人使用，不需要精美的自定義 modal。原生 confirm 簡單可靠。

**替代方案**：自定義 modal 元件。過度工程，不值得為單人工具投入。

### D4: SDK 日誌層級調整

**選擇**：重構 `getInstalledVersion()` 為先嘗試 Strategy 1，失敗時記錄 `debug` 而非 `warn`，再嘗試 Strategy 2。僅當兩者都失敗時使用 `warn`。

**替代方案**：完全移除 Strategy 1。但未來 SDK 可能修復 exports 欄位，屆時 Strategy 1 就會正常運作。

**替代方案**：用 try-catch 靜默忽略 Strategy 1 失敗。但保留 debug 日誌有助於未來除錯。

## Risks / Trade-offs

**[localStorage 格式遷移]** → `restoreOpenTabs()` 需同時支援舊格式（純陣列）和新格式（物件包裹）。透過 `Array.isArray()` 偵測，風險低。

**[右鍵選單與拖曳排序衝突]** → `onContextMenu` 和拖曳事件可能互相干擾。透過 `wasDraggingRef` flag 判斷，拖曳中不顯示選單。

**[刪除後 conversation list 刷新]** → 刪除對話後需要刷新 conversations state。透過 `loadConversations()` 重新載入，確保歷史下拉選單同步。

**[SDK log level 變更]** → 降級為 debug 後，生產環境預設不會看到此日誌。這正是期望的行為——fallback 成功不需要引起注意。

## Open Questions

（目前無未解決問題）
