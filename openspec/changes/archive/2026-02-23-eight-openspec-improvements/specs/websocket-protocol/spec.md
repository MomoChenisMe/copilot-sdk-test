## ADDED Requirements

### Requirement: openspec:changed 訊息類型（S→C）

Server SHALL broadcast `openspec:changed` 訊息給所有已連線的 WebSocket clients，當 openspec/ 目錄下的檔案發生新增、修改或刪除時觸發。

訊息格式：
```json
{
  "type": "openspec:changed",
  "data": {
    "path": "<changed-file-path>",
    "changeType": "add" | "change" | "unlink"
  }
}
```

#### Scenario: 訊息格式

- **WHEN** openspec/ 目錄下的檔案被修改
- **THEN** server MUST broadcast `{ type: 'openspec:changed', data: { path: string, changeType: 'add' | 'change' | 'unlink' } }` 格式的 WebSocket 訊息

#### Scenario: 廣播範圍

- **WHEN** server broadcast `openspec:changed`
- **THEN** 所有處於 OPEN 狀態的 WebSocket clients SHALL 收到訊息
- **AND** 處於非 OPEN 狀態的 clients SHALL NOT 收到訊息

#### Scenario: 不經由 router 分派

- **WHEN** `openspec:changed` 訊息被廣播
- **THEN** 訊息 MUST 直接透過 broadcast 函數發送，不經過 WebSocket router 的 prefix-based 路由機制

### Requirement: WebSocket Server broadcast 能力

`createWsServer` 的回傳值 MUST 從單純的 `wss` 改為 `{ wss, broadcast }` 物件。`broadcast` 函數 MUST 接受 `WsMessage` 類型參數，遍歷所有 `wss.clients` 中 `readyState === WebSocket.OPEN` 的 client 發送 JSON 訊息。

#### Scenario: 回傳值變更

- **WHEN** 呼叫 `createWsServer(httpServer, sessionStore)`
- **THEN** MUST 回傳 `{ wss: WebSocketServer, broadcast: (message: WsMessage) => void }`

#### Scenario: broadcast 函數行為

- **WHEN** 呼叫 `broadcast({ type: 'test', data: {} })`
- **THEN** MUST 對所有 OPEN 狀態的 client 呼叫 `ws.send(JSON.stringify(message))`
