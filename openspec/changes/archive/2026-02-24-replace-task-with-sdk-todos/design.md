## Context

目前專案有一套自訂的 task 工具系統（`task_create`/`task_list`/`task_get`/`task_update`），由 `TaskRepository` 操作 `conversations.db` 中的 `tasks` 表。然而 Copilot SDK 內建 `sql` tool 會自動在 `session.db` 建立 `todos` 表，LLM 天然優先使用 SDK 內建工具，導致自訂 task 系統從未被使用。

SDK 的 `session.db` 是 per-session 的 SQLite 資料庫，路徑為 `${session.workspacePath}/session.db`，僅在 infinite sessions 啟用時存在。SDK 提供 `SessionHooks.onPostToolUse` hook，可在任何工具執行後觸發回呼。

## Goals / Non-Goals

**Goals:**
- 移除所有自訂 task 系統程式碼（工具、repository、DB schema、prompt 指引、前端解析）
- 透過 SDK `onPostToolUse` hook 偵測 `sql` tool 對 `todos` 表的操作
- 以 readonly 方式讀取 `session.db` 取得完整 todos 快照
- 透過 WebSocket 推送 `copilot:todos_updated` 事件給前端即時更新 UI
- 升級 TaskPanel：進度條、`blocked` 狀態、可展開 description

**Non-Goals:**
- 不修改 SDK 的 `sql` tool 或 `todos` 表 schema
- 不實作使用者手動編輯 todos
- 不實作跨 session 的 todos 持久化
- 不建立獨立的 todos 管理頁面

## Decisions

### Decision 1: 使用 `onPostToolUse` hook 而非攔截 WebSocket 事件

**選擇**: 在 SDK session config 注入 `onPostToolUse` hook

**替代方案**: 在前端攔截 `copilot:tool_end`（`toolName === 'sql'`），解析 `result` 字串中的 todos 資料

**理由**: 前端解析 SQL 結果字串脆弱且不完整——`INSERT`/`UPDATE`/`DELETE` 的結果只包含 `rows affected` 而非完整資料。Hook 可以在 backend 主動查詢完整快照，保證資料完整性。

### Decision 2: 每次查詢完整快照而非差異更新

**選擇**: 每次 hook 觸發時執行 `SELECT * FROM todos ORDER BY created_at`，推送完整 todos 陣列

**替代方案**: 解析 `toolArgs.query` 判斷是 INSERT/UPDATE/DELETE 並只推送差異

**理由**: `todos` 表通常只有 5-20 行，完整快照查詢成本 < 1ms（本地 SQLite readonly）。差異更新的解析邏輯複雜且容易遺漏邊界情況（如 `DELETE FROM todos WHERE status = 'done'`）。完整快照保證前端狀態永遠一致。

### Decision 3: 使用 `better-sqlite3` readonly 模式存取 `session.db`

**選擇**: 用 `better-sqlite3` 以 `{ readonly: true }` 開啟 SDK 的 `session.db`

**替代方案 A**: 透過 SDK session 再發送一個 `SELECT * FROM todos` 的 tool call
**替代方案 B**: 使用 Node.js 原生 `node:sqlite` 模組

**理由**:
- 替代 A 會產生額外的 tool call 循環，可能干擾 LLM 對話流程
- 替代 B (`node:sqlite`) 在 Node.js 24 雖然可用但仍為 experimental
- `better-sqlite3` 已是專案依賴，readonly 模式保證不干擾 SDK 的寫入操作

### Decision 4: 正則觸發條件 `/\btodos\b/i`

**選擇**: 用正則 `/\btodos\b/i` 檢查 `toolArgs.query` 是否涉及 `todos` 表

**替代方案**: 每次 `sql` tool 執行都查詢（不判斷 query 內容）

**理由**: LLM 也會用 `sql` tool 建立其他表（如 `test_cases`、`session_state`）。正則過濾避免不必要的查詢。偶爾的 false positive（query 在註解中提到 `todos`）影響極低——多讀一次成本可忽略。

### Decision 5: hook 注入位置 — StreamManager.startStream()

**選擇**: 在 `StreamManager.startStream()` 中建立 hook，透過 closure 存取 broadcast 方法和 streams Map

**替代方案**: 在 `SessionManager.createSession()` 中注入 hook

**理由**: StreamManager 持有 broadcast 能力和 conversationId 映射。SessionManager 是純粹的 session 生命週期管理，不應該知道 WebSocket broadcast 的存在。Hook 需要 broadcast，因此必須在擁有 broadcast 能力的層級建立。

SessionManager 只需增加 `hooks` 欄位的 passthrough 支援。

### Decision 6: 使用 lazy sessionRef 模式

**選擇**: 用 `let sessionRef: CopilotSession | null = null` 延遲綁定 session

**理由**: hook 必須在 session 建立前注入（作為 config 的一部分），但需要存取 `session.workspacePath`（只在建立後才有值）。因為 hook 只在 `session.send()` 期間才會被呼叫，此時 sessionRef 已經被賦值，不存在競爭條件。

## Risks / Trade-offs

**[Risk] SDK 變更 `session.db` 路徑或 `todos` 表 schema** → `workspacePath` 是 SDK 的 public API，路徑變更機率低。`todos` 表 schema 如有變更，frontend 已設計為容錯（graceful handling of missing columns）。

**[Risk] `session.db` 被 SDK 鎖定，readonly 開啟失敗** → SQLite WAL 模式下，readonly 讀取不會被 writer 阻塞。`better-sqlite3` 的 readonly 模式在 WAL 下可以與寫入並行。即使失敗也只是 log error 並跳過，不影響對話。

**[Risk] LLM 不使用預設 `todos` 表，自建不同名稱的表** → SDK system prompt 明確引導 LLM 使用 `todos` 表，且 SDK 預設建立該表。若 LLM 用其他表名，hook 不會觸發，TaskPanel 為空——與目前行為一致，不算退化。

**[Trade-off] 移除 `tasks` DB table 後舊資料庫仍有該表** → 不執行 `DROP TABLE`，僅停止建立。舊表在既有資料庫中保留但不再使用，不影響功能。
