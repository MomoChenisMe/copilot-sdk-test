## Why

目前系統在多個面向存在體驗瓶頸：@ 檔案選擇只能逐層瀏覽目錄、code block 缺少 padding、cron jobs 獨立於對話之外不直覺、MCP 設定重啟後遺失、設定頁分類混亂、手機版 RWD 不佳（tab 佈局擁擠、工具列佔空間過大）、切換 tab 時輸入框不自動 focus。這 9 項改進將大幅提升桌面與手機端的操作效率與視覺一致性。

## 目標使用者與情境

個人開發者透過手機瀏覽器遠端操控 AI 開發工具。主要情境：
- 手機上快速切換對話、啟動 cron 排程監控任務
- 桌面上使用 @ 快速定位專案檔案作為 AI context
- 設定 MCP 工具後希望重啟不遺失

## 非目標 (Non-Goals)

- 不重寫現有 copilot agent 核心邏輯
- 不實作多使用者或權限系統
- 不新增 cron 的 shell 類型執行（僅保留 AI prompt 類型）
- 不新增桌面版 drawer（drawer 僅用於手機 RWD）
- 不移除舊 cron 資料表（保留向後相容，但不再使用）

## What Changes

- **@ 檔案搜尋**：新增全專案模糊搜尋 API + AtFileMenu 雙模式（模糊搜尋 + 目錄瀏覽）
- **Code block padding**：修正 CSS layer 優先權問題，讓 Tailwind utilities 的 `px-4 py-3` 正確套用
- **Cron 重設計**：將 cron 從獨立系統改為內嵌在每個 session 對話中的功能，透過 `/cron` slash command 或工具列按鈕設定，觸發時自動在對話中發送提示詞並取得 AI 回應
- **Cron UI 簡化**：CronPage 改為只顯示有 cron 的對話清單，tab/popover 加入 clock icon 標示
- **MCP 持久化**：MCP server 設定寫回 `.mcp.json` 檔案，重啟後自動載入
- **設定頁重組**：8 個平行 tab 改為 4 組分類（一般 / 提示詞 / 記憶 / 工具），API 金鑰重命名為 WebSearch
- **手機 Tab 抽屜**：手機版 TabBar 改為抽屜式側邊欄，hamburger 按鈕觸發
- **手機工具列彈出選單**：手機版底部工具列（ModelSelector/CwdSelector/PlanActToggle）收進彈出選單
- **Auto-focus**：每次切換或新增 tab 都自動 focus 到輸入框

## Capabilities

### New Capabilities

- `fuzzy-file-search`: 後端全專案遞迴搜尋 API + 前端模糊匹配，取代逐層目錄瀏覽
- `mcp-persistence`: MCP server 設定檔讀寫持久化機制
- `conversation-cron`: 對話內嵌 cron 排程功能（DB schema、排程器、slash command、設定面板）
- `mobile-drawer`: 手機版抽屜式側邊欄元件（tab 列表 + 對話搜尋）
- `mobile-toolbar-popup`: 手機版底部工具列彈出選單元件

### Modified Capabilities

- `at-file-context`: 新增模糊搜尋模式，保留原有目錄瀏覽作為 fallback
- `chat-ui`: 修正 code block padding、auto-focus 行為擴展到所有 tab 切換
- `settings-full-page`: 設定頁 tab 改為分組結構、API 金鑰重命名為 WebSearch
- `app-layout`: 手機版 TabBar 隱藏改用 drawer、TopBar 新增 hamburger 按鈕
- `i18n`: 新增設定群組標籤、cron 相關翻譯、WebSearch 命名

## Impact

**後端新增/修改：**
- `backend/src/directory/routes.ts` — 新增 `GET /api/directories/search`
- `backend/src/mcp/mcp-config.ts` — 新增 `addToMcpConfig`, `removeFromMcpConfig`
- `backend/src/mcp/routes.ts` — 持久化邏輯
- `backend/src/conversation/db.ts` — ALTER TABLE 新增 cron 欄位
- `backend/src/conversation/types.ts`, `repository.ts`, `routes.ts` — cron 欄位支援
- `backend/src/cron/conversation-cron-scheduler.ts` — 新檔案

**前端新增/修改：**
- `frontend/src/components/shared/AtFileMenu.tsx` — 雙模式改寫
- `frontend/src/styles/globals.css` — CSS layer 修正
- `frontend/src/components/copilot/ChatView.tsx` — auto-focus、cron、mobile toolbar
- `frontend/src/components/copilot/CronConfigPanel.tsx` — 新檔案
- `frontend/src/components/copilot/MobileToolbarPopup.tsx` — 新檔案
- `frontend/src/components/layout/MobileDrawer.tsx` — 新檔案
- `frontend/src/components/layout/TopBar.tsx` — hamburger 按鈕
- `frontend/src/components/layout/AppShell.tsx` — drawer 整合
- `frontend/src/components/settings/SettingsPanel.tsx` — 分組結構
- `frontend/src/store/index.ts` — TabState 新增 cron 欄位
- `frontend/src/locales/en.json`, `zh-TW.json` — 新翻譯 key

**Dependencies：** 無新增外部 dependency（croner 已存在）
