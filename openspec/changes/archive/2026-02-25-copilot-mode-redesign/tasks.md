## 1. 後端模式重命名與 Prompt 系統（Act → Autopilot）

- [x] 1.1 撰寫 `defaults.ts` 常數重命名測試：驗證 `DEFAULT_AUTOPILOT_PROMPT` 存在、內容標題為 "Autopilot Mode"、`DEFAULT_SYSTEM_PROMPT` 引用 "Autopilot Mode (Default)"
  - 檔案：`backend/tests/prompts/defaults.test.ts`

- [x] 1.2 實作 `defaults.ts` 常數重命名：`DEFAULT_ACT_PROMPT` → `DEFAULT_AUTOPILOT_PROMPT`，更新內容標題和 `DEFAULT_SYSTEM_PROMPT` 的模式描述
  - 檔案：`backend/src/prompts/defaults.ts`

- [x] 1.3 撰寫 `file-store.ts` 遷移測試：驗證 `AUTOPILOT_PROMPT.md` 初始化、`ACT_PROMPT.md` → `AUTOPILOT_PROMPT.md` 遷移邏輯
  - 檔案：`backend/tests/prompts/file-store.test.ts`

- [x] 1.4 實作 `file-store.ts` 遷移邏輯：`ensureDirectories()` 建立 `AUTOPILOT_PROMPT.md`，偵測並 rename `ACT_PROMPT.md`
  - 檔案：`backend/src/prompts/file-store.ts`

- [x] 1.5 撰寫 `composer.ts` 雙模式注入測試：驗證 `mode='plan'` 注入 `PLAN_PROMPT.md`、`mode='autopilot'` 注入 `AUTOPILOT_PROMPT.md`、空檔案跳過
  - 檔案：`backend/tests/prompts/composer.test.ts`

- [x] 1.6 實作 `composer.ts` 雙模式注入：方法簽名改為 `mode?: 'plan' | 'autopilot'`，plan 時讀 `PLAN_PROMPT.md`，autopilot 時讀 `AUTOPILOT_PROMPT.md`
  - 檔案：`backend/src/prompts/composer.ts`

- [x] 1.7 撰寫 `routes.ts` autopilot-prompt 端點測試：驗證 GET/PUT/POST reset 及 `/act-prompt` 別名
  - 檔案：`backend/tests/prompts/routes.test.ts`

- [x] 1.8 實作 `routes.ts` autopilot-prompt 端點：新增 `/autopilot-prompt` GET/PUT/POST reset，`/act-prompt` 轉發到同一檔案
  - 檔案：`backend/src/prompts/routes.ts`

- [x] 1.9 執行後端 prompts 模組全部測試驗證
  - 指令：`cd backend && npx vitest run tests/prompts/`

## 2. 後端 Stream Manager 模式型別與 SDK 映射

- [x] 2.1 撰寫 `stream-manager.ts` 模式型別測試：驗證預設 mode 為 `'autopilot'`、`setMode()` 映射 `'autopilot'` → SDK `'autopilot'`、`startStream()` 以 autopilot 模式呼叫 SDK RPC
  - 檔案：`backend/tests/copilot/stream-manager.test.ts`

- [x] 2.2 實作 `stream-manager.ts` 模式型別變更：`ConversationStream.mode` 和 `StartStreamOptions.mode` 型別改為 `'plan' | 'autopilot'`，預設 `'autopilot'`，`setMode()` 映射改為 `mode === 'plan' ? 'plan' : 'autopilot'`，`startStream()` 中 autopilot 也呼叫 `sessionManager.setMode()`
  - 檔案：`backend/src/copilot/stream-manager.ts`

- [x] 2.3 撰寫 `copilot.ts` WS handler 測試：驗證 `copilot:set_mode` 接受 `'autopilot'`
  - 檔案：`backend/tests/ws/handlers/copilot.test.ts`

