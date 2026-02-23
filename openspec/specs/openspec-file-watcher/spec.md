## ADDED Requirements

### Requirement: OpenSpecWatcher 服務

後端 MUST 提供 `OpenSpecWatcher` class（`backend/src/openspec/openspec-watcher.ts`），使用 chokidar 監聽 openspec/ 目錄的檔案變更。

Watcher MUST：
1. 遞迴監聽指定目錄，深度限制 5 層
2. 忽略隱藏檔案（以 `.` 開頭）
3. 監聽 `add`、`change`、`unlink`、`addDir`、`unlinkDir` 事件
4. 使用 `ignoreInitial: true` 避免啟動時觸發
5. Debounce 500ms 合併連續事件後透過 callback 通知
6. 提供 `watch(path)` 和 `stop()` 方法
7. 呼叫 `stop()` 時 MUST 清理所有 timer 和 watcher 資源

#### Scenario: 檔案新增觸發通知

- **WHEN** 使用者透過 CLI 在 openspec/changes/ 下新增檔案
- **THEN** watcher MUST 在 500ms debounce 後觸發 callback
- **AND** callback 參數 MUST 包含 `{ type: 'openspec:changed', data: { path, changeType: 'add' } }`

#### Scenario: 檔案修改觸發通知

- **WHEN** 使用者透過編輯器修改 openspec/changes/my-change/tasks.md
- **THEN** watcher MUST 在 500ms debounce 後觸發 callback
- **AND** callback 參數 MUST 包含 `changeType: 'change'`

#### Scenario: 連續快速變更合併

- **WHEN** 100ms 內連續觸發 10 個檔案變更事件
- **THEN** watcher MUST 只觸發一次 callback（debounce 合併）

#### Scenario: 停止監聽

- **WHEN** 呼叫 `watcher.stop()`
- **THEN** chokidar watcher MUST 被關閉
- **AND** 所有 pending debounce timer MUST 被清除

#### Scenario: 隱藏檔案不觸發

- **WHEN** openspec/ 目錄下新增 `.DS_Store` 檔案
- **THEN** watcher MUST NOT 觸發 callback

### Requirement: WebSocket broadcast 函數

`createWsServer` MUST 回傳 `{ wss, broadcast }` 物件（取代原本直接回傳 `wss`）。`broadcast` 函數 MUST 遍歷所有處於 `OPEN` 狀態的 WebSocket client 發送 JSON 訊息。

#### Scenario: broadcast 發送訊息給所有連線

- **WHEN** 呼叫 `broadcast({ type: 'openspec:changed', data: { path: '...', changeType: 'change' } })`
- **AND** 有 3 個已連線的 WebSocket client
- **THEN** 3 個 client MUST 都收到該 JSON 訊息

#### Scenario: 跳過非 OPEN 狀態的 client

- **WHEN** 呼叫 `broadcast(message)`
- **AND** 1 個 client 處於 CLOSING 狀態
- **THEN** 該 client MUST NOT 收到訊息

### Requirement: Watcher 整合至 Server

後端啟動時 MUST 初始化 OpenSpecWatcher 並將其 callback 連接到 WebSocket broadcast。Watcher MUST 在 graceful shutdown 時被停止。

#### Scenario: Server 啟動時開始監聽

- **WHEN** 後端 server 啟動
- **AND** 預設 openspec/ 目錄存在
- **THEN** OpenSpecWatcher MUST 開始監聽該目錄

#### Scenario: 預設目錄不存在時不監聽

- **WHEN** 後端 server 啟動
- **AND** 預設 openspec/ 目錄不存在
- **THEN** OpenSpecWatcher MUST NOT 啟動（不拋錯）

#### Scenario: Graceful shutdown 停止 watcher

- **WHEN** server 收到 shutdown 信號
- **THEN** OpenSpecWatcher MUST 被停止並釋放資源

### Requirement: 前端即時刷新

OpenSpec 面板 MUST 在收到 `openspec:changed` WebSocket 事件時自動刷新資料。

#### Scenario: 收到事件時自動刷新

- **WHEN** 面板處於開啟狀態
- **AND** 收到 `openspec:changed` 事件
- **THEN** 面板 MUST 在 300ms debounce 後呼叫 `refreshAll()`

#### Scenario: 面板關閉時不刷新

- **WHEN** 面板處於關閉狀態
- **AND** 收到 `openspec:changed` 事件
- **THEN** MUST NOT 觸發任何 API 呼叫

#### Scenario: WebSocket 訊息分發為 CustomEvent

- **WHEN** WebSocket 收到 `{ type: 'openspec:changed', data: {...} }` 訊息
- **THEN** MUST dispatch `window.dispatchEvent(new CustomEvent('openspec:changed', { detail: data }))`
