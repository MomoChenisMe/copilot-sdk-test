## Context

CodeForge 是跑在 Linux VPS 上的個人 AI 開發工具，透過手機瀏覽器操控。目前通知機制僅限瀏覽器內 Toast（WebSocket 廣播），關閉頁面即失去所有通知能力。使用者經常啟動 Cron 背景任務或 AI 對話後切到其他 app，無法得知何時完成。

現有架構：
- 後端 `CronScheduler` 透過 `broadcastFn` 廣播任務完成事件到 WebSocket 訂閱者
- `StreamManager` 在 AI 回覆完成時 emit `stream:idle` 事件
- 前端 `useCronNotifications` hook 監聽 WebSocket 事件顯示 Toast
- 設定儲存在 `SETTINGS.json`（透過 `SettingsStore`）
- SQLite 作為主要資料儲存

## Goals / Non-Goals

**Goals:**
- 讓 CodeForge 可安裝為 PWA（iOS/Android 主畫面）
- Cron 任務和 AI 對話完成時推播 Web Push 通知到手機
- 點擊通知直接開啟 CodeForge 對應頁面
- 提供使用者控制推播開關的 Settings UI
- App 在前景時智慧跳過推播（避免 toast 重複）

**Non-Goals:**
- 離線快取（SW 不做積極 caching，CodeForge 需連線運作）
- 第三方通訊整合（Telegram、LINE、ntfy）
- 推播內容自訂模板
- 多使用者推播管理

## Decisions

### Decision 1: 手動 Service Worker vs vite-plugin-pwa

**選擇：手動 Service Worker（`public/sw.js`）**

替代方案：使用 `vite-plugin-pwa` 自動生成 SW + manifest
- 優點：自動化、Workbox 快取策略
- 缺點：Web Push 需要自訂 `push` 和 `notificationclick` event handler，用 Workbox `InjectManifest` 模式等同於手寫 SW 的工作量，且增加一個依賴和配置表面

理由：CodeForge 不需要離線快取，SW 的唯一目的是處理 Push 事件。一個 ~50 行的 `sw.js` 比引入 vite-plugin-pwa 的完整依賴鏈更乾淨，符合專案極簡風格（raw `ws`、raw `better-sqlite3`）。

### Decision 2: 後端推播套件選擇

**選擇：`web-push` npm 套件**

替代方案：自行實作 Web Push Protocol（RFC 8030 + VAPID）
- 優點：零依賴
- 缺點：需處理 ECDH key agreement、AES-GCM 加密、JWT 簽章等低階密碼學操作，實作工作量大且容易出錯

理由：`web-push` 是事實上的標準實作，輕量且維護良好。VAPID 金鑰管理、payload 加密、HTTP/2 推送全部封裝好。

### Decision 3: 推播訂閱儲存方式

**選擇：SQLite（與既有對話 DB 共用）**

替代方案 A：檔案系統（類似 SETTINGS.json）
- 優點：簡單
- 缺點：多裝置時多筆訂閱不好管理，CRUD 操作不原子性

替代方案 B：獨立 SQLite DB
- 優點：隔離
- 缺點：多一個 DB 連線管理，過度工程

理由：推播訂閱本質是結構化資料（endpoint + keys），需要 CRUD 操作和自動清理。共用既有 `db` 實例最簡單，`push_subscriptions` 表與 `conversations` 表同級。

### Decision 4: VAPID 金鑰儲存位置

**選擇：`{promptsPath}/VAPID_KEYS.json`（與 SETTINGS.json 同目錄）**

替代方案：環境變數
- 優點：部署時更安全
- 缺點：VAPID 金鑰是 base64 字串，需自行管理生成和配置

理由：CodeForge 是個人 VPS 工具，`promptsPath` 已經存放敏感設定。VAPID 金鑰不需要隨程式碼部署，自動生成最省事。首次啟動時自動生成並持久化。

### Decision 5: 前景推播去重策略

**選擇：Service Worker 內偵測 focused client 並跳過推播**

替代方案：後端檢查 WebSocket 連線狀態再決定是否推送
- 優點：不發送無用推播
- 缺點：WebSocket 連線狀態不精確（可能連線中但 tab 在背景）

理由：SW 的 `clients.matchAll()` + `client.focused` 可精確判斷 App 是否在前景。在 SW 層過濾比後端判斷更可靠，且保持後端邏輯簡單（always push）。

### Decision 6: Cron 事件攔截方式

**選擇：統一 `stream:idle` listener + `cronEnabled` 判斷**

替代方案 A：包裝 `broadcastFn`（broadcast wrapper pattern）
- 優點：直接攔截 cron broadcast 事件
- 缺點：需要區分 broadcast 事件類型，且 conversation cron 實際上使用 streamManager.startStream()，最終也會 emit stream:idle

替代方案 B：修改 `CronScheduler` 類別，新增 push callback
- 優點：更明確
- 缺點：修改核心類別，增加耦合

理由：Conversation cron 任務透過 `streamManager.startStream()` 執行，完成後自然 emit `stream:idle`。在單一 `stream:idle` listener 中，透過 `conversation.cronEnabled` 判斷事件來源（cron vs 一般對話），統一處理推播邏輯。無需包裝 broadcastFn，更簡潔且零侵入。

## Risks / Trade-offs

**[iOS Safari 限制]** → iOS 16.4+ 才支援 Web Push，且必須先「加入主畫面」安裝為 PWA。
緩解：在 Settings UI 中加入 iOS 安裝提示文字。

**[VAPID 金鑰遺失]** → 若 `VAPID_KEYS.json` 被刪除，重啟時自動重新生成，但所有現有訂閱失效。
緩解：使用者需重新訂閱。訂閱過期（HTTP 410）時自動從 DB 清理。

**[推播延遲]** → Web Push 的送達時間取決於瀏覽器 vendor（Apple/Google push server），通常 1-5 秒，偶爾更久。
緩解：推播是 best-effort 通知，in-app toast 仍是可靠備援。

**[Service Worker 更新]** → SW 使用 `skipWaiting()` 立即激活，可能導致短暫的新舊版本不一致。
緩解：CodeForge 的 SW 功能單一（僅處理 push），版本間差異影響極小。

**[self-signed HTTPS]** → Web Push 要求有效 HTTPS 證書。若使用自簽證書，push 訂閱會失敗。
緩解：VPS 已使用 Let's Encrypt + Nginx，不受影響。

## Open Questions

- 是否需要推播通知的 i18n 支援（目前通知內容固定為英文 + 中文混用）？
- 未來是否需要 per-conversation 的推播偏好（例如只通知特定對話）？
