## 1. Schema 遷移 + CronStore 擴充

- [x] 1.1 撰寫 cron_history 新欄位遷移測試（驗證 prompt、config_snapshot、turn_segments、tool_records、reasoning、usage、content 欄位存在）
- [x] 1.2 實作 db.ts migrate() 新增 ALTER TABLE ADD COLUMN 遷移（try/catch 包裝）
- [x] 1.3 撰寫 CronHistory interface 擴充和 mapHistory JSON 反序列化測試
- [x] 1.4 實作 CronHistory interface 擴充、AddHistoryInput 擴充、mapHistory() 更新
- [x] 1.5 撰寫 addHistory() 新欄位序列化測試（含完整資料和僅基本資料場景）
- [x] 1.6 實作 addHistory() JSON.stringify 序列化邏輯
- [x] 1.7 撰寫 updateHistory(id, updates) 測試（running→success、running→error）
- [x] 1.8 實作 updateHistory() 方法
- [x] 1.9 撰寫 getHistoryById(id) 測試（存在/不存在）
- [x] 1.10 實作 getHistoryById() 公開方法
- [x] 1.11 撰寫 getAllRecentHistory(limit) 測試（跨 job 查詢、含 jobName、排序）
- [x] 1.12 實作 getAllRecentHistory() 方法（JOIN cron_jobs）
- [x] 1.13 撰寫 getUnreadCount(since) 和 getFailedCount(since) 測試
- [x] 1.14 實作 getUnreadCount() 和 getFailedCount() 方法
- [x] 1.15 撰寫 CronJobConfig interface 和型別定義測試
- [x] 1.16 定義 CronJobConfig 和 CronToolConfig 結構化 interfaces
- [x] 1.17 驗證：執行所有 cron store 測試通過

## 2. BackgroundSessionRunner

- [x] 2.1 撰寫 BackgroundSessionRunner 成功執行測試（mock SessionManager + EventRelay）
- [x] 2.2 撰寫 BackgroundSessionRunner tool call 收集測試
- [x] 2.3 撰寫 BackgroundSessionRunner timeout 測試
- [x] 2.4 撰寫 BackgroundSessionRunner session 建立失敗測試
- [x] 2.5 撰寫 BackgroundSessionRunner permission 自動核准測試
- [x] 2.6 實作 BackgroundSessionRunner 類別（background-session-runner.ts）
- [x] 2.7 驗證：所有 BackgroundSessionRunner 測試通過

## 3. CronToolAssembler

- [x] 3.1 撰寫 assembleCronTools 全部關閉測試
- [x] 3.2 撰寫 assembleCronTools 選擇性啟用測試
- [x] 3.3 撰寫 assembleCronTools MCP per-server 過濾測試
- [x] 3.4 撰寫 assembleCronTools skills + disabledSkills 測試
- [x] 3.5 實作 cron-tool-assembler.ts
- [x] 3.6 驗證：所有 CronToolAssembler 測試通過

## 4. AI Executor 重寫

- [x] 4.1 撰寫新 createAiTaskExecutor 測試（接收 BackgroundSessionRunner + CronToolAssemblerDeps）
- [x] 4.2 撰寫 AI executor 不建立 conversation 測試
- [x] 4.3 撰寫 AI executor 回傳 executionData 測試
- [x] 4.4 重寫 cron-executors.ts 的 createAiTaskExecutor
- [x] 4.5 驗證：所有 executor 測試通過

## 5. CronScheduler 擴充

- [x] 5.1 撰寫 triggerJob 建立 running 紀錄測試
- [x] 5.2 撰寫 triggerJob 更新完整歷史紀錄測試（含 turnSegments、toolRecords、usage）
- [x] 5.3 撰寫 triggerJob 廣播 WebSocket 通知測試
- [x] 5.4 更新 CronScheduler：CronExecutors interface 更新、constructor 新增 broadcastFn、triggerJob 重寫
- [x] 5.5 驗證：所有 scheduler 測試通過

## 6. WebSocket Cron Handler

- [x] 6.1 撰寫 cron handler subscribe/unsubscribe 測試
- [x] 6.2 撰寫 cron handler broadcast 到多訂閱者測試
- [x] 6.3 撰寫 cron handler onDisconnect 清理測試
- [x] 6.4 實作 ws/handlers/cron.ts
- [x] 6.5 驗證：所有 cron handler 測試通過

## 7. 新 API 端點

- [x] 7.1 撰寫 GET /history/recent 路由測試
- [x] 7.2 撰寫 GET /history/unread-count 路由測試
- [x] 7.3 撰寫 POST /history/:historyId/open-conversation 路由測試（成功 + 404）
- [x] 7.4 實作 cron-routes.ts 新增 3 個端點
- [x] 7.5 驗證：所有 routes 測試通過

