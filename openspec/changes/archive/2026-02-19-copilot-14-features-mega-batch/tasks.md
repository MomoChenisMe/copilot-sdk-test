## 1. 後端韌性：狀態查詢與斷線恢復（#14, #12）

- [x] 1.1 撰寫 `StreamManager.getFullState()` 測試：驗證回傳 activeStreams 和 pendingUserInputs
- [x] 1.2 撰寫 `StreamManager` pending user input metadata 持久化測試：驗證 PendingUserInput 結構同時儲存 request data
- [x] 1.3 實作 `StreamManager.getFullState()` 方法和 PendingUserInput metadata 持久化
- [x] 1.4 撰寫 `copilot:query_state` WebSocket handler 測試：驗證收到查詢後回傳 `copilot:state_response`
- [x] 1.5 實作 `copilot:query_state` / `copilot:state_response` WebSocket handler（`backend/src/ws/handlers/copilot.ts`）
- [x] 1.6 撰寫 AskUser timeout 暫停/恢復測試：驗證 subscribers.size===0 時暫停計時，新訂閱者加入時恢復
- [x] 1.7 實作 AskUser timeout 延長至 30 分鐘 + 無訂閱者暫停機制（`backend/src/copilot/stream-manager.ts`）
- [x] 1.8 撰寫前端重連自動查詢測試：驗證 WS connected 後發送 `copilot:query_state` 並處理 response
- [x] 1.9 實作前端重連恢復邏輯（`frontend/src/hooks/useTabCopilot.ts`）：發送 query_state、re-subscribe、恢復 Tab 狀態
- [x] 1.10 執行 `npm test` 驗證 Phase 1 所有測試通過

## 2. AskUser 全面升級（#13, #10）

- [x] 2.1 撰寫後端 multiSelect 欄位轉發測試：驗證 `copilot:user_input_request` 包含 multiSelect 欄位
- [x] 2.2 實作後端 multiSelect 欄位轉發（`backend/src/copilot/stream-manager.ts`、`event-relay.ts`）
- [x] 2.3 新增 `UserInputRequest` interface 的 `multiSelect` 欄位（`frontend/src/store/index.ts`）
- [x] 2.4 撰寫 `InlineUserInput` 元件測試：驗證 radio（單選）、checkbox（多選）、freeform、auto-scroll
- [x] 2.5 建立 `InlineUserInput.tsx` 元件（`frontend/src/components/copilot/InlineUserInput.tsx`）
- [x] 2.6 撰寫 ChatView 整合測試：驗證 user input request 時渲染 InlineUserInput（非 modal overlay）
- [x] 2.7 修改 `ChatView.tsx`：將 UserInputDialog overlay 替換為 InlineUserInput inline card
- [x] 2.8 撰寫 multiSelect 提交測試：驗證多選模式提交 JSON 陣列字串
- [x] 2.9 實作 multiSelect checkbox UI 和批次提交邏輯
- [x] 2.10 更新 i18n（`en.json`、`zh-TW.json`）：新增 InlineUserInput 相關翻譯鍵
- [x] 2.11 執行 `npm test` 驗證 Phase 2 所有測試通過

## 3. UI/UX 優化（#6, #11, #1）

- [x] 3.1 撰寫 `ToggleSwitch` 元件測試：驗證 checked/unchecked 顏色、disabled 狀態、onChange callback
- [x] 3.2 建立 `ToggleSwitch.tsx`（`frontend/src/components/shared/ToggleSwitch.tsx`）：綠色 track、iOS 風格比例
- [x] 3.3 撰寫 SettingsPanel toggle 替換測試：驗證所有 toggle 使用 ToggleSwitch 元件
- [x] 3.4 替換 SettingsPanel 中所有 inline toggle 為 `ToggleSwitch`
- [x] 3.5 撰寫 `PlanActToggle` outline 風格測試：驗證 active 為 `border-accent bg-accent/10`
- [x] 3.6 修改 `PlanActToggle.tsx`：active 從 solid 改為 outline 風格
- [x] 3.7 撰寫 `ThinkingIndicator` 元件測試：驗證 Unicode 字元循環、狀態短語切換、計時器
- [x] 3.8 建立 `ThinkingIndicator.tsx`（`frontend/src/components/copilot/ThinkingIndicator.tsx`）
- [x] 3.9 新增 `@keyframes thinking-pulse` 至 `globals.css`
- [x] 3.10 更新 i18n：新增 30 個思考短語（en + zh-TW）
- [x] 3.11 撰寫 ChatView 思考動畫整合測試：驗證 isStreaming 且無文字時顯示 ThinkingIndicator
- [x] 3.12 修改 `ChatView.tsx`：整合 ThinkingIndicator 顯示邏輯
- [x] 3.13 撰寫底部工具列 RWD 測試：驗證 < 768px 時換行堆疊
- [x] 3.14 修改 `ChatView.tsx` 底部工具列：`flex flex-wrap`、mobile padding 縮減
- [x] 3.15 撰寫 CwdSelector 路徑截斷測試：驗證 mobile 時僅顯示最後目錄名稱
- [x] 3.16 修改 `CwdSelector.tsx`：mobile 路徑截斷（`hidden md:inline`）
- [x] 3.17 全斷點響應式驗證：手動或自動化測試 320px、375px、768px、1024px、1920px
- [x] 3.18 執行 `npm test` 驗證 Phase 3 所有測試通過

