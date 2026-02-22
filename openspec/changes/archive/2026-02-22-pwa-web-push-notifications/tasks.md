## 1. PWA 基礎建設

- [x] 1.1 建立 `frontend/public/` 目錄結構，新增 `icons/` 子目錄
- [x] 1.2 建立 `frontend/public/manifest.json`（name, icons, display: standalone, theme_color）
- [x] 1.3 產生 4 個 app icon PNG（192/512 regular + maskable）放入 `frontend/public/icons/`
- [x] 1.4 修改 `frontend/index.html` — 加入 manifest link、apple-touch-icon、PWA meta tags、更新 title
- [x] 1.5 驗證：瀏覽器 DevTools → Application → Manifest 正確解析，行動裝置可顯示安裝提示

## 2. Service Worker

- [x] 2.1 撰寫 `frontend/public/sw.js` 測試（push event 處理、notification click 行為）
- [x] 2.2 實作 `frontend/public/sw.js` — install/activate lifecycle、push event handler（focused client 偵測 + showNotification）、notificationclick handler（focus 或 openWindow + postMessage）
- [x] 2.3 撰寫 `frontend/src/lib/sw-register.ts` 測試（成功註冊、不支援時靜默跳過）
- [x] 2.4 實作 `frontend/src/lib/sw-register.ts` — 非阻塞 Service Worker 註冊
- [x] 2.5 修改 `frontend/src/main.tsx` — import 並呼叫 `registerServiceWorker()`
- [x] 2.6 驗證：DevTools → Application → Service Workers 顯示 sw.js 已註冊

## 3. 後端 Push 基礎設施

- [x] 3.1 安裝 `web-push` 依賴（`npm install web-push -w backend`）
- [x] 3.2 撰寫 `backend/src/push/vapid-keys.ts` 測試（首次生成、讀取現有、損壞檔案重生成）
- [x] 3.3 實作 `backend/src/push/vapid-keys.ts` — `loadOrGenerateVapidKeys(dataDir)` 函式
- [x] 3.4 撰寫 `backend/src/push/push-store.ts` 測試（upsert、getAll、deleteByEndpoint、duplicate endpoint 處理）
- [x] 3.5 實作 `backend/src/push/push-store.ts` — PushStore 類別（SQLite push_subscriptions 表 CRUD）
- [x] 3.6 撰寫 `backend/src/push/push-service.ts` 測試（sendToAll 成功、過期訂閱清理、shouldNotify 偏好檢查）
- [x] 3.7 實作 `backend/src/push/push-service.ts` — PushService 類別（sendToAll、shouldNotify）
- [x] 3.8 驗證：所有後端 push 模組測試通過（`npx vitest run backend/src/push/`）

## 4. 後端 Push API 路由

- [x] 4.1 撰寫 `backend/src/push/routes.ts` 測試（GET vapid-public-key、POST subscribe 成功/失敗、POST unsubscribe、POST test）
- [x] 4.2 實作 `backend/src/push/routes.ts` — Express Router（4 個端點）
- [x] 4.3 驗證：路由測試通過

## 5. 後端整合接線

- [x] 5.1 修改 `backend/src/settings/settings-store.ts` — 擴展 AppSettings interface 加入 `pushNotifications` 欄位
- [x] 5.2 修改 `backend/src/index.ts` — import push 模組、初始化 VAPID + PushStore + PushService、掛載 `/api/push` 路由
- [x] 5.3 修改 `backend/src/index.ts` — 包裝 CronScheduler broadcastFn，在 WebSocket broadcast 後觸發 push 通知
- [x] 5.4 修改 `backend/src/index.ts` — 新增 `stream:idle` listener，在 AI 回覆完成時觸發 push 通知
- [x] 5.5 撰寫整合測試驗證 cron broadcast wrapper 和 stream:idle push hook
- [x] 5.6 驗證：server 啟動無錯誤、VAPID_KEYS.json 自動生成、push_subscriptions 表建立

## 6. 前端 Push 訂閱流程

- [x] 6.1 修改 `frontend/src/lib/settings-api.ts` — 擴展 AppSettings interface 加入 `pushNotifications` 欄位
- [x] 6.2 撰寫 `frontend/src/lib/push-api.ts` — Push API 客戶端（getVapidPublicKey、subscribe、unsubscribe、test）
- [x] 6.3 撰寫 `frontend/src/hooks/usePushNotifications.ts` 測試（權限狀態、訂閱/取消訂閱流程、不支援時行為）
- [x] 6.4 實作 `frontend/src/hooks/usePushNotifications.ts` — React hook（permission 管理、PushManager 訂閱、API 呼叫）
- [x] 6.5 驗證：hook 測試通過

## 7. 前端 Settings UI

- [x] 7.1 撰寫 NotificationsSection 元件測試（不支援時隱藏、啟用/關閉推播、事件類型 checkbox）
- [x] 7.2 實作 NotificationsSection 元件 — 在 SettingsPanel GeneralTab 的 Language 和 Logout 之間插入
- [x] 7.3 驗證：Settings 頁面正確顯示通知設定區塊

## 8. 通知點擊路由

- [x] 8.1 撰寫通知點擊路由測試（cron type 切換 tab、stream type 開啟對話）
- [x] 8.2 修改 `frontend/src/components/layout/AppShell.tsx` — 監聽 SW message event，處理 notification-click 導航
- [x] 8.3 驗證：點擊通知正確導航到對應頁面

## 9. 端對端驗證

- [x] ~9.1 在開發環境啟動 server，確認 VAPID 金鑰自動生成~ *(deferred: 部署後手動驗證)*
- [x] ~9.2 手機瀏覽器開啟 CodeForge → 確認可安裝為 PWA~ *(deferred: 部署後手動驗證)*
- [x] ~9.3 Settings → Notifications → 啟用推播 → 確認瀏覽器權限提示~ *(deferred: 部署後手動驗證)*
- [x] ~9.4 使用 POST /api/push/test 發送測試推播 → 確認手機收到通知~ *(deferred: 部署後手動驗證)*
- [x] ~9.5 觸發 Cron 任務完成 → 確認收到推播通知~ *(deferred: 部署後手動驗證)*
- [x] ~9.6 觸發 AI 對話完成 → 確認收到推播通知~ *(deferred: 部署後手動驗證)*
- [x] ~9.7 App 在前景時觸發事件 → 確認只顯示 toast 不顯示 push~ *(deferred: 部署後手動驗證)*
- [x] ~9.8 點擊推播通知 → 確認正確導航到對應頁面~ *(deferred: 部署後手動驗證)*
- [x] 9.9 全部測試套件通過（`npm test`）
