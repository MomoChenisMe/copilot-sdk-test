## ADDED Requirements

### Requirement: 認證優先順序

系統 SHALL 依以下優先順序選擇 Copilot SDK 認證方式：
1. 環境變數 `GITHUB_TOKEN` — 最高優先
2. `gh` CLI 已登入使用者 — SDK 預設行為
3. Device Flow 動態取得的 token — 透過 API 觸發

#### Scenario: GITHUB_TOKEN 環境變數已設定

- **WHEN** `GITHUB_TOKEN` 環境變數有值
- **THEN** 系統 MUST 以該 token 傳入 `CopilotClient({ githubToken })` 建立 client

#### Scenario: 無 GITHUB_TOKEN 但 gh CLI 已登入

- **WHEN** `GITHUB_TOKEN` 環境變數未設定
- **THEN** 系統 MUST 以 `new CopilotClient()` 建立 client（SDK 預設使用 `useLoggedInUser: true`）

#### Scenario: Device Flow 完成後動態設定 token

- **WHEN** Device Flow 完成取得 access token
- **THEN** 系統 MUST 停掉現有 client（如有），並在下次 `getClient()` 時使用新 token 建立 client

### Requirement: 認證狀態查詢 API

系統 SHALL 提供 REST API 端點查詢當前 Copilot 認證狀態。

#### Scenario: 查詢認證狀態（已認證）

- **WHEN** 前端請求 `GET /api/copilot/auth/status` 且 SDK client 已認證
- **THEN** 系統 MUST 回傳 `{ isAuthenticated: true, method: "<auth-type>", login: "<github-username>" }`

#### Scenario: 查詢認證狀態（未認證）

- **WHEN** 前端請求 `GET /api/copilot/auth/status` 且未認證
- **THEN** 系統 MUST 回傳 `{ isAuthenticated: false }`

#### Scenario: Client 尚未建立時查詢

- **WHEN** 前端請求 `GET /api/copilot/auth/status` 且 client 尚未初始化
- **THEN** 系統 MUST 根據 config 推斷認證方式：有 `GITHUB_TOKEN` 回傳 `{ isAuthenticated: true, method: "env" }`，否則回傳 `{ isAuthenticated: false, method: "none" }`

### Requirement: Device Flow 啟動

系統 SHALL 提供 REST API 端點啟動 GitHub OAuth Device Flow。

#### Scenario: 成功啟動 Device Flow

- **WHEN** 前端請求 `POST /api/copilot/auth/device-flow/start` 且 `GITHUB_CLIENT_ID` 已設定
- **THEN** 系統 MUST 向 `https://github.com/login/device/code` 發起 POST 請求，回傳 `{ userCode, verificationUri, expiresIn }`

#### Scenario: 未設定 GITHUB_CLIENT_ID

- **WHEN** 前端請求 `POST /api/copilot/auth/device-flow/start` 且 `GITHUB_CLIENT_ID` 未設定
- **THEN** 系統 MUST 回傳 HTTP 400 `{ error: "GITHUB_CLIENT_ID not configured" }`

#### Scenario: GitHub API 回傳錯誤

- **WHEN** 向 GitHub 請求 device code 失敗
- **THEN** 系統 MUST 回傳 HTTP 502 `{ error: "Failed to start device flow" }`

### Requirement: Device Flow 完成

系統 SHALL 提供 REST API 端點完成 Device Flow 認證，後端輪詢直到取得 token。

#### Scenario: 使用者完成授權

- **WHEN** 前端請求 `POST /api/copilot/auth/device-flow/complete` 並傳入 `{ deviceCode }`
- **AND** 使用者在 GitHub 網頁完成授權
- **THEN** 系統 MUST 輪詢 GitHub 取得 access token，設定到 ClientManager，回傳 `{ ok: true }`

#### Scenario: 使用者拒絕授權

- **WHEN** 使用者在 GitHub 網頁拒絕授權
- **THEN** 系統 MUST 停止輪詢，回傳 HTTP 403 `{ error: "Authorization denied by user" }`

#### Scenario: 輪詢超時

- **WHEN** 輪詢超過 5 分鐘使用者仍未完成授權
- **THEN** 系統 MUST 停止輪詢，回傳 HTTP 408 `{ error: "Device flow timed out" }`

#### Scenario: 缺少 deviceCode 參數

- **WHEN** 前端請求 `POST /api/copilot/auth/device-flow/complete` 但未傳入 `deviceCode`
- **THEN** 系統 MUST 回傳 HTTP 400 `{ error: "deviceCode is required" }`

### Requirement: 環境變數設定

系統 SHALL 透過 zod schema 驗證認證相關環境變數。

#### Scenario: GITHUB_TOKEN 選填

- **WHEN** `GITHUB_TOKEN` 環境變數未設定
- **THEN** 系統 MUST 正常啟動，不拋錯

#### Scenario: GITHUB_CLIENT_ID 選填

- **WHEN** `GITHUB_CLIENT_ID` 環境變數未設定
- **THEN** 系統 MUST 正常啟動，Device Flow 相關端點回傳 400