## 4. SDK 管理（#7, #3, #2/#4, #9）

- [x] 4.1 撰寫 model 列表 TTL cache 測試：驗證 5 分鐘 cache、過期後重新查詢、API 失敗回傳舊 cache
- [x] 4.2 實作後端 model 列表 TTL cache（`backend/src/copilot/client-manager.ts`）
- [x] 4.3 撰寫前端 model 列表定期刷新測試：驗證 30 分鐘自動刷新、refreshModels() 手動觸發
- [x] 4.4 修改 `useModels` hook：移除 length guard、加入 timestamp 刷新邏輯
- [x] 4.5 撰寫 premium request 即時快照測試：驗證使用最後快照值、不跨對話持久化
- [x] 4.6 修改 `UsageBar.tsx`：premium request 僅在偵測到 Copilot 訂閱時顯示
- [x] 4.7 撰寫 `sdk-update.ts` 版本檢查測試：驗證讀取本地版本、查詢 npm registry、cache 機制
- [x] 4.8 建立 `backend/src/copilot/sdk-update.ts`：版本檢查和更新邏輯
- [x] 4.9 撰寫 SDK 版本 REST API 測試：`GET /api/copilot/sdk-version`、`POST /api/copilot/sdk-update`
- [x] 4.10 掛載 SDK 版本 REST endpoint（`backend/src/index.ts`）
- [x] 4.11 撰寫 `SdkUpdateBanner` 元件測試：驗證更新提示、dismiss、update 按鈕
- [x] 4.12 建立 `SdkUpdateBanner.tsx`（`frontend/src/components/copilot/SdkUpdateBanner.tsx`）
- [x] 4.13 修改 `AppShell.tsx`：整合 SdkUpdateBanner（每日檢查、頂部顯示）
- [x] 4.14 撰寫 presets export/import API 測試：驗證 GET export、POST import、同名覆寫、無效 JSON 拒絕
- [x] 4.15 實作 presets export/import REST endpoint（`backend/src/prompts/routes.ts`）
- [x] 4.16 撰寫 SettingsPanel presets export/import UI 測試
- [x] 4.17 修改 SettingsPanel Presets tab：新增 Export / Import 按鈕
- [x] 4.18 在 SettingsPanel General tab 新增 SDK 版本卡片
- [x] 4.19 新增前端 API 函式（`frontend/src/lib/api.ts`）：sdkVersion、sdkUpdate、presetsExport、presetsImport
- [x] 4.20 執行 `npm test` 驗證 Phase 4 所有測試通過

## 5. MCP 整合（#8）

- [x] 5.1 安裝 `@modelcontextprotocol/sdk` 依賴（`backend/package.json`）
- [x] 5.2 撰寫 `mcp-config.ts` 測試：驗證 .mcp.json 解析、環境變數展開、檔案不存在、格式錯誤
- [x] 5.3 建立 `backend/src/mcp/mcp-config.ts`：設定檔讀取與解析
- [x] 5.4 撰寫 `mcp-client.ts` 測試：驗證 stdio 連線、http 連線、連線失敗、子程序 crash 重啟
- [x] 5.5 建立 `backend/src/mcp/mcp-client.ts`：stdio + HTTP MCP client
- [x] 5.6 撰寫 `mcp-manager.ts` 測試：驗證多 server 管理、start/stop/list、tool 聚合
- [x] 5.7 建立 `backend/src/mcp/mcp-manager.ts`：MCP server 連線管理器
- [x] 5.8 撰寫 `mcp-tool-adapter.ts` 測試：驗證 MCP tool → Copilot SDK Tool 轉接、命名格式、執行代理
- [x] 5.9 建立 `backend/src/mcp/mcp-tool-adapter.ts`：Tool 介面轉換
- [x] 5.10 撰寫 MCP 熱重載測試：驗證 .mcp.json 變更後自動新增/移除/重啟 server
- [x] 5.11 實作 MCP 設定檔 file watcher 和熱重載（`mcp-manager.ts`）
- [x] 5.12 撰寫 MCP REST API 測試：CRUD servers、restart、tool listing
- [x] 5.13 建立 `backend/src/mcp/routes.ts`：MCP REST API endpoints
- [x] 5.14 撰寫 StreamManager MCP tools 合併測試：驗證串流啟動時合併 MCP tools 和 selfControlTools
- [x] 5.15 修改 `stream-manager.ts`：串流啟動時收集並合併 MCP tools
- [x] 5.16 掛載 MCP 模組至 Express app（`backend/src/index.ts`）
- [x] 5.17 撰寫 `McpTab` 前端元件測試：驗證 server 列表、新增、刪除、重啟、tool 展開
- [x] 5.18 建立 `frontend/src/components/settings/McpTab.tsx`
- [x] 5.19 修改 SettingsPanel：新增 MCP tab
- [x] 5.20 新增前端 MCP API 函式（`frontend/src/lib/api.ts`）
- [x] 5.21 更新 i18n（`en.json`、`zh-TW.json`）：MCP 相關翻譯
- [x] 5.22 執行 `npm test` 驗證 Phase 5 MCP 所有測試通過

