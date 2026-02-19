## ADDED Requirements

### Requirement: Task SQLite table schema

系統 SHALL 在 SQLite 資料庫中建立 `tasks` table，用於儲存 AI 對話中的任務資料。

#### Scenario: Table 建立

- WHEN 應用程式啟動並執行 database migration
- THEN `tasks` table MUST 被建立，包含以下欄位：
  - `id` TEXT PRIMARY KEY
  - `conversation_id` TEXT NOT NULL，REFERENCES conversations(id) ON DELETE CASCADE
  - `subject` TEXT NOT NULL
  - `description` TEXT NOT NULL DEFAULT ''
  - `active_form` TEXT NOT NULL DEFAULT ''
  - `status` TEXT NOT NULL DEFAULT 'pending'，CHECK(status IN ('pending','in_progress','completed','deleted'))
  - `owner` TEXT（nullable）
  - `blocks` TEXT NOT NULL DEFAULT '[]'（JSON array）
  - `blocked_by` TEXT NOT NULL DEFAULT '[]'（JSON array）
  - `metadata` TEXT NOT NULL DEFAULT '{}'（JSON object）
  - `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
  - `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))

#### Scenario: Conversation 級聯刪除

- WHEN 一個 conversation 被刪除
- THEN 該 conversation 下的所有 tasks MUST 被自動刪除（CASCADE）

#### Scenario: 查詢效能索引

- WHEN `tasks` table 建立完成
- THEN 系統 MUST 建立 `idx_tasks_conversation_id` 複合索引於 `(conversation_id, status)` 欄位

---

### Requirement: task_create tool

系統 SHALL 提供 `task_create` tool，供 AI agent 在對話中建立新任務。

#### Scenario: 建立任務成功

- WHEN AI agent 呼叫 `task_create` 並提供 `{ subject: "實作登入頁面", description: "使用 OAuth 2.0" }`
- THEN 系統 MUST 在 `tasks` table 中插入一筆新紀錄
- AND 回傳完整的 task object（包含 id、conversation_id、subject、description、active_form、status、owner、blocks、blocked_by、metadata、created_at、updated_at）
- AND `status` MUST 為 `'pending'`
- AND `id` MUST 為系統自動產生的唯一識別碼

#### Scenario: 建立任務含 optional 欄位

- WHEN AI agent 呼叫 `task_create` 並提供 `{ subject: "測試", activeForm: "coding", metadata: { priority: "high" } }`
- THEN 系統 MUST 正確儲存 `active_form` 與 `metadata` 欄位
- AND 回傳的 task object MUST 包含這些值

#### Scenario: 缺少必要欄位

- WHEN AI agent 呼叫 `task_create` 但未提供 `subject`
- THEN 系統 MUST 回傳錯誤訊息，說明 `subject` 為必填欄位

#### Scenario: conversation_id 自動關聯

- WHEN AI agent 在某對話中呼叫 `task_create`
- THEN 系統 MUST 透過 `StreamManager.sessionConversationMap` 取得當前 session 對應的 `conversation_id`
- AND 自動填入 task 的 `conversation_id` 欄位

---

### Requirement: task_list tool

系統 SHALL 提供 `task_list` tool，列出當前對話中所有非刪除狀態的任務摘要。

#### Scenario: 列出任務摘要

- WHEN AI agent 呼叫 `task_list`
- THEN 系統 MUST 回傳當前對話中所有 `status != 'deleted'` 的任務
- AND 每筆任務 MUST 包含摘要欄位：`id`、`subject`、`status`、`owner`、open `blockedBy`（僅列出未完成的 blocker）

#### Scenario: 無任務時回傳空陣列

- WHEN 當前對話中沒有任何任務（或全部已刪除）
- THEN 系統 MUST 回傳 `{ tasks: [] }`

#### Scenario: 排除已刪除任務