- [x] 2.4 實作 `copilot.ts` WS handler 型別變更：`copilot:set_mode` 的 mode 型別改為 `'plan' | 'autopilot'`
  - 檔案：`backend/src/ws/handlers/copilot.ts`

- [x] 2.5 執行後端 copilot + ws 模組全部測試驗證
  - 指令：`cd backend && npx vitest run tests/copilot/ tests/ws/`

## 3. Plan → Autopilot 轉換流程

- [x] 3.1 撰寫 `copilot:execute_plan` 新流程測試：驗證建立新 conversation、啟動 autopilot stream、廣播 `copilot:plan_execution_started` 事件、舊 conversation 保留
  - 檔案：`backend/tests/ws/handlers/copilot.test.ts`

- [x] 3.2 實作 `copilot:execute_plan` 新流程：建新 conversation（`repo.create()`）、設標題 `"Execute: {topic}"`、啟動 autopilot stream、廣播 `copilot:plan_execution_started`
  - 檔案：`backend/src/ws/handlers/copilot.ts`

- [x] 3.3 撰寫前端 `useTabCopilot.ts` 事件處理測試：驗證 `copilot:plan_execution_started` 觸發 `switchTabConversation`、清除 plan 狀態
  - 檔案：`frontend/tests/hooks/useTabCopilot.test.ts`

- [x] 3.4 實作前端 `useTabCopilot.ts` 事件處理：新增 `copilot:plan_execution_started` handler，呼叫 `switchTabConversation`，清除 planMode/showPlanCompletePrompt/planContent
  - 檔案：`frontend/src/hooks/useTabCopilot.ts`

- [x] 3.5 簡化 `AppShell.tsx` 的 `handleExecutePlan`：只發送 WS 訊息，移除直接 store 操作
  - 檔案：`frontend/src/components/layout/AppShell.tsx`

- [x] 3.6 執行前後端相關測試驗證
  - 指令：`cd backend && npx vitest run tests/ws/ && cd ../frontend && npx vitest run tests/hooks/`

## 4. Todos 修復

- [x] 4.1 撰寫 `todo-sync.ts` fallback 測試：驗證 `workspacePath` 為 undefined 時嘗試 fallback 路徑、兩者都失敗時正常跳過、成功時 broadcast
  - 檔案：`backend/tests/copilot/todo-sync.test.ts`

- [x] 4.2 實作 `todo-sync.ts` fallback 機制：`getWorkspacePath` 加入 SDK session 路徑模式 fallback + 所有 early return 加入 debug logging
  - 檔案：`backend/src/copilot/todo-sync.ts`

- [x] 4.3 實作 `stream-manager.ts` workspacePath logging：session 建立後記錄 `workspacePath` 值
  - 檔案：`backend/src/copilot/stream-manager.ts`

- [x] 4.4 執行 todo-sync 全部測試驗證
  - 指令：`cd backend && npx vitest run tests/copilot/todo-sync`

## 5. Fleet Mode Sub-agent 事件支援

- [x] 5.1 撰寫 `event-relay.ts` subagent 事件測試：驗證 4 個 subagent 事件正確轉發為 WS 訊息
  - 檔案：`backend/tests/copilot/event-relay.test.ts`

- [x] 5.2 實作 `event-relay.ts` subagent 事件監聽：新增 `subagent.started/completed/failed/selected` → `copilot:subagent_*` 轉發
  - 檔案：`backend/src/copilot/event-relay.ts`

- [x] 5.3 撰寫 Zustand store subagent 狀態測試：驗證 `addTabSubagent`、`updateTabSubagent`、`clearTabSubagents` actions
  - 檔案：`frontend/tests/store/tabs.test.ts`

- [x] 5.4 實作 Zustand store subagent 狀態：新增 `SubagentItem` 介面、`subagents` 到 `TabState`、3 個 action
  - 檔案：`frontend/src/store/index.ts`

- [x] 5.5 撰寫 `useTabCopilot.ts` subagent 事件處理測試：驗證 4 個 subagent 事件正確更新 store、idle 時清除
  - 檔案：`frontend/tests/hooks/useTabCopilot.test.ts`

