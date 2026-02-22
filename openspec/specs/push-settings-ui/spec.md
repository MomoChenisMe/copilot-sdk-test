## ADDED Requirements

### Requirement: 推播通知權限管理 Hook

系統 SHALL 提供 `usePushNotifications` React hook，管理推播通知的訂閱狀態和權限。

Hook MUST 回傳以下狀態和方法：
- `isSupported`: boolean — 瀏覽器是否支援推播（`serviceWorker in navigator` 且 `PushManager` 存在）
- `isSubscribed`: boolean — 是否已訂閱推播
- `permission`: NotificationPermission（'default' | 'granted' | 'denied'）— 瀏覽器通知權限狀態
- `requestSubscription()`: 請求權限 → 建立訂閱 → 送到後端
- `cancelSubscription()`: 取消訂閱 → 通知後端

不支援推播的狀態由 `isSupported: false` 表達，與 `permission` 分離以保持型別簡潔。

#### Scenario: 瀏覽器支援推播且未訂閱
- **WHEN** hook 初始化於支援推播的瀏覽器
- **THEN** isSupported 為 true，permission 為 'default'，isSubscribed 為 false

#### Scenario: 瀏覽器不支援推播
- **WHEN** hook 初始化於不支援 Service Worker 或 PushManager 的瀏覽器
- **THEN** isSupported 為 false

#### Scenario: 使用者授權並訂閱
- **WHEN** 呼叫 requestSubscription() 且使用者授權通知權限
- **THEN** 建立 PushManager subscription → POST 到 /api/push/subscribe → isSubscribed 變為 true

#### Scenario: 使用者拒絕權限
- **WHEN** 呼叫 requestSubscription() 但使用者拒絕通知權限
- **THEN** permission 變為 'denied'，isSubscribed 保持 false

#### Scenario: 取消訂閱
- **WHEN** 呼叫 cancelSubscription()
- **THEN** PushManager subscription 被取消 → POST 到 /api/push/unsubscribe → isSubscribed 變為 false

### Requirement: Settings 頁面通知設定 UI

系統 SHALL 在 Settings 頁面的 GeneralTab 中（Language section 和 Logout section 之間）新增 Notifications section。

UI 行為：
- 若瀏覽器不支援推播 → 整個 section 不顯示
- 若權限被拒絕 → 顯示提示文字引導使用者到瀏覽器設定啟用
- 若未訂閱 → 顯示「啟用推播通知」按鈕
- 若已訂閱 → 顯示：
  - 推播通知 toggle（開/關）
  - Cron Job 完成通知 checkbox
  - AI 回覆完成通知 checkbox

偏好變更 MUST 即時 PATCH 到 `/api/settings`。

#### Scenario: 首次啟用推播
- **WHEN** 使用者點擊「啟用推播通知」按鈕
- **THEN** 瀏覽器彈出通知權限提示，授權後訂閱成功，UI 切換到已訂閱狀態

#### Scenario: 關閉 Cron 通知
- **WHEN** 使用者取消勾選 Cron Job 完成通知 checkbox
- **THEN** PATCH /api/settings 更新 pushNotifications.cronEnabled 為 false

#### Scenario: 瀏覽器不支援推播
- **WHEN** 在不支援 Service Worker 的瀏覽器載入 Settings
- **THEN** Notifications section 不顯示

#### Scenario: 權限已被拒絕
- **WHEN** 瀏覽器通知權限為 'denied'
- **THEN** 顯示提示文字「推播通知已被封鎖，請在瀏覽器設定中啟用」

### Requirement: Push API 前端客戶端

系統 SHALL 提供 `push-api.ts` 模組，封裝所有推播相關的 API 呼叫：
- `getVapidPublicKey()` → `GET /api/push/vapid-public-key`
- `subscribe(subscription)` → `POST /api/push/subscribe`
- `unsubscribe(endpoint)` → `POST /api/push/unsubscribe`
- `test()` → `POST /api/push/test`

#### Scenario: 取得 VAPID 公鑰
- **WHEN** 呼叫 getVapidPublicKey()
- **THEN** 發送 GET /api/push/vapid-public-key 並回傳 publicKey 字串

#### Scenario: 訂閱推播
- **WHEN** 呼叫 subscribe(subscription)
- **THEN** 發送 POST /api/push/subscribe 並回傳 `{ ok: true }`
