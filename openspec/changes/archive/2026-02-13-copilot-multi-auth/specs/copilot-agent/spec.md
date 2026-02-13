## MODIFIED Requirements

### Requirement: CopilotClient 單例管理

系統 SHALL 維護一個 CopilotClient 單例實例，透過 `getClient()` 取得。Client MUST 在首次使用時自動啟動，graceful shutdown 時自動停止。`ClientManager` 建構子 MUST 接收 config 物件（含 `githubToken?` 和 `githubClientId?`），並根據 config 決定 CopilotClient 的認證參數。

#### Scenario: 首次取得 Client（有 githubToken）

- **WHEN** 呼叫 `getClient()` 且 Client 尚未啟動，且 config 含 `githubToken`
- **THEN** 系統 MUST 以 `new CopilotClient({ githubToken })` 建立並啟動 client

#### Scenario: 首次取得 Client（無 githubToken）

- **WHEN** 呼叫 `getClient()` 且 Client 尚未啟動，且 config 無 `githubToken`
- **THEN** 系統 MUST 以 `new CopilotClient()` 建立並啟動 client（使用 SDK 預設認證）

#### Scenario: 後續取得 Client

- **WHEN** 呼叫 `getClient()` 且 Client 已在執行中
- **THEN** 直接回傳現有的 client 實例，不重複建立

#### Scenario: Graceful shutdown

- **WHEN** 應用程式收到 SIGTERM/SIGINT
- **THEN** 系統 MUST 呼叫 CopilotClient 的 stop 方法，等待清理完成

#### Scenario: 動態更新 token 後取得 Client

- **WHEN** 呼叫 `setGithubToken(token)` 後再呼叫 `getClient()`
- **THEN** 系統 MUST 使用新 token 建立新的 CopilotClient
