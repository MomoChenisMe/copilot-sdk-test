## ADDED Requirements

### Requirement: WebSocket Server 建立

系統 SHALL 在 HTTP server 上建立 WebSocket server，監聽 `/ws` 路徑。

#### Scenario: WS 連線建立

- **WHEN** 客戶端發起 WebSocket upgrade 請求到 `/ws` 並帶有有效 session cookie
- **THEN** 系統 MUST 接受連線升級

#### Scenario: 未認證的 WS 連線

- **WHEN** 客戶端發起 WebSocket upgrade 請求但無有效 session cookie
- **THEN** 系統 MUST 拒絕連線，回傳 401 狀態碼

### Requirement: 訊息路由

系統 SHALL 根據 WebSocket 訊息的 `type` 前綴分派到對應的 handler。

#### Scenario: Copilot 訊息路由

- **WHEN** 收到 type 以 `copilot:` 開頭的訊息
- **THEN** 系統 MUST 將訊息分派到 copilot handler 處理

#### Scenario: Terminal 訊息路由

- **WHEN** 收到 type 以 `terminal:` 開頭的訊息
- **THEN** 系統 MUST 將訊息分派到 terminal handler 處理

#### Scenario: 未知訊息類型

- **WHEN** 收到無法識別的 type
- **THEN** 系統 MUST 發送 `error` 訊息回客戶端，包含錯誤描述

### Requirement: 心跳機制

系統 SHALL 支援 ping/pong 心跳以偵測連線狀態。

#### Scenario: 心跳回應

- **WHEN** 收到 `ping` 訊息
- **THEN** 系統 MUST 回傳 `pong` 訊息

#### Scenario: 心跳超時

- **WHEN** 超過 60 秒未收到客戶端的 ping
- **THEN** 系統 MUST 關閉該 WebSocket 連線並清理相關資源

### Requirement: 訊息格式

所有 WebSocket 訊息 MUST 使用 JSON 格式：`{ type: string, data?: object }`。

#### Scenario: 有效 JSON 訊息

- **WHEN** 收到有效的 JSON 格式訊息
- **THEN** 系統 MUST 正常解析並路由

#### Scenario: 無效 JSON 訊息

- **WHEN** 收到非 JSON 或格式不正確的訊息
- **THEN** 系統 MUST 發送 error 訊息並忽略該訊息，不中斷連線

### Requirement: 斷線重連

前端 MUST 在 WebSocket 斷線後自動重連，使用指數退避策略。

#### Scenario: 正常斷線重連

- **WHEN** WebSocket 連線意外斷開
- **THEN** 前端 MUST 在 1 秒後嘗試重連，失敗則依 2s→4s→8s→...→30s 退避重試

#### Scenario: 認證過期斷線

- **WHEN** 收到 `auth:expired` 訊息或連線被 401 拒絕
- **THEN** 前端 MUST 停止重連，導向登入頁面
