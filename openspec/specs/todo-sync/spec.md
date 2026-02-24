### Requirement: Todo Sync Hook — 偵測 todos 表變更

系統 SHALL 提供 `createTodoSyncHook()` 工廠函式，回傳符合 SDK `PostToolUseHandler` 型別的 hook handler。此 hook MUST 在 `sql` tool 執行後檢查 query 是否涉及 `todos` 表，並在偵測到時查詢完整 todos 快照推送給前端。

#### Scenario: sql tool 操作 todos 表時觸發同步

- **WHEN** SDK 的 `sql` tool 執行完成，且 `toolArgs.query` 符合正則 `/\btodos\b/i`
- **THEN** hook MUST 以 readonly 模式開啟 `${session.workspacePath}/session.db`，執行 `SELECT * FROM todos ORDER BY created_at`，並透過 `broadcast` 推送 `copilot:todos_updated` 事件

#### Scenario: sql tool 操作非 todos 表時不觸發

- **WHEN** SDK 的 `sql` tool 執行完成，且 `toolArgs.query` 不符合正則 `/\btodos\b/i`（例如 `CREATE TABLE test_cases ...`）
- **THEN** hook MUST 直接 return，不進行任何查詢或推送

#### Scenario: 非 sql 工具執行時不觸發

- **WHEN** 任何非 `sql` 的工具（如 `Read`、`Write`、`Bash`）執行完成
- **THEN** hook MUST 直接 return，不進行任何查詢或推送

### Requirement: Todo Sync Hook — 邊界處理

hook MUST 安全處理所有邊界情況，不得因為外部狀態問題導致 SDK session 中斷或錯誤。

#### Scenario: workspacePath 為 undefined

- **WHEN** `getWorkspacePath()` 回傳 `undefined`（infinite sessions 未啟用）
- **THEN** hook MUST 跳過查詢，以 debug 等級記錄日誌，return void

#### Scenario: session.db 檔案不存在

- **WHEN** `${workspacePath}/session.db` 路徑不存在
- **THEN** hook MUST 跳過查詢，以 debug 等級記錄日誌，return void

#### Scenario: todos 表尚未建立

- **WHEN** `session.db` 存在但 `sqlite_master` 中無 `todos` 表記錄
- **THEN** hook MUST 跳過查詢，return void

#### Scenario: SQLite 開啟或查詢失敗

- **WHEN** `better-sqlite3` 開啟 `session.db` 或執行查詢時拋出例外
- **THEN** hook MUST 捕獲例外，以 error 等級記錄日誌，return void，不得拋出至 SDK

#### Scenario: conversationId 無法解析

- **WHEN** `getConversationId(sessionId)` 回傳 `undefined`
- **THEN** hook MUST 跳過推送，return void

### Requirement: WebSocket 事件 — copilot:todos_updated

系統 SHALL 透過 WebSocket 推送 `copilot:todos_updated` 事件，攜帶完整 todos 快照。

#### Scenario: 推送 todos 快照

- **WHEN** hook 成功查詢 todos 表
- **THEN** MUST 推送 WebSocket 訊息 `{ type: 'copilot:todos_updated', data: { conversationId: string, todos: TodoItem[] } }`，其中 `TodoItem` 包含 `id`（string）、`title`（string）、`description`（string | null）、`status`（'pending' | 'in_progress' | 'done' | 'blocked'）、`created_at`（string）、`updated_at`（string）

#### Scenario: todos 表為空

- **WHEN** hook 查詢 todos 表結果為空陣列
- **THEN** MUST 推送 `{ type: 'copilot:todos_updated', data: { conversationId, todos: [] } }`

#### Scenario: 事件加入 eventBuffer

- **WHEN** hook 推送 `copilot:todos_updated` 事件
- **THEN** 事件 MUST 同時加入 stream 的 `eventBuffer`（供新訂閱者重播）和即時 broadcast 給現有訂閱者

### Requirement: TodoSyncOptions 介面

`createTodoSyncHook()` MUST 接受 `TodoSyncOptions` 參數物件，包含三個回呼函式以解耦外部依賴。

#### Scenario: 依賴注入

- **WHEN** 呼叫 `createTodoSyncHook(options)`
- **THEN** `options` MUST 包含 `getWorkspacePath: (sessionId: string) => string | undefined`、`getConversationId: (sessionId: string) => string | undefined`、`broadcast: (conversationId: string, msg: WsMessage) => void`