## 8. Backend 整合（index.ts）

- [x] 8.1 更新 index.ts：建立 BackgroundSessionRunner、CronToolAssemblerDeps
- [x] 8.2 更新 index.ts：替換 CronScheduler 建構參數（新 executor + broadcastFn）
- [x] 8.3 更新 index.ts：註冊 cron WS handler
- [x] 8.4 更新 index.ts：createCronRoutes 傳入 repo
- [x] 8.5 更新 graceful shutdown 加入 BackgroundSessionRunner cleanup
- [x] 8.6 驗證：backend 編譯成功、伺服器可啟動、既有 shell cron job 不受影響

## 9. Frontend — Store 擴充

- [x] 9.1 擴充 TabState.mode 為 `'copilot' | 'terminal' | 'cron'`
- [x] 9.2 擴充 setTabMode 型別
- [x] 9.3 新增 toasts 狀態（ToastItem[]、addToast、removeToast）
- [x] 9.4 新增 cron badge 狀態（cronUnreadCount、cronFailedCount、setCronBadge）
- [x] 9.5 驗證：TypeScript 編譯通過

## 10. Frontend — Toast 通知系統

- [x] 10.1 建立 ToastContainer.tsx 元件（fixed top-right、success/error/info、自動消失、可點擊）
- [x] 10.2 在 AppShell 掛載 `<ToastContainer />`
- [x] 10.3 驗證：手動呼叫 addToast 可正確顯示和消失

## 11. Frontend — API 擴充

- [x] 11.1 更新 CronHistory type 加入新欄位
- [x] 11.2 新增 cronApi.getRecentHistory(limit)
- [x] 11.3 新增 cronApi.getUnreadCount(since)
- [x] 11.4 新增 cronApi.openAsConversation(historyId)
- [x] 11.5 驗證：TypeScript 編譯通過

## 12. Frontend — CronPage 元件群

- [x] 12.1 建立 CronPage.tsx 主頁面容器（job 管理 + 歷史兩區塊）
- [x] 12.2 建立 CronJobList.tsx（job 列表、toggle 啟用、trigger、刪除確認）
- [x] 12.3 建立 CronJobForm.tsx（建立/編輯表單，含 AI/shell 切換）
- [x] 12.4 建立 CronJobToolConfig.tsx（model 選擇器 + 6 個 tool toggle + MCP per-server + disabled skills）
- [x] 12.5 建立 CronHistoryList.tsx（全域歷史、狀態 badge、output 預覽、開啟為對話按鈕）
- [x] 12.6 建立 CronHistoryDetail.tsx（展開詳情：content、turn segments、tool records、usage）
- [x] 12.7 驗證：CronPage 元件可正常渲染

## 13. Frontend — AppShell 整合 + 導航

- [x] 13.1 AppShell 根據 activeTab.mode 條件渲染（cron → CronPage / 其他 → ChatView）
- [x] 13.2 新增 handleOpenCronTab（開啟/切換 cron tab，確保只有一個）
- [x] 13.3 新增 handleOpenCronAsConversation(historyId)（呼叫 API → 開新 copilot tab）
- [x] 13.4 TabBar 新增永駐 Cron icon 按鈕（lucide Clock）+ badge 顯示
- [x] 13.5 驗證：點擊 Cron icon 可開啟 CronPage、badge 正確顯示

## 14. Frontend — WebSocket Cron 通知 Hook

- [x] 14.1 建立 useCronNotifications.ts hook（subscribe、監聽 completed/failed、觸發 toast + badge）
- [x] 14.2 在 AppShell 呼叫 useCronNotifications
- [x] 14.3 驗證：收到 WS 訊息後 toast 出現且 badge 更新

## 15. Frontend — 清理

- [x] 15.1 從 SettingsPanel.tsx TABS 陣列移除 cron entry
- [x] 15.2 驗證：Settings 不再顯示 Cron tab

## 16. 端到端驗證

- [x] 16.1 建立 AI cron job（含 tool 配置），確認不產生 conversation
- [x] 16.2 確認 cron_history 包含完整 segments/tools/usage
- [x] 16.3 確認 WebSocket 收到 cron:job_completed/failed
- [x] 16.4 確認 Toast 通知和 Badge 正確顯示
- [x] 16.5 確認從歷史紀錄「開啟為對話」可建立新 conversation 並顯示摘要
- [x] 16.6 確認既有 shell cron job 行為不受影響（regression）
- [x] 16.7 執行全部 backend 測試套件通過
