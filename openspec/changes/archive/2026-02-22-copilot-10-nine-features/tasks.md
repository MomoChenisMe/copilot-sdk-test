## 1. Auto-Focus 輸入框 (Feature 9)

- [x] 1.1 撰寫 ChatView auto-focus 測試：驗證切換到有訊息的 tab 時 inputRef.focus 被呼叫
- [x] 1.2 修改 `frontend/src/components/copilot/ChatView.tsx` — 移除 `messages.length === 0` 條件，改為只依賴 `tabId` 變更觸發 focus
- [x] 1.3 驗證：手動切換有訊息的 tab → 確認輸入框自動 focus

## 2. Code Block Padding (Feature 2)

- [x] 2.1 撰寫 Markdown code block padding 測試：驗證 `<pre>` 元素有 `px-4 py-3` 樣式
- [x] 2.2 修改 `frontend/src/styles/globals.css` — 將 `.prose pre` CSS reset 從 unlayered 搬入 `@layer base` 區塊
- [x] 2.3 驗證：渲染含 fenced code block 的 markdown → 確認程式碼文字有 16px 左右內距

## 3. 模糊檔案搜尋 — 後端 API (Feature 1)

- [x] 3.1 撰寫 `GET /api/directories/search` 測試：基本搜尋、排序、depth 限制、ignore 目錄、空 query、不存在的 root
- [x] 3.2 實作 `backend/src/directory/routes.ts` — 新增 search endpoint（遞迴 walk + 評分 + 排序）
- [x] 3.3 執行測試確認通過

## 4. 模糊檔案搜尋 — 前端 (Feature 1)

- [x] 4.1 新增 `directoryApi.search()` 方法到 `frontend/src/lib/api.ts`
- [x] 4.2 撰寫 AtFileMenu 雙模式測試：模糊搜尋模式（filter 無 `/`）、目錄瀏覽模式（filter 含 `/`）、空 filter 預設目錄瀏覽
- [x] 4.3 改寫 `frontend/src/components/shared/AtFileMenu.tsx` — 實作雙模式切換、debounce 200ms、搜尋結果扁平列表
- [x] 4.4 驗證：輸入 `@pack` 顯示模糊結果；輸入 `@src/` 切換為目錄瀏覽

## 5. MCP 設定持久化 (Feature 5)

- [x] 5.1 撰寫 `addToMcpConfig` / `removeFromMcpConfig` 單元測試（讀寫 JSON、去重、檔案不存在、格式錯誤）
- [x] 5.2 實作 `backend/src/mcp/mcp-config.ts` — 新增 `addToMcpConfig` 和 `removeFromMcpConfig` 函式
- [x] 5.3 撰寫 MCP routes 整合測試：POST 後驗證檔案寫入、DELETE 後驗證檔案移除
- [x] 5.4 修改 `backend/src/mcp/routes.ts` — `createMcpRoutes` 接收 `configPath` 參數，POST/DELETE 呼叫持久化函式
- [x] 5.5 修改 `backend/src/index.ts` — 傳入 `mcpConfigPath` 到 `createMcpRoutes`
- [x] 5.6 驗證：新增 MCP server → 重啟後端 → server 仍在列表

## 6. Cron 重設計 — 資料庫與 API (Feature 3)

- [x] 6.1 撰寫 conversation DB migration 測試：驗證新增 cron 欄位
- [x] 6.2 修改 `backend/src/conversation/db.ts` — 新增 cron 欄位 ALTER TABLE migration
- [x] 6.3 修改 `backend/src/conversation/types.ts` — Conversation interface 加入 cron 欄位
- [x] 6.4 修改 `backend/src/conversation/repository.ts` — mapConversation 映射新欄位、update 支援 cron、新增 listCronEnabled
- [x] 6.5 撰寫 `PUT /api/conversations/:id/cron` 路由測試
- [x] 6.6 修改 `backend/src/conversation/routes.ts` — 新增 cron endpoint + `?cronEnabled=true` 過濾
- [x] 6.7 執行所有 conversation 相關測試確認通過

## 7. Cron 重設計 — 排程器 (Feature 3)

- [x] 7.1 撰寫 ConversationCronScheduler 單元測試：register/unregister/trigger/loadAll
- [x] 7.2 建立 `backend/src/cron/conversation-cron-scheduler.ts` — 實作 ConversationCronScheduler 類別
- [x] 7.3 在 `backend/src/index.ts` 初始化 ConversationCronScheduler，啟動時 loadAll
- [x] 7.4 撰寫整合測試：cron 觸發 → 對話新增訊息 → WebSocket 廣播
- [x] 7.5 執行所有 cron 相關測試確認通過

