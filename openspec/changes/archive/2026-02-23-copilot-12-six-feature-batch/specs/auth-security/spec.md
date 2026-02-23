## ADDED Requirements

### Requirement: 登入 Rate Limiting
系統 SHALL 限制每個 IP 的登入嘗試頻率，防止暴力破解。

#### Scenario: 正常頻率登入
- **WHEN** 使用者在 1 分鐘內嘗試登入少於 5 次
- **THEN** 系統 MUST 正常處理登入請求

#### Scenario: 超過頻率限制
- **WHEN** 同一 IP 在 1 分鐘內嘗試登入達 5 次
- **THEN** 系統 MUST 回傳 HTTP 429 狀態碼
- **AND** response body MUST 包含 `retryAfter` 秒數

#### Scenario: 登入成功後重設計數
- **WHEN** 使用者成功登入
- **THEN** 該 IP 的嘗試計數 MUST 重設為 0

#### Scenario: 視窗過期自動重設
- **WHEN** 距離該 IP 上次嘗試已超過 1 分鐘
- **THEN** 嘗試計數 MUST 自動重設

### Requirement: 帳號鎖定機制
系統 SHALL 在連續登入失敗達門檻時鎖定帳號。

#### Scenario: 連續失敗觸發鎖定
- **WHEN** 連續登入失敗達 10 次（不論 IP）
- **THEN** 帳號 MUST 鎖定 15 分鐘
- **AND** 系統 MUST 回傳 HTTP 423 狀態碼及 `lockedUntil` ISO 時間戳

#### Scenario: 鎖定期間拒絕登入
- **WHEN** 帳號處於鎖定狀態且使用者嘗試登入
- **THEN** 系統 MUST 直接回傳 423，不進行密碼比對

#### Scenario: 登入成功重設失敗計數
- **WHEN** 使用者成功登入
- **THEN** 連續失敗計數 MUST 重設為 0

#### Scenario: 鎖定時間到期
- **WHEN** 鎖定時間（15 分鐘）到期
- **THEN** 系統 MUST 允許新的登入嘗試

#### Scenario: 鎖定狀態持久化
- **WHEN** server 重啟
- **THEN** 鎖定狀態 MUST 從 SQLite 恢復（不受重啟影響）

### Requirement: 密碼複雜度驗證
系統 SHALL 要求密碼滿足最低複雜度。

#### Scenario: 啟動時驗證環境變數密碼
- **WHEN** server 啟動且 `WEB_PASSWORD` 環境變數少於 8 字元
- **THEN** server MUST 拒絕啟動並輸出錯誤訊息

#### Scenario: 密碼重設時驗證新密碼
- **WHEN** 使用者透過重設機制設定新密碼且長度少於 8 字元
- **THEN** 系統 MUST 回傳 400 錯誤並說明密碼需求

### Requirement: Session 持久化儲存
系統 SHALL 將 session 儲存在 SQLite 中，server 重啟後 session 不失效。

#### Scenario: Session 建立
- **WHEN** 使用者成功登入
- **THEN** 系統 MUST 在 SQLite `sessions` 表中建立記錄
- **AND** 記錄 MUST 包含 token, created_at, expires_at, last_activity, ip_address, user_agent

#### Scenario: Session 驗證
- **WHEN** 請求附帶 session cookie
- **THEN** 系統 MUST 從 SQLite 查詢 token 是否存在且未過期
- **AND** MUST 更新 `last_activity` 欄位

#### Scenario: Server 重啟後 session 存續
- **WHEN** server 重啟
- **THEN** 先前有效的 session MUST 仍可通過驗證

#### Scenario: 過期 session 清除
- **WHEN** 定期清除任務執行（每小時）
- **THEN** 系統 MUST 刪除所有 `expires_at` 已過的 session 記錄

#### Scenario: Session 登出
- **WHEN** 使用者登出
- **THEN** 系統 MUST 從 SQLite 刪除該 session 記錄

### Requirement: CSRF Token 防護
系統 SHALL 使用 double-submit cookie 模式防止 CSRF 攻擊。

#### Scenario: 登入成功設置 CSRF cookie
- **WHEN** 使用者成功登入
- **THEN** 系統 MUST 設置名為 `csrf` 的 cookie（非 httpOnly，以便 JS 讀取）
- **AND** cookie 值 MUST 為 cryptographically random 的 hex string

