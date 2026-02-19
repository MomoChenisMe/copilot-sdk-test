## 1. Database Schema — Tasks 表

- [x] 1.1 撰寫 tasks 表 migration 測試（驗證 CREATE TABLE IF NOT EXISTS、欄位型別、CHECK constraint、index、ON DELETE CASCADE）
- [x] 1.2 在 `backend/src/conversation/db.ts` 的 `migrate()` 末尾新增 tasks 表和 index
- [x] 1.3 執行後端測試確認 migration 通過

## 2. TaskRepository — 資料存取層

- [x] 2.1 撰寫 `backend/tests/task/repository.test.ts` 測試（create、getById、listByConversation、update with metadata merge / addBlocks / addBlockedBy、status 過濾排除 deleted）
- [x] 2.2 新增 `backend/src/task/repository.ts` 實作 TaskRepository class（create / getById / listByConversation / update）
- [x] 2.3 執行 repository 測試確認全部通過

## 3. Task SDK Tools — AI 自訂工具

- [x] 3.1 撰寫 `backend/tests/copilot/task-tools.test.ts` 測試（task_create / task_list / task_get / task_update 四個 tool handler，含 sessionConversationMap 映射邏輯）
- [x] 3.2 新增 `backend/src/copilot/tools/task-tools.ts` 實作 `createTaskTools(taskRepo, sessionConversationMap)` 回傳 4 個 Tool
- [x] 3.3 執行 task-tools 測試確認全部通過

## 4. StreamManager — Session-Conversation 映射

- [x] 4.1 撰寫 stream-manager 測試：驗證 `sessionConversationMap` 在 session 建立時寫入映射、session 結束時清理映射
- [x] 4.2 在 `backend/src/copilot/stream-manager.ts` 新增 static `sessionConversationMap`，在 session assign 時寫入，在 stream complete/abort 時清理
- [x] 4.3 執行 stream-manager 測試確認通過

## 5. Task Tools 註冊 — 應用程式啟動整合

- [x] 5.1 在 `backend/src/index.ts` 匯入 TaskRepository 和 createTaskTools，建立實例並 push 至 selfControlTools
- [x] 5.2 執行後端編譯確認無型別錯誤

## 6. Bash Handler — onBashComplete Callback

- [x] 6.1 撰寫 bash-exec handler 測試：驗證 onBashComplete callback 在指令完成時被呼叫，含 command / accumulatedOutput / exitCode / cwd 參數；未提供 callback 時正常運作
- [x] 6.2 修改 `backend/src/ws/handlers/bash-exec.ts`：擴充 `createBashExecHandler(initialCwd?, onBashComplete?)` 簽名，累積 stdout/stderr 到 accumulatedOutput，在 `close` 事件時呼叫 callback
- [x] 6.3 執行 bash-exec 測試確認通過

## 7. Copilot Handler — Bash Context 注入

- [x] 7.1 撰寫 copilot handler 測試：驗證 `addBashContext(conversationId, context)` 存入 pendingBashContext Map；copilot:send 時正確前綴注入並清除 Map；無 pending context 時不修改 prompt
- [x] 7.2 修改 `backend/src/ws/handlers/copilot.ts`：新增 `pendingBashContext` Map、`addBashContext()` 方法、`lastConversationId` getter，在 copilot:send 中注入 bash context 前綴
- [x] 7.3 執行 copilot handler 測試確認通過

## 8. Bash-Copilot 連結 — 應用程式啟動整合

- [x] 8.1 在 `backend/src/index.ts` 修改 bash handler 建立，傳入 onBashComplete callback（截斷 10KB、呼叫 repo.addMessage、呼叫 copilotHandler.addBashContext）
- [x] 8.2 執行後端編譯確認無型別錯誤

## 9. Ask User 超時事件 — 後端

