## ADDED Requirements

### Requirement: SQLite 資料庫初始化

系統 SHALL 在啟動時自動初始化 SQLite 資料庫，建立 conversations 和 messages 表及相關索引。

#### Scenario: 首次啟動

- **WHEN** 應用程式啟動且資料庫檔案不存在
- **THEN** 系統 MUST 建立資料庫檔案並執行所有 migration，建立 conversations、messages 表和 FTS5 虛擬表

#### Scenario: 後續啟動

- **WHEN** 應用程式啟動且資料庫已存在
- **THEN** 系統 MUST 只執行尚未套用的 migration

### Requirement: 對話 CRUD

系統 SHALL 提供 REST API 管理對話。

#### Scenario: 建立新對話

- **WHEN** 前端送出 `POST /api/conversations` 包含 `{ model, cwd }`
- **THEN** 系統 MUST 建立新對話記錄，回傳 `201 { id, title, model, cwd, createdAt }`

#### Scenario: 取得對話列表

- **WHEN** 前端送出 `GET /api/conversations`
- **THEN** 系統 MUST 回傳所有對話列表，按 pinned DESC, updatedAt DESC 排序

#### Scenario: 取得單一對話（含訊息）

- **WHEN** 前端送出 `GET /api/conversations/:id`
- **THEN** 系統 MUST 回傳對話詳情及該對話的所有訊息記錄

#### Scenario: 更新對話

- **WHEN** 前端送出 `PATCH /api/conversations/:id` 包含 `{ title }` 或 `{ pinned }`
- **THEN** 系統 MUST 更新對應欄位並回傳更新後的對話

#### Scenario: 刪除對話

- **WHEN** 前端送出 `DELETE /api/conversations/:id`
- **THEN** 系統 MUST 刪除對話及其所有訊息（CASCADE），回傳 `200 { ok: true }`

#### Scenario: 對話不存在

- **WHEN** 存取不存在的 conversation id
- **THEN** 系統 MUST 回傳 `404 { error: "Conversation not found" }`

### Requirement: 訊息儲存

系統 SHALL 在 AI 回應完成後將完整訊息儲存到 messages 表。

#### Scenario: 使用者訊息儲存

- **WHEN** 使用者發送訊息
- **THEN** 系統 MUST 同時儲存使用者訊息到 messages 表（role: 'user'）

#### Scenario: AI 回應儲存

- **WHEN** AI 串流回應完成（收到 idle 事件）
- **THEN** 系統 MUST 將完整回應內容和 metadata（tool calls、reasoning、usage）儲存到 messages 表（role: 'assistant'）

### Requirement: 全文搜尋

系統 SHALL 透過 FTS5 提供對話內容的全文搜尋。

#### Scenario: 搜尋訊息

- **WHEN** 前端送出 `GET /api/conversations/search?q=keyword`
- **THEN** 系統 MUST 搜尋所有訊息內容，回傳匹配的對話列表及匹配摘要

#### Scenario: 搜尋無結果

- **WHEN** 搜尋關鍵字無匹配
- **THEN** 系統 MUST 回傳空陣列 `[]`