- [x] 5.6 實作 `useTabCopilot.ts` subagent 事件處理：新增 `copilot:subagent_started/completed/failed/selected` handler + idle 清除
  - 檔案：`frontend/src/hooks/useTabCopilot.ts`

- [x] 5.7 撰寫 `SubagentPanel.tsx` 組件測試：驗證顯示/隱藏、狀態圖標、進度條、可收合
  - 檔案：`frontend/tests/components/copilot/SubagentPanel.test.tsx`

- [x] 5.8 實作 `SubagentPanel.tsx` 組件：參考 TaskPanel 模式，顯示 sub-agent 卡片、狀態圖標、進度條、可收合
  - 檔案：`frontend/src/components/copilot/SubagentPanel.tsx`

- [x] 5.9 在 `ChatView.tsx` 中渲染 SubagentPanel（`subagents.length > 0` 時）
  - 檔案：`frontend/src/components/copilot/ChatView.tsx`

- [x] 5.10 執行 fleet mode 相關全部測試驗證
  - 指令：`cd backend && npx vitest run tests/copilot/event-relay && cd ../frontend && npx vitest run tests/components/copilot/SubagentPanel tests/hooks/useTabCopilot tests/store/tabs`

## 6. 前端 UI 重命名（Act → Autopilot）

- [x] 6.1 重命名 `PlanActToggle.tsx` → `PlanAutopilotToggle.tsx`：更新標籤、圖標，更新所有引用（ChatView.tsx、MobileToolbarPopup.tsx）
  - 檔案：`frontend/src/components/copilot/PlanActToggle.tsx` → `PlanAutopilotToggle.tsx`

- [x] 6.2 更新 i18n keys：`planMode.act` → `planMode.autopilot`、`settings.systemPrompt.actMode` → `autopilotMode`、相關描述
  - 檔案：`frontend/src/locales/en.json`、`frontend/src/locales/zh-TW.json`

- [x] 6.3 更新 `SettingsPanel.tsx`：標題、testid、API 呼叫從 act → autopilot
  - 檔案：`frontend/src/components/settings/SettingsPanel.tsx`

- [x] 6.4 更新 `prompts-api.ts`：新增 `getAutopilotPrompt`、`putAutopilotPrompt`、`resetAutopilotPrompt`，保留舊方法作為別名
  - 檔案：`frontend/src/lib/prompts-api.ts`

- [x] 6.5 更新 `store/index.ts`：`copilot:mode_changed` 事件中 `'act'` → `'autopilot'`
  - 檔案：`frontend/src/store/index.ts`

- [x] 6.6 更新前端測試：toggle 組件測試、settings 測試、hooks 測試中的 mode 參考
  - 檔案：`frontend/tests/components/copilot/PlanActToggle.test.tsx`、`frontend/tests/components/settings/SettingsPanel.test.tsx`

- [x] 6.7 執行前端全部測試驗證
  - 指令：`cd frontend && npx vitest run`

## 7. 整合驗證

- [x] 7.1 執行後端全部測試套件
  - 指令：`cd backend && npx vitest run`

- [x] 7.2 執行前端全部測試套件
  - 指令：`cd frontend && npx vitest run`

- [x] 7.3 TypeScript 編譯驗證（前後端）
  - 指令：`cd backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit`

## 8. 磁碟上的提示詞檔案內容遷移（Act Mode → Autopilot Mode）

- [x] 8.1 撰寫 `file-store.ts` 內容遷移測試：驗證 SYSTEM_PROMPT.md 和 AUTOPILOT_PROMPT.md 中 "Act Mode" 文字被替換為 "Autopilot Mode"；已經是 "Autopilot Mode" 的檔案不會被修改
  - 檔案：`backend/tests/prompts/file-store.test.ts`

