## MODIFIED Requirements

### Requirement: Handler 架構 — 委派 StreamManager

Copilot handler SHALL 作為薄路由層，將所有串流狀態管理委派給 `StreamManager`。Handler MUST NOT 持有 `activeSession`、accumulation state、dedup sets 或任何串流相關的閉包變數。Handler 的職責僅為解析 WS 訊息 type、提取 payload、呼叫 StreamManager 對應方法、並回傳結果。

StreamManager 在 `startStream()` 中建立 SDK session 時，MUST 注入 `onPostToolUse` hook 用於 todo sync。SessionManager 的所有 option interfaces（`CreateSessionOptions`、`ResumeSessionOptions`、`GetOrCreateSessionOptions`）MUST 支援 `hooks` 欄位並轉發至 SDK `SessionConfig.hooks`。

#### Scenario: copilot:send 委派串流啟動

- **WHEN** handler 接收到 `copilot:send` 訊息
- **THEN** handler MUST 呼叫 `streamManager.startStream(conversationId, { message, model, activePresets })` 啟動串流，MUST NOT 在 handler 內建立 SDK session 或設定事件監聯器

#### Scenario: handler 無串流狀態

- **WHEN** handler 模組載入
- **THEN** handler 閉包 MUST NOT 宣告 `activeSession`、`accumulation`、`seenMessageIds`、`seenToolCallIds`、`seenReasoningIds` 等變數，所有串流狀態 MUST 由 StreamManager 的 per-conversation `ConversationStream` 管理

#### Scenario: 多 WS 連線共用同一串流

- **WHEN** 同一對話的串流正在進行，且第二個 WS 連線的 handler 接收到該對話的 `copilot:subscribe`
- **THEN** handler MUST 透過 StreamManager 將第二個連線加入訂閱，MUST NOT 啟動新的串流

#### Scenario: StreamManager 注入 onPostToolUse hook

- **WHEN** `StreamManager.startStream()` 建立 session options
- **THEN** MUST 使用 `createTodoSyncHook()` 建立 hook handler，並設定 `sessionOpts.hooks = { onPostToolUse: todoHook }`
- **AND** hook 的 `getWorkspacePath` MUST 透過 lazy sessionRef 取得 `session.workspacePath`
- **AND** hook 的 `getConversationId` MUST 透過 `StreamManager.sessionConversationMap` 解析
- **AND** hook 的 `broadcast` MUST 將事件加入 stream 的 `eventBuffer` 並即時 broadcast

#### Scenario: SessionManager 轉發 hooks 至 SDK

- **WHEN** `SessionManager.createSession()` 或 `resumeSession()` 接收到 options 中包含 `hooks` 欄位
- **THEN** MUST 將 `hooks` 設定到 SDK session config 中，由 SDK 負責呼叫

## REMOVED Requirements

### Requirement: 自訂 Task 工具

**Reason**: LLM 天然使用 SDK 內建 `sql` tool 的 `todos` 表，自訂 `task_create`/`task_list`/`task_get`/`task_update` 工具從未被使用。由 `todo-sync` hook + `copilot:todos_updated` WebSocket 事件取代。

**Migration**: 移除 `task-tools.ts`、`TaskRepository`、`tasks` DB table schema、`index.ts` 中的初始化程式碼。前端改為接收 `copilot:todos_updated` 事件。
