## 1. Backend — Todo Sync Hook

- [x] 1.1 撰寫 `backend/tests/copilot/todo-sync.test.ts` 測試：hook 只在 `toolName === 'sql'` 且 query 含 `todos` 時觸發 broadcast；非 sql tool 不觸發；query 不含 todos 不觸發；workspacePath undefined 時跳過；session.db 不存在時跳過；todos 表不存在時跳過；DB 錯誤時安全跳過；正常查詢回傳完整 todos 陣列
- [x] 1.2 實作 `backend/src/copilot/todo-sync.ts`：`TodoItem` interface、`TodoSyncOptions` interface、`createTodoSyncHook()` 工廠函式
- [x] 1.3 驗證 `cd backend && npx vitest run tests/copilot/todo-sync.test.ts` 全部通過

## 2. Backend — SessionManager hooks 支援

- [x] 2.1 撰寫 `backend/tests/copilot/session-manager.test.ts` 新增測試：createSession 和 resumeSession 在 options 包含 hooks 時正確轉發至 SDK sessionConfig
- [x] 2.2 修改 `backend/src/copilot/session-manager.ts`：`CreateSessionOptions`、`ResumeSessionOptions`、`GetOrCreateSessionOptions` 新增 `hooks` 欄位；`createSession()` 和 `resumeSession()` 轉發 hooks 至 sessionConfig
- [x] 2.3 驗證 `cd backend && npx vitest run tests/copilot/session-manager.test.ts` 全部通過

## 3. Backend — StreamManager 注入 hook

- [x] 3.1 撰寫 `backend/tests/copilot/stream-manager.test.ts` 新增測試：startStream 時 sessionOpts 包含 `hooks.onPostToolUse`
- [x] 3.2 修改 `backend/src/copilot/stream-manager.ts`：import `createTodoSyncHook`；在 `startStream()` 中建立 hook（lazy sessionRef 模式）並設定 `sessionOpts.hooks`；session 建立後賦值 sessionRef
- [x] 3.3 驗證 `cd backend && npx vitest run tests/copilot/stream-manager.test.ts` 全部通過

## 4. Backend — 移除自訂 Task 系統

- [x] 4.1 刪除 `backend/src/copilot/tools/task-tools.ts`、`backend/src/task/repository.ts`
- [x] 4.2 刪除 `backend/tests/copilot/task-tools.test.ts`、`backend/tests/task/repository.test.ts`、`backend/tests/conversation/db-tasks.test.ts`
- [x] 4.3 修改 `backend/src/index.ts`：移除 `TaskRepository` 和 `createTaskTools` import 及初始化程式碼（lines 48-49, 314-317）
- [x] 4.4 修改 `backend/src/conversation/db.ts`：移除 `tasks` 表建立語句和索引（lines 74-91）
- [x] 4.5 驗證 `cd backend && npx vitest run` 全部通過（無殘留引用錯誤）

## 5. Backend — 更新 System Prompt

- [x] 5.1 修改 `backend/tests/prompts/defaults.test.ts`：更新斷言，移除 `task_create`/`task_list`/`task_update` 字串檢查，新增 SQL todos 相關字串檢查
- [x] 5.2 修改 `backend/src/prompts/defaults.ts`：line 128 更新 "Task Management" 描述；lines 243-260 將整段改為 SQL todos 使用指引
- [x] 5.3 驗證 `cd backend && npx vitest run tests/prompts/defaults.test.ts` 全部通過

## 6. Frontend — Store 與 Hook 更新

- [x] 6.1 修改 `frontend/tests/store/tabs.test.ts`：更新 task 相關測試使用新 `TaskItem` schema（`title` 取代 `subject`、新增 `done`/`blocked` 狀態）；移除 `upsertTabTask` 測試
- [x] 6.2 修改 `frontend/src/store/index.ts`：更新 `TaskItem` interface（id/title/description/status/created_at/updated_at）；移除 `upsertTabTask` action 宣告和實作
- [x] 6.3 修改 `frontend/tests/hooks/useTabCopilot.test.ts`：移除 `task_*` 工具結果解析測試；新增 `copilot:todos_updated` 事件處理測試
- [x] 6.4 修改 `frontend/src/hooks/useTabCopilot.ts`：移除 lines 306-336 的 `task_*` 解析；新增 `copilot:todos_updated` switch case
- [x] 6.5 驗證 `cd frontend && npx vitest run tests/store/tabs.test.ts tests/hooks/useTabCopilot.test.ts` 全部通過

## 7. Frontend — TaskPanel UI 升級

- [x] 7.1 修改 `frontend/tests/components/copilot/TaskPanel.test.tsx`：用新 `TaskItem` 型別重寫測試；新增 blocked 狀態圖示測試、進度條測試、展開 description 測試
- [x] 7.2 修改 `frontend/src/components/copilot/TaskPanel.tsx`：新增 `AlertCircle` import；進度條（h-1 green bar）；4 種狀態圖示；blocked 標籤；expandedIds state + 點擊展開 description
- [x] 7.3 驗證 `cd frontend && npx vitest run tests/components/copilot/TaskPanel.test.tsx` 全部通過

## 8. Frontend — i18n 更新

- [x] 8.1 修改 `frontend/src/locales/en.json`：tasks section 新增 `done`、`blocked`；移除 `completed`
- [x] 8.2 修改 `frontend/src/locales/zh-TW.json`：tasks section 新增 `done`（已完成）、`blocked`（已封鎖）；移除 `completed`
- [x] 8.3 驗證 `cd frontend && npx vitest run` 全部通過

## 9. 全端驗證

- [x] 9.1 驗證 `cd backend && npx vitest run` 所有 backend 測試通過
- [x] 9.2 驗證 `cd frontend && npx vitest run` 所有 frontend 測試通過（3 個既有失敗非本次變更）
- [x] 9.3 驗證 TypeScript 編譯：`cd backend && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit`（既有 TS 錯誤非本次變更）
