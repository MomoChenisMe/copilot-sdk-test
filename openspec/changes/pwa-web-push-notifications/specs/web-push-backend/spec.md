## ADDED Requirements

### Requirement: VAPID 金鑰管理

系統 SHALL 自動管理 VAPID 金鑰對。
- 啟動時檢查 `{promptsPath}/VAPID_KEYS.json` 是否存在
- 若不存在 → 使用 `web-push.generateVAPIDKeys()` 生成並持久化
- 若存在 → 讀取並使用
- 金鑰 MUST 在 server 啟動時呼叫 `webpush.setVapidDetails()` 設定

#### Scenario: 首次啟動自動生成 VAPID 金鑰
- **WHEN** server 啟動且 VAPID_KEYS.json 不存在
- **THEN** 自動生成 VAPID key pair，寫入 VAPID_KEYS.json，並設定到 web-push

#### Scenario: 重複啟動讀取現有金鑰
- **WHEN** server 啟動且 VAPID_KEYS.json 已存在
- **THEN** 讀取現有金鑰並設定到 web-push，不重新生成

#### Scenario: VAPID 檔案損壞
- **WHEN** server 啟動且 VAPID_KEYS.json 存在但格式無效
- **THEN** 重新生成金鑰並覆寫檔案

### Requirement: 推播訂閱儲存

系統 SHALL 在 SQLite 資料庫中建立 `push_subscriptions` 表，以 `endpoint` 作為 primary key（每個推播訂閱的 endpoint URL 天然唯一，無需額外 id 欄位）。欄位：
- `endpoint` (TEXT PRIMARY KEY)
- `p256dh` (TEXT NOT NULL)
- `auth` (TEXT NOT NULL)
- `created_at` (TEXT NOT NULL DEFAULT datetime('now'))
- `updated_at` (TEXT NOT NULL DEFAULT datetime('now'))

PushStore MUST 提供以下操作：
- `upsert(subscription)` — 新增或更新訂閱（ON CONFLICT(endpoint) 更新 keys 和 updated_at）
- `getAll()` — 取得所有訂閱
- `deleteByEndpoint(endpoint)` — 依 endpoint 刪除

#### Scenario: 新增訂閱
- **WHEN** 呼叫 upsert 且 endpoint 不存在
- **THEN** 建立新記錄

#### Scenario: 更新既有訂閱
- **WHEN** 呼叫 upsert 且 endpoint 已存在
- **THEN** 更新 p256dh 和 auth，更新 updated_at，不建立重複記錄

#### Scenario: 刪除訂閱
- **WHEN** 呼叫 deleteByEndpoint
- **THEN** 刪除對應記錄

### Requirement: GET /api/push/vapid-public-key 端點

系統 SHALL 提供 `GET /api/push/vapid-public-key` 端點，回傳 VAPID 公鑰。
此端點 MUST 受 auth middleware 保護。

#### Scenario: 取得 VAPID 公鑰
- **WHEN** 已認證使用者發送 `GET /api/push/vapid-public-key`
- **THEN** 回傳 200 和 `{ publicKey: "<base64url-encoded-key>" }`

### Requirement: POST /api/push/subscribe 端點

系統 SHALL 提供 `POST /api/push/subscribe` 端點，接受 PushSubscription 物件並儲存。
此端點 MUST 受 auth middleware 保護。
Request body MUST 包含 `subscription` 物件，其中需有 `endpoint`、`keys.p256dh`、`keys.auth`。

#### Scenario: 成功訂閱
- **WHEN** 發送有效的 subscription 物件
- **THEN** 儲存到 push_subscriptions 表，回傳 201 和 `{ ok: true }`

#### Scenario: 無效的 subscription
- **WHEN** 發送缺少 endpoint 或 keys 的物件
- **THEN** 回傳 400 和 `{ error: "Missing endpoint or keys (p256dh, auth)" }`

### Requirement: POST /api/push/unsubscribe 端點

系統 SHALL 提供 `POST /api/push/unsubscribe` 端點，依 endpoint 刪除訂閱。
此端點 MUST 受 auth middleware 保護。

#### Scenario: 成功取消訂閱
- **WHEN** 發送包含 endpoint 的 request body
- **THEN** 從 push_subscriptions 表刪除對應記錄，回傳 200 和 `{ ok: true }`

#### Scenario: 缺少 endpoint
- **WHEN** 發送不包含 endpoint 的 request body
- **THEN** 回傳 400 和 `{ error: "Missing endpoint" }`

### Requirement: POST /api/push/test 端點

系統 SHALL 提供 `POST /api/push/test` 端點，向所有訂閱發送測試通知。
此端點 MUST 受 auth middleware 保護。

#### Scenario: 發送測試通知
- **WHEN** 發送 `POST /api/push/test`
- **THEN** 向所有訂閱發送測試推播，回傳 200 和 `{ ok: true }`

### Requirement: 推播發送服務

PushService MUST 提供 `sendToAll(payload)` 方法，向所有訂閱發送推播通知。
payload MUST 包含 `title`、`body` 欄位，可選 `tag` 和 `data`。

發送失敗處理：
- HTTP 404 或 410 → 自動從 DB 刪除該訂閱（已過期）
- 其他錯誤 → log 記錄，不重試

PushService MUST 提供 `shouldNotify(eventType)` 方法，檢查是否應該推送指定類型的通知。
- 檢查 `pushNotifications.enabled` 設定
- 檢查 `pushNotifications.cronEnabled`（eventType === 'cron'）
- 檢查 `pushNotifications.streamEnabled`（eventType === 'stream'）

#### Scenario: 成功推送到所有訂閱
- **WHEN** 呼叫 sendToAll 且有 3 筆有效訂閱
- **THEN** 向 3 個 endpoint 都發送推播

#### Scenario: 過期訂閱自動清理
- **WHEN** 呼叫 sendToAll 且某訂閱回傳 HTTP 410
- **THEN** 自動從 push_subscriptions 表刪除該訂閱

#### Scenario: 推播未啟用
- **WHEN** 呼叫 shouldNotify('cron') 且 pushNotifications.enabled 為 false
- **THEN** 回傳 false

#### Scenario: 特定事件類型未啟用
- **WHEN** 呼叫 shouldNotify('cron') 且 pushNotifications.cronEnabled 為 false
- **THEN** 回傳 false