- WHEN 對話中有 3 筆任務，其中 1 筆 status 為 'deleted'
- THEN `task_list` MUST 僅回傳 2 筆任務

---

### Requirement: task_get tool

系統 SHALL 提供 `task_get` tool，根據 ID 回傳完整的任務資訊。

#### Scenario: 取得任務成功

- WHEN AI agent 呼叫 `task_get` 並提供有效的 `taskId`
- THEN 系統 MUST 回傳該任務的完整 task object（所有欄位）

#### Scenario: 任務不存在

- WHEN AI agent 呼叫 `task_get` 但提供的 `taskId` 不存在
- THEN 系統 MUST 回傳錯誤訊息，說明找不到指定的 task

#### Scenario: 可取得已刪除任務

- WHEN AI agent 呼叫 `task_get` 且 `taskId` 對應的任務 status 為 'deleted'
- THEN 系統 MUST 仍然回傳該任務的完整資訊（`task_get` 不過濾 deleted）

---

### Requirement: task_update tool

系統 SHALL 提供 `task_update` tool，更新指定任務的欄位。

#### Scenario: 更新 status

- WHEN AI agent 呼叫 `task_update` 並提供 `{ taskId: "abc", status: "in_progress" }`
- THEN 系統 MUST 將該任務的 `status` 更新為 `'in_progress'`
- AND `updated_at` MUST 被更新為當前時間
- AND 回傳更新後的完整 task object

#### Scenario: 更新多個欄位

- WHEN AI agent 呼叫 `task_update` 並提供 `{ taskId: "abc", subject: "新標題", description: "新描述", activeForm: "reviewing", owner: "user-1" }`
- THEN 系統 MUST 同時更新所有提供的欄位
- AND 未提供的欄位 MUST 保持原值不變

#### Scenario: metadata merge

- WHEN 任務現有 metadata 為 `{ priority: "high" }` 且 `task_update` 提供 `metadata: { assignee: "Alice" }`
- THEN 更新後的 metadata MUST 為 `{ priority: "high", assignee: "Alice" }`（shallow merge）

#### Scenario: addBlocks 新增 blocker 關係

- WHEN AI agent 呼叫 `task_update` 並提供 `{ taskId: "abc", addBlocks: ["task-2", "task-3"] }`
- THEN 系統 MUST 將 `"task-2"` 和 `"task-3"` 加入該任務的 `blocks` 陣列（不重複）

#### Scenario: addBlockedBy 新增被阻擋關係

- WHEN AI agent 呼叫 `task_update` 並提供 `{ taskId: "abc", addBlockedBy: ["task-1"] }`
- THEN 系統 MUST 將 `"task-1"` 加入該任務的 `blocked_by` 陣列（不重複）

#### Scenario: 無效 status 值

- WHEN AI agent 呼叫 `task_update` 並提供 `{ taskId: "abc", status: "invalid_status" }`
- THEN 系統 MUST 回傳錯誤訊息，說明 status 值無效

#### Scenario: 任務不存在

- WHEN AI agent 呼叫 `task_update` 但提供的 `taskId` 不存在
- THEN 系統 MUST 回傳錯誤訊息，說明找不到指定的 task

---

### Requirement: TaskPanel UI

前端 SHALL 提供 `TaskPanel` 元件，以可折疊面板形式顯示當前對話的任務列表。

#### Scenario: 面板渲染

- WHEN 當前 tab 有任務資料（tasks.length > 0）
- THEN ChatView MUST 在訊息區域上方渲染 `<TaskPanel>` 元件
- AND 面板 MUST 支援展開/折疊切換

#### Scenario: 無任務時不顯示

- WHEN 當前 tab 沒有任務資料（tasks.length === 0）
- THEN `<TaskPanel>` MUST NOT 被渲染

#### Scenario: 狀態圖示對應