- [x] 8.2 實作 `file-store.ts` 內容遷移邏輯：`ensureDirectories()` 中，在檔名遷移（ACT→AUTOPILOT）之後，讀取 SYSTEM_PROMPT.md 和 AUTOPILOT_PROMPT.md 的內容，將 "Act Mode" / "act mode" 替換為 "Autopilot Mode" / "autopilot mode"
  - 檔案：`backend/src/prompts/file-store.ts`

- [x] 8.3 更新 `shortcuts.togglePlanMode` i18n key：en.json "Toggle Plan/Act Mode" → "Toggle Plan/Autopilot Mode"；zh-TW.json 對應更新
  - 檔案：`frontend/src/locales/en.json`、`frontend/src/locales/zh-TW.json`

- [x] 8.4 重命名 SettingsPanel 中殘餘的 act 變數名和 testid：`actContent` → `autopilotContent`、`handleActSave` → `handleAutopilotSave`、`actResetDialogOpen` → `autopilotResetDialogOpen`、`act-prompt-textarea` → `autopilot-prompt-textarea`、`save-act-prompt` → `save-autopilot-prompt`、`reset-act-prompt` → `reset-autopilot-prompt`，同步更新 SettingsPanel.test.tsx 中的 testid 引用
  - 檔案：`frontend/src/components/settings/SettingsPanel.tsx`、`frontend/tests/components/settings/SettingsPanel.test.tsx`

- [x] 8.5 執行 file-store 和前端 settings 相關測試驗證
  - 指令：`cd backend && npx vitest run tests/prompts/file-store && cd ../frontend && npx vitest run tests/components/settings/SettingsPanel`

## 9. 修復首次訊息重複顯示 Bug

根因：前端用 `crypto.randomUUID()` 產生 message id，但後端 `repo.addMessage()` 用另一個 `randomUUID()` 儲存到 DB。當 TanStack Query 觸發 `useMessagesQuery` 從 DB 拿回訊息時，前後端 ID 不匹配，ChatView 的 ID-based dedup 失敗，導致同一條使用者訊息出現兩次。

- [x] 9.1 撰寫後端 `repository.ts` addMessage 接受客戶端 ID 的測試：驗證傳入 `clientId` 時使用該 ID 存入 DB；未傳時自動產生 UUID
  - 檔案：`backend/tests/conversation/repository.test.ts`

- [x] 9.2 實作後端 `repository.ts` addMessage 支援客戶端 ID：新增 `clientId?: string` 參數，有提供時用 `clientId`，否則用 `randomUUID()`
  - 檔案：`backend/src/conversation/repository.ts`

- [x] 9.3 撰寫後端 `copilot.ts` 傳遞 clientMessageId 的測試：驗證 `copilot:send` payload 中的 `messageId` 被傳給 `repo.addMessage()`
  - 檔案：`backend/tests/ws/handlers/copilot.test.ts`

- [x] 9.4 實作後端 `copilot.ts` 傳遞 clientMessageId：從 `copilot:send` payload 解析 `messageId`，傳給 `repo.addMessage()` 作為 `clientId`
  - 檔案：`backend/src/ws/handlers/copilot.ts`

- [x] 9.5 撰寫前端 `useTabCopilot.ts` sendMessage 傳送 messageId 的測試：驗證 WS `copilot:send` payload 包含 `messageId` 欄位
  - 檔案：`frontend/tests/hooks/useTabCopilot.test.ts`

- [x] 9.6 實作前端 `useTabCopilot.ts` sendMessage 傳送 messageId：在 data payload 中加入 `data.messageId = userMsg.id`
  - 檔案：`frontend/src/hooks/useTabCopilot.ts`

- [x] 9.7 執行相關測試驗證
  - 指令：`cd backend && npx vitest run tests/conversation/repository tests/ws/handlers/copilot && cd ../frontend && npx vitest run tests/hooks/useTabCopilot`

## 10. 最終整合驗證

- [x] 10.1 執行後端全部測試套件
  - 指令：`cd backend && npx vitest run`

- [x] 10.2 執行前端全部測試套件
  - 指令：`cd frontend && npx vitest run`