## 8. Cron 重設計 — 前端 (Feature 3 + 4)

- [x] 8.1 修改 `frontend/src/store/index.ts` — TabState 加入 `cronConfigOpen`，新增 `setTabCronConfigOpen` action
- [x] 8.2 建立 `frontend/src/components/copilot/CronConfigPanel.tsx` — 設定面板元件（toggle、schedule type、value、prompt、save/cancel）
- [x] 8.3 修改 `frontend/src/components/copilot/ChatView.tsx` — 新增 `/cron` slash command + Clock 工具列按鈕 + CronConfigPanel 整合
- [x] 8.4 改寫 `frontend/src/components/cron/CronPage.tsx` — 簡化為 cron 對話清單
- [x] 8.5 修改 `frontend/src/lib/api.ts` — 新增 `conversationApi.updateCron()` 和 `conversationApi.listCronEnabled()`
- [x] 8.6 修改 `frontend/src/components/layout/TabBar.tsx` — cron 對話顯示 Clock icon
- [x] 8.7 修改 `frontend/src/components/layout/ConversationPopover.tsx` — cron 對話顯示 Clock icon
- [x] 8.8 修改 `frontend/src/components/layout/AppShell.tsx` — conversations prop 傳遞 cronEnabled
- [x] 8.9 驗證：`/cron` 開啟面板、Clock 按鈕開啟面板、儲存成功、CronPage 顯示清單、icon 標示

## 9. 設定頁重設計 (Feature 6)

- [x] 9.1 修改 `frontend/src/locales/en.json` — 新增 `settings.groups.*` + `settings.tabs.webSearch` + `cron.*` + `slashCommand.cronDesc`
- [x] 9.2 修改 `frontend/src/locales/zh-TW.json` — 新增對應中文翻譯
- [x] 9.3 撰寫 SettingsPanel 分組渲染測試：驗證 4 個群組顯示正確、WebSearch 命名
- [x] 9.4 修改 `frontend/src/components/settings/SettingsPanel.tsx` — 平面 TABS 改為 TAB_GROUPS 巢狀結構 + desktop sidebar 分組 + mobile 分隔符
- [x] 9.5 驗證：開啟設定 → 確認分組顯示 + "WebSearch" 命名

## 10. 手機 Tab 抽屜側邊欄 (Feature 7)

- [x] 10.1 建立 `frontend/src/components/layout/MobileDrawer.tsx` — 抽屜元件（overlay + slide-in + backdrop close）
- [x] 10.2 修改 `frontend/src/components/layout/TopBar.tsx` — 新增 `onMenuClick` prop + hamburger Menu icon（md:hidden）
- [x] 10.3 修改 `frontend/src/components/layout/AppShell.tsx` — 新增 drawerOpen state、TabBar 包 `hidden md:block`、MobileDrawer 整合、TopBar 傳入 onMenuClick
- [x] 10.4 驗證：手機寬度 → TabBar 隱藏 → hamburger 可見 → 開啟抽屜 → 切換 tab

## 11. 手機工具列彈出選單 (Feature 8)

- [x] 11.1 建立 `frontend/src/components/copilot/MobileToolbarPopup.tsx` — 彈出選單元件（SlidersHorizontal trigger + popup with ModelSelector/CwdSelector/PlanActToggle）
- [x] 11.2 修改 `frontend/src/components/copilot/ChatView.tsx` — 兩處 toolbar row 改為響應式：desktop `hidden md:flex` inline + mobile `md:hidden` MobileToolbarPopup
- [x] 11.3 驗證：手機寬度 → 工具列為彈出按鈕 → 點擊顯示所有工具 → 桌面版正常 inline 顯示

## 12. 最終整合驗證

- [x] 12.1 執行 `npm run build` 確認前後端編譯通過
- [x] 12.2 執行 `npm test` 確認所有測試通過
- [x] 12.3 手動測試 9 項功能的 end-to-end 流程
- [x] 12.4 清理不再使用的 cron frontend 檔案 import（CronJobForm, CronJobList, CronHistoryList, CronHistoryDetail, CronJobToolConfig, CronTab）— 確認已無外部 import，為死碼但不影響 build