- WHEN 面板展開並顯示任務列表
- THEN `pending` 狀態 MUST 顯示空心圓形圖示（circle）
- AND `in_progress` 狀態 MUST 顯示旋轉動畫圖示（spinning）
- AND `completed` 狀態 MUST 顯示勾選圖示（check）

#### Scenario: in_progress 顯示 activeForm

- WHEN 任務 status 為 `'in_progress'` 且 `activeForm` 不為空
- THEN 面板 MUST 在該任務旁顯示 `activeForm` 文字

#### Scenario: 面板折疊狀態保持

- WHEN 使用者折疊面板後切換 tab 再切回
- THEN 面板 MUST 維持折疊狀態

---

### Requirement: Zustand store task 狀態管理

Zustand store SHALL 為每個 tab 維護 `tasks` 陣列，並提供 `upsertTabTask` 和 `setTabTasks` actions。

#### Scenario: TabState 包含 tasks

- WHEN 新 tab 被建立
- THEN TabState MUST 包含 `tasks: TaskItem[]` 欄位，初始值為空陣列 `[]`

#### Scenario: setTabTasks 批次設定

- WHEN 呼叫 `setTabTasks(tabId, tasks)`
- THEN 指定 tab 的 `tasks` MUST 被完整替換為提供的 tasks 陣列

#### Scenario: upsertTabTask 新增任務

- WHEN 呼叫 `upsertTabTask(tabId, task)` 且該 task.id 不存在於現有陣列中
- THEN task MUST 被新增到陣列末端

#### Scenario: upsertTabTask 更新任務

- WHEN 呼叫 `upsertTabTask(tabId, task)` 且該 task.id 已存在於現有陣列中
- THEN 現有的 task MUST 被新提供的 task 完整替換

---

### Requirement: Event parsing — task tool 結果

前端 SHALL 在收到 `copilot:tool_end` 事件時，解析 task tool 的執行結果並更新 Zustand store。

#### Scenario: task_create 結果更新 store

- WHEN 收到 `copilot:tool_end` 事件且 `toolName` 為 `'task_create'` 且 `success` 為 true
- THEN 前端 MUST 從結果中解析 task object
- AND 呼叫 `upsertTabTask(tabId, task)` 更新 store

#### Scenario: task_update 結果更新 store

- WHEN 收到 `copilot:tool_end` 事件且 `toolName` 為 `'task_update'` 且 `success` 為 true
- THEN 前端 MUST 從結果中解析更新後的 task object
- AND 呼叫 `upsertTabTask(tabId, task)` 更新 store

#### Scenario: task_list 結果更新 store

- WHEN 收到 `copilot:tool_end` 事件且 `toolName` 為 `'task_list'` 且 `success` 為 true
- THEN 前端 MUST 從結果中解析 tasks 陣列
- AND 呼叫 `setTabTasks(tabId, tasks)` 批次更新 store

#### Scenario: task tool 執行失敗

- WHEN 收到 `copilot:tool_end` 事件且 `toolName` 以 `'task_'` 開頭但 `success` 為 false
- THEN 前端 MUST NOT 更新 task store

---

### Requirement: Session-conversation mapping

`StreamManager` SHALL 維護 `sessionConversationMap` 靜態屬性，記錄 SDK session ID 到 conversation ID 的映射。

#### Scenario: 映射建立時機

- WHEN StreamManager 為對話建立新的 SDK session
- THEN `StreamManager.sessionConversationMap` MUST 立即記錄 `sessionId → conversationId` 映射

#### Scenario: Task tools 使用映射

- WHEN task tool handler 需要取得當前 conversation ID
- THEN handler MUST 透過 `StreamManager.sessionConversationMap.get(sessionId)` 取得對應的 conversation ID
- AND 若映射不存在 MUST 回傳錯誤

#### Scenario: 映射生命週期

- WHEN SDK session 結束（stream completed 或 aborted）
- THEN 系統 SHOULD 清理該 session 的映射（避免 memory leak）
