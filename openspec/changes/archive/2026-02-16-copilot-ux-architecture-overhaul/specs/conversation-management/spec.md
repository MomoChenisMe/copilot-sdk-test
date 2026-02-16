## MODIFIED Requirements

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

#### Scenario: 更新對話（含模型和目錄切換）
- **WHEN** 前端送出 `PATCH /api/conversations/:id` 包含 `{ title }` 或 `{ pinned }` 或 `{ model }` 或 `{ cwd }`
- **THEN** 系統 MUST 更新對應欄位並回傳更新後的對話

#### Scenario: 更新對話 — model 欄位
- **WHEN** 前端送出 `PATCH /api/conversations/:id` 包含 `{ model: "new-model-id" }`
- **THEN** 系統 MUST 更新 conversations 表的 `model` 欄位為指定的 model id

#### Scenario: 更新對話 — cwd 欄位
- **WHEN** 前端送出 `PATCH /api/conversations/:id` 包含 `{ cwd: "/new/path" }`
- **THEN** 系統 MUST 更新 conversations 表的 `cwd` 欄位為指定路徑

#### Scenario: 刪除對話
- **WHEN** 前端送出 `DELETE /api/conversations/:id`
- **THEN** 系統 MUST 刪除對話及其所有訊息（CASCADE），回傳 `200 { ok: true }`

#### Scenario: 對話不存在
- **WHEN** 存取不存在的 conversation id
- **THEN** 系統 MUST 回傳 `404 { error: "Conversation not found" }`

## ADDED Requirements

### Requirement: Tab 狀態管理

前端 Zustand store SHALL 管理 Tab 狀態，其中 Tab ID 與 Conversation ID 為獨立的識別碼。

#### Scenario: Tab 建立
- **WHEN** `openTab(conversationId, title)` 被呼叫
- **THEN** store MUST 生成獨立的 `tabId = crypto.randomUUID()`，建立 TabState 並將 `conversationId` 設為可變欄位

#### Scenario: Tab 內對話切換
- **WHEN** `switchTabConversation(tabId, conversationId, title)` 被呼叫
- **THEN** store MUST 清除該 tab 的 messages、streamingText、toolRecords 等狀態，更新 conversationId 和 title，設定 `messagesLoaded: false`

#### Scenario: 依 conversationId 查找 Tab
- **WHEN** WebSocket 事件以 `conversationId` 標識到達
- **THEN** store MUST 提供 `getTabIdByConversationId(conversationId)` helper，掃描 `Object.values(tabs)` 找到匹配的 tabId

#### Scenario: Tab 持久化格式
- **WHEN** `persistOpenTabs()` 被呼叫
- **THEN** 系統 MUST 儲存 `{ id, conversationId, title }` 格式到 localStorage `ai-terminal:openTabs`

#### Scenario: 舊格式遷移
- **WHEN** `restoreOpenTabs()` 讀取到舊格式（id === conversationId）的持久化資料
- **THEN** 系統 MUST 為每個 tab 生成新的 tabId，保留原始 conversationId

### Requirement: WebSocket 事件路由更新

前端 WebSocket 事件路由 SHALL 使用 conversationId 查找對應的 Tab。

#### Scenario: 事件路由到正確 Tab
- **WHEN** 接收到 `copilot:delta` 等事件帶有 `conversationId`
- **THEN** 系統 MUST 透過 `getTabIdByConversationId()` 查找對應 tabId，將事件更新路由到該 tab 的狀態

#### Scenario: 無對應 Tab 時忽略事件
- **WHEN** 接收到事件但沒有任何 Tab 載入該 conversationId
- **THEN** 系統 MUST 靜默忽略該事件

#### Scenario: 發送訊息取得 conversationId
- **WHEN** `sendMessage(tabId, prompt)` 被呼叫
- **THEN** 系統 MUST 從 `tabs[tabId].conversationId` 取得實際 conversationId，用於 WebSocket 訊息

### Requirement: WebSocket 訊息帶附件引用

WebSocket `copilot:send` 訊息 SHALL 支援可選的 `files` 欄位。

#### Scenario: 帶附件發送
- **WHEN** 前端發送 `copilot:send` 且有附件
- **THEN** WS 訊息 MUST 包含 `{ conversationId, prompt, files: [{ id, name, type, size, path }], activePresets, disabledSkills }`

#### Scenario: 無附件發送
- **WHEN** 前端發送 `copilot:send` 且無附件
- **THEN** WS 訊息格式不變：`{ conversationId, prompt, activePresets, disabledSkills }`

#### Scenario: 後端處理附件
- **WHEN** 後端接收到帶 `files` 的 `copilot:send`
- **THEN** StreamManager MUST 將 files 傳遞給 SDK session 的訊息呼叫
