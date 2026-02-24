## Why

Copilot SDK 內建的 `sql` tool 會自動建立 `todos` 表格（含 `id`, `title`, `description`, `status`, `created_at`, `updated_at`），LLM 天然優先使用它來追蹤多步驟工作的待辦事項。專案自訂的 `task_*` 工具（`task_create`, `task_list`, `task_get`, `task_update`）從未被 LLM 主動呼叫，前端 TaskPanel 始終為空——形同廢棄程式碼。

本次變更移除廢棄的自訂 task 系統，改為透過 SDK `onPostToolUse` hook 攔截 `sql` tool 對 `todos` 表的操作，主動查詢 `session.db` 取得完整 todos 快照，並透過 WebSocket 推送即時更新給前端。同時升級 TaskPanel UI，新增進度條、`blocked` 狀態顯示、可展開 description。

## What Changes

- **移除** 自訂 task 系統：`task-tools.ts`、`TaskRepository`、`tasks` DB table schema、system prompt 中的 task 工具指引
- **新增** `todo-sync.ts` — SDK `onPostToolUse` hook handler，偵測 `sql` tool 涉及 `todos` 表時，以 readonly 方式查詢 `session.db` 並推送完整 todos 快照
- **新增** WebSocket 事件 `copilot:todos_updated` — 攜帶 `{ conversationId, todos: TodoItem[] }` payload
- **修改** `SessionManager` — 所有 session option interfaces 新增 `hooks` 欄位，轉發至 SDK `SessionConfig.hooks`
- **修改** `StreamManager.startStream()` — 注入 `onPostToolUse` hook
- **修改** Frontend `TaskItem` interface — 從自訂 schema 改為對齊 SDK todos schema（`title` 取代 `subject`，新增 `done`/`blocked` 狀態）
- **修改** `useTabCopilot.ts` — 移除 `task_*` 結果解析，新增 `copilot:todos_updated` 事件處理
- **修改** `TaskPanel.tsx` — 新增進度條、`blocked` 狀態（橘紅 AlertCircle）、可展開 description
- **修改** system prompt — 將 task 工具指引改為 SQL todos 指引

## Non-Goals

- 不修改 SDK 的 `sql` tool 本身或 `todos` 表 schema
- 不建立獨立的任務管理頁面或側邊面板（維持聊天上方嵌入式顯示）
- 不實作跨 session 的任務持久化（todos 生命週期跟隨 SDK session）
- 不實作任務的使用者手動編輯（任務完全由 LLM 透過 sql tool 管理）

## Capabilities

### New Capabilities
- `todo-sync`: SDK sql tool 的 post-tool-use hook，偵測 todos 表變更並透過 WebSocket 推送即時快照給前端

### Modified Capabilities
- `copilot-agent`: StreamManager 建立 session 時注入 `onPostToolUse` hook；SessionManager option interfaces 新增 `hooks` 欄位
- `chat-ui`: TaskPanel 升級 — 新增進度條、`blocked` 狀態顯示（橘紅圖示 + 標籤）、可展開 description；`TaskItem` interface 改為 SDK todos schema
- `system-prompts`: 移除 task 工具指引，改為 SQL todos 使用指引

## Impact

**Backend 模組：**
- `src/copilot/todo-sync.ts` — 新增
- `src/copilot/session-manager.ts` — 修改（hooks 支援）
- `src/copilot/stream-manager.ts` — 修改（注入 hook）
- `src/copilot/tools/task-tools.ts` — **刪除**
- `src/task/repository.ts` — **刪除**
- `src/conversation/db.ts` — 修改（移除 tasks table schema）
- `src/index.ts` — 修改（移除 TaskRepository/taskTools 初始化）
- `src/prompts/defaults.ts` — 修改（更新 system prompt）

**前端元件：**
- `components/copilot/TaskPanel.tsx` — 重構
- `hooks/useTabCopilot.ts` — 修改（WS 事件處理）
- `store/index.ts` — 修改（TaskItem interface + actions）
- `locales/en.json`, `locales/zh-TW.json` — 修改（i18n keys）

**WebSocket 新增事件：** `copilot:todos_updated`

**SQLite schema：** 移除 `tasks` table 建立語句（不影響 SDK 的 `session.db`）

**相依套件：** 無新增（`better-sqlite3` 已為專案依賴）