- [x] 9.1 撰寫 stream-manager 測試：驗證超時時先 broadcast `copilot:user_input_timeout` 事件再 reject Promise；正常回應時不觸發 timeout 事件
- [x] 9.2 修改 `backend/src/copilot/stream-manager.ts` 的 timeout callback：在 reject 前先 broadcast `copilot:user_input_timeout` 事件（含 requestId / conversationId / question / choices / allowFreeform）
- [x] 9.3 執行 stream-manager 測試確認通過

## 10. i18n 修復 — 翻譯檔案

- [x] 10.1 在 `frontend/src/locales/en.json` 新增缺失 key：`topBar.shortcuts`、`topBar.settings`、`userInput.skip`、`userInput.timedOut`、`userInput.dismiss`、`tasks.*`、`chat.recentConversations`、`tabBar.history`（注意：`userInput.typeResponse`、`planMode.plan`、`planMode.act`、`terminal.modeAI`、`terminal.modeBash`、`scrollToBottom.label` 已存在）
- [x] 10.2 在 `frontend/src/locales/zh-TW.json` 新增對應的繁體中文翻譯
- [x] 10.3 執行前端編譯確認 JSON 格式正確

## 11. i18n 修復 — 元件硬編碼字串

- [x] 11.1 撰寫 UserInputDialog 測試：驗證 placeholder 使用 `t('userInput.typeResponse')`
- [x] 11.2 修復 `frontend/src/components/copilot/UserInputDialog.tsx`：加入 useTranslation，替換 Line 62 硬編碼字串
- [x] 11.3 撰寫 PlanActToggle 測試：驗證按鈕文字使用 `t('planMode.plan')` / `t('planMode.act')`
- [x] 11.4 修復 `frontend/src/components/copilot/PlanActToggle.tsx`：加入 useTranslation，替換硬編碼 "Plan" / "Act"
- [x] 11.5 撰寫 CwdSelector 測試：驗證模式標籤使用 `t('terminal.modeAI')` / `t('terminal.modeBash')`
- [x] 11.6 修復 `frontend/src/components/copilot/CwdSelector.tsx`：加入 useTranslation，替換硬編碼 "AI" / "Bash"
- [x] 11.7 撰寫 ScrollToBottom 測試：驗證 aria-label 使用 `t('scrollToBottom.label')`
- [x] 11.8 修復 `frontend/src/components/copilot/ScrollToBottom.tsx`：加入 useTranslation，替換硬編碼 aria-label
- [x] 11.9 執行全部 i18n 相關前端測試確認通過

## 12. 模型選擇器持久化

- [x] 12.1 撰寫 store 測試：驗證 Zustand store 初始化時從 localStorage 讀取 `lastSelectedModel`；localStorage 不可用時 fallback 為 null
- [x] 12.2 修改 `frontend/src/store/index.ts` Line 278：用 IIFE 從 localStorage 讀取 `ai-terminal:lastSelectedModel` 初始值
- [x] 12.3 撰寫 useModels 測試：驗證 model list 載入後，已儲存但不存在的 model 被重設為第一個
- [x] 12.4 修改 `frontend/src/hooks/useModels.ts`：model list 載入後驗證 `lastSelectedModel` 有效性
- [x] 12.5 執行模型持久化相關測試確認通過

## 13. Ask User 失敗處理 — 前端 Store 與 Hook

- [x] 13.1 撰寫 store 測試：驗證 `UserInputRequest` interface 包含 `timedOut?: boolean`
- [x] 13.2 修改 `frontend/src/store/index.ts`：擴充 UserInputRequest interface 新增 `timedOut` 欄位
- [x] 13.3 撰寫 useTabCopilot 測試：驗證 `copilot:user_input_timeout` 事件正確更新 store 中的 userInputRequest（含 timedOut: true）
- [x] 13.4 修改 `frontend/src/hooks/useTabCopilot.ts`：新增 `copilot:user_input_timeout` case handler
- [x] 13.5 執行相關測試確認通過

## 14. Ask User 失敗處理 — UserInputDialog UI

