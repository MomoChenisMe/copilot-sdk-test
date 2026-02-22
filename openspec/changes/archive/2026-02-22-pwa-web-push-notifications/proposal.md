## Why

CodeForge 目前的通知機制僅限瀏覽器內 Toast（透過 WebSocket 廣播），當使用者關閉或最小化網頁後，Cron 任務完成或 AI 對話回覆完全無法得知。作為一個跑在 VPS 上、透過手機瀏覽器操控的開發工具，這是核心體驗缺口——使用者經常啟動背景任務後切到其他 app，卻不知道何時完成。

透過 PWA + Web Push，CodeForge 可安裝到手機主畫面如同原生 APP，並在背景任務完成時推播通知，點擊直接開啟對應頁面。不依賴任何外部服務（無 Telegram、ntfy），全部內建。

## What Changes

- **PWA 支援**：新增 `manifest.json`、Service Worker、app icons，讓 CodeForge 可安裝到 iOS/Android 主畫面
- **Web Push 後端**：引入 `web-push` npm 套件，新增 VAPID 金鑰管理、推播訂閱儲存（SQLite）、推播發送服務
- **Web Push API 路由**：新增 `/api/push/vapid-public-key`、`/api/push/subscribe`、`/api/push/unsubscribe`、`/api/push/test`
- **事件鉤子**：在 `stream:idle` 和 cron broadcast 事件中觸發推播通知
- **前端訂閱流程**：新增 `usePushNotifications` hook 管理權限請求和訂閱狀態
- **通知設定 UI**：在 Settings 頁面新增 Notifications section，可開關推播、選擇通知類型
- **Service Worker 智慧通知**：App 在前景時跳過推播（避免跟 toast 重複），點擊通知導航到對應頁面

## Non-Goals

- **離線支援**：Service Worker 不做積極快取，CodeForge 依賴 VPS 連線運作
- **Telegram / LINE / ntfy 整合**：本次僅做 Web Push，不整合第三方通訊平台
- **雙向推播互動**：推播僅為單向通知，不支援在通知中回覆或操作
- **多使用者推播管理**：CodeForge 為個人工具，不需要 per-user 訂閱路由
- **推播內容自訂模板**：通知格式固定，不提供使用者自訂樣板

## Capabilities

### New Capabilities

- `pwa-manifest`: PWA manifest、icons、meta tags，讓應用可安裝到手機主畫面
- `service-worker`: Service Worker 生命週期管理、push event 處理、notification click 導航
- `web-push-backend`: VAPID 金鑰管理、推播訂閱 CRUD（SQLite）、推播發送服務
- `push-notification-triggers`: 在 cron 完成和 stream:idle 事件中觸發推播通知
- `push-settings-ui`: Settings 頁面的推播通知開關和偏好設定 UI

### Modified Capabilities

- `backend-settings-api`: AppSettings interface 新增 `pushNotifications` 欄位（enabled, cronEnabled, streamEnabled）

## Impact

### 新增依賴
- `web-push` npm 套件（backend）

### 新增 API 路由
- `GET /api/push/vapid-public-key` — 取得 VAPID 公鑰
- `POST /api/push/subscribe` — 儲存推播訂閱
- `POST /api/push/unsubscribe` — 移除推播訂閱
- `POST /api/push/test` — 發送測試推播

### 資料庫變動
- 新增 `push_subscriptions` 表（id, endpoint, p256dh, auth, created_at, last_used_at）

### 檔案系統
- 新增 `VAPID_KEYS.json` 於 prompts 目錄（自動生成，不需手動建立）

### 受影響的既有檔案
- `backend/src/index.ts` — Push 服務初始化、事件鉤子
- `backend/src/settings/settings-store.ts` — AppSettings 擴展
- `frontend/index.html` — PWA meta tags
- `frontend/src/main.tsx` — Service Worker 註冊
- `frontend/src/lib/settings-api.ts` — AppSettings 擴展
- `frontend/src/components/settings/SettingsPanel.tsx` — Notifications UI
- `frontend/src/components/layout/AppShell.tsx` — 通知點擊路由
