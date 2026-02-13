## ADDED Requirements

### Requirement: 密碼登入

系統 SHALL 提供密碼登入端點 `POST /api/auth/login`，接受 `{ password: string }` 並驗證密碼。密碼 MUST 使用 bcrypt 與環境變數 `WEB_PASSWORD` 的雜湊值比對。

#### Scenario: 登入成功

- **WHEN** 使用者送出正確密碼到 `POST /api/auth/login`
- **THEN** 伺服器回傳 `200 { ok: true }` 並設定 HttpOnly session cookie

#### Scenario: 密碼錯誤

- **WHEN** 使用者送出錯誤密碼到 `POST /api/auth/login`
- **THEN** 伺服器回傳 `401 { error: "Invalid password" }` 且不設定 cookie

#### Scenario: 缺少密碼欄位

- **WHEN** 使用者送出空 body 到 `POST /api/auth/login`
- **THEN** 伺服器回傳 `400 { error: "Password required" }`

### Requirement: Session Cookie 設定

登入成功後系統 SHALL 設定 session cookie，cookie MUST 包含以下屬性：`HttpOnly`、`Secure`、`SameSite=Strict`、`Path=/`、`Max-Age=604800`（7 天）。

#### Scenario: Cookie 屬性驗證

- **WHEN** 登入成功後檢查 `Set-Cookie` header
- **THEN** cookie MUST 同時包含 HttpOnly、Secure、SameSite=Strict 屬性

### Requirement: Auth Middleware

所有 `/api/*` 路徑（除 `/api/auth/login` 外）MUST 經過 auth middleware 驗證 session cookie。

#### Scenario: 有效 session 存取 API

- **WHEN** 帶有有效 session cookie 的請求存取受保護的 API
- **THEN** 請求正常通過，交給下一個 handler 處理

#### Scenario: 無效或缺少 session 存取 API

- **WHEN** 沒有 session cookie 或 cookie 已失效的請求存取受保護的 API
- **THEN** 伺服器回傳 `401 { error: "Unauthorized" }`

### Requirement: 登出

系統 SHALL 提供登出端點 `DELETE /api/auth/logout`，清除 session。

#### Scenario: 成功登出

- **WHEN** 使用者送出 `DELETE /api/auth/logout`
- **THEN** 伺服器從 session store 移除該 session，清除 cookie，回傳 `200 { ok: true }`

### Requirement: 認證狀態查詢

系統 SHALL 提供 `GET /api/auth/status` 端點，回傳當前認證狀態。

#### Scenario: 已認證狀態

- **WHEN** 帶有有效 session cookie 的請求存取 `GET /api/auth/status`
- **THEN** 回傳 `200 { authenticated: true }`

#### Scenario: 未認證狀態

- **WHEN** 無 session cookie 的請求存取 `GET /api/auth/status`
- **THEN** 回傳 `200 { authenticated: false }`