- [x] 14.1 撰寫 UserInputDialog 測試：驗證 Skip 按鈕顯示與點擊行為、超時狀態 UI（黃色 banner + dismiss 按鈕）、超時時隱藏 choice/input/submit
- [x] 14.2 修改 `frontend/src/components/copilot/UserInputDialog.tsx`：新增 `onSkip` / `timedOut` / `onDismissTimeout` props，實作 Skip 按鈕和超時狀態 UI
- [x] 14.3 修改 `frontend/src/components/copilot/ChatView.tsx`：新增 `handleUserInputSkip` 和 `handleTimeoutDismiss` callback，傳遞新 props 給 UserInputDialog
- [x] 14.4 執行 UserInputDialog 和 ChatView 測試確認通過

## 15. 歷史對話選擇器 — 歡迎頁面

- [x] 15.1 撰寫 ChatView 測試：驗證歡迎頁面渲染最近 10 筆對話、每筆含 title / model badge / 相對時間、點擊呼叫 openTab、無對話時不顯示區段
- [x] 15.2 修改 `frontend/src/components/copilot/ChatView.tsx`：在歡迎頁面「開始新對話」按鈕下方新增最近對話列表區段
- [x] 15.3 執行 ChatView 測試確認通過

## 16. 歷史對話選擇器 — TabBar 下拉按鈕

- [x] 16.1 撰寫 TabBar 測試：驗證歷史下拉按鈕存在（ChevronDown 圖示）、點擊展開 ConversationPopover、選擇對話後 Popover 關閉
- [x] 16.2 修改 `frontend/src/components/layout/TabBar.tsx`：在「+」按鈕旁新增歷史下拉按鈕，重用 ConversationPopover
- [x] 16.3 執行 TabBar 測試確認通過

## 17. TaskPanel — 前端元件

- [x] 17.1 撰寫 `frontend/tests/components/copilot/TaskPanel.test.tsx` 測試：驗證渲染任務列表（pending / in_progress / completed 狀態圖示）、可折疊、in_progress 顯示 activeForm
- [x] 17.2 新增 `frontend/src/components/copilot/TaskPanel.tsx` 實作可折疊任務面板
- [x] 17.3 執行 TaskPanel 測試確認通過

## 18. 前端 Store — Tasks State

- [x] 18.1 撰寫 store 測試：驗證 TabState 包含 `tasks: TaskItem[]`、`setTabTasks` 和 `upsertTabTask` actions 正常運作
- [x] 18.2 修改 `frontend/src/store/index.ts`：新增 TaskItem interface、TabState.tasks 欄位、setTabTasks / upsertTabTask actions
- [x] 18.3 執行 store 測試確認通過

## 19. 前端 Event 解析 — Task Tool 結果

- [x] 19.1 撰寫 useTabCopilot 測試：驗證 `copilot:tool_end` 事件中 toolName 為 `task_*` 時正確解析結果並更新 tab tasks
- [x] 19.2 修改 `frontend/src/hooks/useTabCopilot.ts`：在 `copilot:tool_end` handler 中新增 task tool 結果解析邏輯
- [x] 19.3 執行 useTabCopilot 測試確認通過

## 20. TaskPanel — ChatView 整合

- [x] 20.1 修改 `frontend/src/components/copilot/ChatView.tsx`：在訊息區域上方渲染 `<TaskPanel>`（僅在有任務時顯示）
- [x] 20.2 執行 ChatView 測試確認通過

## 21. 前端 — !command 語法路由

- [x] 21.1 撰寫 AppShell 測試：驗證輸入 `!ls -la` 時路由到 bash handler 而非 copilot；僅 `!` 時忽略；正常訊息不受影響
- [x] 21.2 修改 `frontend/src/components/layout/AppShell.tsx` 的 `handleSend`：偵測 `!` 前綴並路由至 `handleBashSend`
- [x] 21.3 執行 AppShell 測試確認通過

## 22. 全面驗證

- [x] 22.1 執行 `npm test` 確認後端全部測試通過（690 tests passed）
- [x] 22.2 執行 `npm test` 確認前端全部測試通過（777 tests passed）
- [x] 22.3 執行 `npm run build` 確認前後端編譯無錯誤
