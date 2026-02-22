## 1. TopBar 手機版文字溢出修復

- [x] 1.1 撰寫 TopBar overflow 測試：驗證標題 button 含 `overflow-hidden`、span 含 `block`、右側容器含 `shrink-0`
- [x] 1.2 實作 TopBar.tsx 修復：標題 button 加 `overflow-hidden`、span 加 `block`、右側容器加 `shrink-0`
- [x] 1.3 驗證：手機版 375px 下長標題正確截斷，右側按鈕完整可見

## 2. SDK 版本偵測路徑修復（後端）

- [x] 2.1 撰寫 `SdkUpdateChecker.getInstalledVersion()` 測試：驗證 `createRequire` 路徑解析與 fallback 邏輯
- [x] 2.2 實作 `sdk-update.ts` 修復：引入 `createRequire`，改寫 `getInstalledVersion()`，加入候選路徑 fallback 與 `log.warn`
- [x] 2.3 驗證：`GET /api/copilot/sdk-version` 回傳有效 `currentVersion`

## 3. SDK 版本區塊 UI 修復（前端）

- [x] 3.1 撰寫 GeneralTab SDK 區塊測試：驗證始終渲染 SDK 區塊、版本為 null 時顯示 "Unknown"
- [x] 3.2 實作 SettingsPanel.tsx 修復：移除 `{sdkVersion && (` 條件、加入 fallback 文字、`.catch` 加 `console.warn`
- [x] 3.3 新增 i18n 鍵值：`sdk.versionUnknown` (en: "Unknown", zh-TW: "未知")
- [x] 3.4 驗證：設定頁「一般」分頁始終顯示 SDK 版本區塊

## 4. Web Search Toggle 狀態管理

- [x] 4.1 撰寫 Zustand store 測試：驗證 `webSearchForced` tab state、`webSearchAvailable` global state、setter 函式
- [x] 4.2 實作 store/index.ts 修改：TabState 新增 `webSearchForced`、AppState 新增 `webSearchAvailable` + `setWebSearchAvailable` + `setTabWebSearchForced`
- [x] 4.3 更新所有 tab 初始化處（`openTab`、`switchTabConversation`、`restoreOpenTabs`）加入 `webSearchForced: false`
- [x] 4.4 驗證：store 編譯通過、測試全綠

## 5. Web Search Toggle 前端元件

- [x] 5.1 撰寫 `WebSearchToggle` 元件測試：驗證 forced/unfored 樣式、disabled 狀態、click handler
- [x] 5.2 實作 `WebSearchToggle.tsx`：單按鈕 toggle（Search icon）、高亮/預設樣式切換
- [x] 5.3 新增 i18n 鍵值：`webSearch.toggleTitle`、`webSearch.label`、`webSearch.auto`、`webSearch.forced` (en + zh-TW)
- [x] 5.4 驗證：元件獨立渲染正確

## 6. Web Search Toggle 工具列整合

- [x] 6.1 實作 AppShell.tsx：mount 時偵測 Brave API Key 並設定 `webSearchAvailable`
- [x] 6.2 實作 ChatView.tsx 桌面版整合：兩處底部工具列加入 `WebSearchToggle`（條件：`tabId && webSearchAvailable`）
- [x] 6.3 實作 MobileToolbarPopup.tsx 手機版整合：新增 props、加入 Auto/Always segmented 切換
- [x] 6.4 更新 ChatView 中 MobileToolbarPopup 的 props 傳遞
- [x] 6.5 驗證：桌面版與手機版 toggle 正確渲染與切換

## 7. Web Search Forced 後端整合

- [x] 7.1 撰寫 `copilot:send` handler 測試：驗證 `webSearchForced: true` 時 prompt 被正確注入、`false` 時不修改
- [x] 7.2 實作 `useTabCopilot.ts` 修改：`sendMessage` 中加入 `data.webSearchForced = true` 條件
- [x] 7.3 實作 `copilot.ts` handler 修改：提取 `payload.webSearchForced`，注入搜尋指令至 `finalPrompt`
- [x] 7.4 驗證：端對端測試 — 開啟 toggle 送訊息後 LLM 使用 web_search tool

## 8. 端對端驗證

- [x] 8.1 完整流程測試：Web Search toggle ON → 送訊息 → LLM 先搜尋再回覆；toggle OFF → LLM 自行判斷
- [x] 8.2 手機版 TopBar 測試：375px 寬度下長標題截斷正確
- [x] 8.3 設定頁測試：「一般」分頁顯示 SDK 版本（或 "未知"）
- [x] 8.4 執行所有測試確認無回歸