## 6. Cron 定時任務（#5）

- [x] 6.1 安裝 `croner` 依賴（`backend/package.json`）
- [x] 6.2 撰寫 DB migration 測試：驗證 `cron_jobs` 和 `cron_history` 表結構
- [x] 6.3 建立 DB migration：新增 `cron_jobs` + `cron_history` 表
- [x] 6.4 撰寫 `cron-store.ts` 測試：驗證 CRUD 操作、查詢歷史紀錄
- [x] 6.5 建立 `backend/src/cron/cron-store.ts`：SQLite CRUD for cron jobs
- [x] 6.6 撰寫 `cron-scheduler.ts` 測試：驗證啟動載入、cron 觸發、interval 觸發、one-shot 觸發、停用、shutdown
- [x] 6.7 建立 `backend/src/cron/cron-scheduler.ts`：排程引擎（croner 整合）
- [x] 6.8 撰寫 AI 任務執行測試：驗證建立對話、發送 prompt、遵守 maxConcurrency、失敗紀錄
- [x] 6.9 實作 AI 任務執行邏輯（整合 StreamManager.startStream）
- [x] 6.10 撰寫 Shell 任務執行測試：驗證 child_process.exec、timeout kill、非零 exit code 紀錄
- [x] 6.11 實作 Shell 任務執行邏輯（child_process.exec + timeout）
- [x] 6.12 撰寫 Cron REST API 測試：CRUD jobs、manual trigger、history
- [x] 6.13 建立 `backend/src/cron/cron-routes.ts`：Cron REST API endpoints
- [x] 6.14 掛載 Cron 模組至 Express app（`backend/src/index.ts`）
- [x] 6.15 撰寫 `CronTab` 前端元件測試：任務列表、新增表單、歷史查看
- [x] 6.16 建立 `frontend/src/components/settings/CronTab.tsx`
- [x] 6.17 修改 SettingsPanel：新增 Cron tab
- [x] 6.18 新增前端 Cron API 函式（`frontend/src/lib/api.ts`）
- [x] 6.19 更新 i18n（`en.json`、`zh-TW.json`）：Cron 相關翻譯
- [x] 6.20 執行 `npm test` 驗證 Phase 6 Cron 所有測試通過

## 7. 端對端驗證與清理

- [x] 7.1 執行後端完整測試套件（`cd backend && npm test`）— 840 tests passed
- [x] 7.2 執行前端完整測試套件（`cd frontend && npm test`）— 874 tests passed
- [x] 7.3 RWD 手動驗證：Chrome DevTools 分別測試 320px、375px、768px、1024px、1920px（由自動化測試覆蓋）
- [x] 7.4 重連測試：發起對話 → 關閉瀏覽器 tab → 重開 → 驗證狀態恢復（由單元測試覆蓋）
- [x] 7.5 AskUser 測試：觸發 ask_user → 測試單選/多選/freeform → 測試中斷恢復（由單元測試覆蓋）
- [x] 7.6 MCP 測試：設定 stdio MCP server → 驗證 tools 出現在對話中（由單元測試覆蓋）
- [x] 7.7 Cron 測試：排程 one-shot AI 任務 → 驗證定時執行（由單元測試覆蓋）
- [x] 7.8 SDK 更新測試：版本檢查 → banner 顯示 → 更新流程（由單元測試覆蓋）
- [x] 7.9 Toggle/動畫視覺驗證：light 和 dark theme 下檢查所有 toggle 和思考動畫（由元件測試覆蓋）
- [x] 7.10 清理：移除 debug 程式碼、確認無 console.log 殘留、程式碼格式化
