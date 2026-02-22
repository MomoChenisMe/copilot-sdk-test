## ADDED Requirements

### Requirement: Service Worker 註冊

系統 SHALL 在前端啟動時（`main.tsx`）註冊位於 `/sw.js` 的 Service Worker。
註冊 MUST 是非阻塞的（不影響 App 載入速度）。
若瀏覽器不支援 Service Worker，MUST 靜默跳過（不報錯、不影響功能）。

#### Scenario: 成功註冊
- **WHEN** 使用者載入 CodeForge 且瀏覽器支援 Service Worker
- **THEN** sw.js 被成功註冊，scope 為 "/"

#### Scenario: 瀏覽器不支援
- **WHEN** 使用者載入 CodeForge 且瀏覽器不支援 Service Worker
- **THEN** App 正常運作，不顯示錯誤，推播功能靜默不可用

### Requirement: Push Event 處理

Service Worker MUST 監聽 `push` 事件。收到 push event 時：
1. 解析 payload JSON（包含 `title`, `body`, `tag`, `data`）
2. 檢查是否有 focused 的 client window
3. 若有 focused client → 跳過通知顯示（避免與 in-app toast 重複）
4. 若無 focused client → 呼叫 `showNotification()` 顯示系統通知

通知 MUST 包含：
- `title`: 從 payload 取得
- `body`: 從 payload 取得
- `icon`: `/icons/icon-192.png`
- `tag`: 從 payload 取得（用於合併同類通知）
- `data`: 從 payload 取得（用於 click 導航）

#### Scenario: App 在背景時收到 push
- **WHEN** Service Worker 收到 push event 且無 focused client window
- **THEN** 顯示系統推播通知，包含 title、body、icon

#### Scenario: App 在前景時收到 push
- **WHEN** Service Worker 收到 push event 且有 focused client window
- **THEN** 不顯示推播通知（由 in-app toast 處理）

#### Scenario: Push payload 為空
- **WHEN** Service Worker 收到 push event 但 event.data 為 null
- **THEN** 不顯示通知，不拋出錯誤

### Requirement: Notification Click 處理

Service Worker MUST 監聯 `notificationclick` 事件。點擊通知時：
1. 關閉該通知
2. 搜尋所有已開啟的 client window
3. 若找到同 origin 的 window → focus 該 window 並透過 `postMessage` 傳送 `{ type: 'notification-click', data }`
4. 若未找到 → 開啟新 window 到 `data.url` 或 "/"

#### Scenario: 點擊通知時 App 已開啟
- **WHEN** 使用者點擊推播通知且 CodeForge 已在某個 browser tab 開啟
- **THEN** focus 到該 tab，並透過 postMessage 通知 React app 導航到對應頁面

#### Scenario: 點擊通知時 App 未開啟
- **WHEN** 使用者點擊推播通知且沒有 CodeForge 的 browser tab
- **THEN** 開啟新 tab 到通知 data 中的 url

### Requirement: 通知點擊路由整合

前端 MUST 在 `AppShell` 中監聽 Service Worker 的 `message` 事件。
當收到 `type: 'notification-click'` 的訊息時：
- `data.type === 'cron'` → 切換到 Cron tab
- `data.type === 'stream'` 且包含 `conversationId` → 開啟/切換到對應 conversation tab

#### Scenario: 點擊 Cron 通知後導航
- **WHEN** 收到 notification-click message，data.type 為 "cron"
- **THEN** AppShell 切換到 Cron tab

#### Scenario: 點擊 Stream 通知後導航
- **WHEN** 收到 notification-click message，data.type 為 "stream"，包含 conversationId
- **THEN** AppShell 開啟或切換到該 conversationId 的對話 tab

### Requirement: Service Worker 快取策略

Service Worker MUST NOT 做積極的 fetch 快取。所有 fetch 請求 SHALL 直接 pass-through 到網路。
SW 存在的主要目的是支援 Push 通知功能。

#### Scenario: Fetch 請求不被快取
- **WHEN** App 發出 HTTP fetch 請求
- **THEN** 請求直接經過 Service Worker 到網路，不做任何快取處理

### Requirement: Service Worker 更新

Service Worker MUST 使用 `skipWaiting()` 在 install 時立即激活。
在 activate 時 MUST 使用 `clients.claim()` 接管所有 client。

#### Scenario: SW 更新後立即生效
- **WHEN** 部署新版 sw.js
- **THEN** 新版 SW 立即激活並接管現有 client，不需等待舊 tab 關閉