#### Scenario: Mutating request 驗證 CSRF
- **WHEN** 前端發送 POST/PUT/PATCH/DELETE 請求
- **THEN** 前端 MUST 從 `document.cookie` 讀取 csrf 值
- **AND** MUST 將其放入 `X-CSRF-Token` request header

#### Scenario: CSRF 驗證失敗
- **WHEN** mutating request 的 header token 與 cookie token 不一致或缺失
- **THEN** 系統 MUST 回傳 HTTP 403 狀態碼

#### Scenario: Safe methods 不驗證 CSRF
- **WHEN** 請求方法為 GET、HEAD 或 OPTIONS
- **THEN** 系統 MUST 跳過 CSRF 驗證

### Requirement: 密碼重設機制
系統 SHALL 提供 CLI-based 密碼重設功能。

#### Scenario: 產生重設 token
- **WHEN** 管理者在 server 上執行 reset-password CLI 命令
- **THEN** 系統 MUST 產生一次性 token 並寫入 `data/reset-token.txt`
- **AND** MUST 在終端機顯示 token 值

#### Scenario: 使用 token 重設密碼
- **WHEN** 使用者在前端提交 reset token + 新密碼
- **THEN** 系統 MUST 驗證 token 與 `data/reset-token.txt` 一致
- **AND** MUST 用 bcrypt hash 更新密碼
- **AND** MUST 刪除 `data/reset-token.txt`
- **AND** MUST 清除所有既有 session

#### Scenario: Token 使用後失效
- **WHEN** token 已被使用一次
- **THEN** 相同 token MUST 不可再次使用（檔案已刪除）

#### Scenario: 前端重設入口
- **WHEN** 使用者在登入頁點擊「忘記密碼」
- **THEN** 頁面 MUST 顯示操作說明和 token + 新密碼輸入表單

### Requirement: Session 活動日誌
系統 SHALL 記錄所有認證相關事件到 SQLite。

#### Scenario: 登入成功記錄
- **WHEN** 使用者成功登入
- **THEN** 系統 MUST 寫入 event_type='login_success' 記錄，含 IP 和 user agent

#### Scenario: 登入失敗記錄
- **WHEN** 登入嘗試失敗
- **THEN** 系統 MUST 寫入 event_type='login_failure' 記錄

#### Scenario: 鎖定觸發記錄
- **WHEN** 帳號被鎖定
- **THEN** 系統 MUST 寫入 event_type='lockout_triggered' 記錄

#### Scenario: 查詢活動日誌
- **WHEN** 已認證使用者呼叫 `GET /api/auth/activity`
- **THEN** 系統 MUST 回傳最近的活動日誌記錄（預設 50 筆，按時間倒序）

### Requirement: 異常登入 Web Push 通知
系統 SHALL 在偵測到異常登入時發送 web push 通知。

#### Scenario: 新 IP 登入通知
- **WHEN** 登入成功且該 IP 不在近 30 天成功登入的 IP 清單中
- **THEN** 系統 MUST 透過現有 `PushService` 發送通知
- **AND** 通知標題 MUST 為「New Login Detected」，內容包含 IP 位址

#### Scenario: 已知 IP 不通知
- **WHEN** 登入成功且該 IP 在近 30 天內有成功登入記錄
- **THEN** 系統 MUST 不發送通知

### Requirement: 前端安全性 UI 增強
登入頁 SHALL 正確顯示各種安全性相關的錯誤狀態和提示。

#### Scenario: Rate limit 錯誤顯示
- **WHEN** 後端回傳 HTTP 429
- **THEN** 登入頁 MUST 顯示「登入嘗試過於頻繁，請稍後再試」訊息

#### Scenario: 帳號鎖定錯誤顯示
- **WHEN** 後端回傳 HTTP 423
- **THEN** 登入頁 MUST 顯示「帳號已鎖定，請在 N 分鐘後再試」訊息

#### Scenario: 密碼長度提示
- **WHEN** 使用者輸入的密碼少於 8 字元
- **THEN** 登入按鈕 MUST 保持可用（後端負責驗證），但 MAY 顯示小提示文字
