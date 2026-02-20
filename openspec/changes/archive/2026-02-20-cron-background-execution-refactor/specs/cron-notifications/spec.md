## ADDED Requirements

### Requirement: WebSocket Cron Handler

系統 MUST 在 WS router 註冊 `cron` prefix handler，管理 cron 事件的訂閱和廣播。

Handler MUST 支援：
- `cron:subscribe` — 客戶端訂閱 cron 事件通知
- `cron:unsubscribe` — 客戶端取消訂閱
- `broadcast(msg)` — 向所有訂閱者廣播 cron 事件

#### Scenario: 客戶端訂閱 cron 通知
- **WHEN** 客戶端發送 `cron:subscribe` 訊息
- **THEN** 客戶端的 send 函數被加入 subscribers set，並收到 `cron:subscribed` 回應

#### Scenario: 客戶端取消訂閱
- **WHEN** 已訂閱的客戶端發送 `cron:unsubscribe` 訊息
- **THEN** 客戶端的 send 函數從 subscribers set 移除

#### Scenario: 客戶端斷線自動清理
- **WHEN** 已訂閱的客戶端 WebSocket 斷線
- **THEN** onDisconnect 自動從 subscribers set 移除該客戶端

#### Scenario: 廣播到多個訂閱者
- **WHEN** broadcast() 被呼叫且有 3 個訂閱者
- **THEN** 3 個訂閱者都收到相同的訊息；單一訂閱者的 send 失敗不影響其他訂閱者

---

### Requirement: Cron Job 完成通知

CronScheduler MUST 在 job 執行完畢後透過 WebSocket 廣播通知。

**成功時：** 發送 `cron:job_completed` 事件
**失敗/超時時：** 發送 `cron:job_failed` 事件

通知 payload MUST 包含：
- `historyId: string` — 歷史紀錄 ID
- `jobId: string` — Job ID
- `jobName: string` — Job 名稱
- `status: 'success' | 'error' | 'timeout'`
- `startedAt: string` — ISO 時間戳
- `finishedAt: string` — ISO 時間戳
- `outputPreview: string` — output 的前 200 字元

#### Scenario: Job 成功完成
- **WHEN** AI cron job 成功執行完畢
- **THEN** 系統廣播 `cron:job_completed` 事件，payload 包含 jobName、status='success'、outputPreview

#### Scenario: Job 執行失敗
- **WHEN** AI cron job 執行拋出錯誤
- **THEN** 系統廣播 `cron:job_failed` 事件，payload 包含 status='error'、outputPreview 包含錯誤訊息

#### Scenario: 無訂閱者時不報錯
- **WHEN** job 完成但無任何 WebSocket 訂閱者
- **THEN** broadcast 正常執行，不拋出錯誤

---

### Requirement: 前端 Toast 通知系統

系統 MUST 提供全域 Toast 通知元件，支援：
- 3 種類型：`success`（綠色）、`error`（紅色）、`info`（藍色）
- 自動消失（預設 5 秒）
- 可點擊（onClick callback）
- 固定在畫面右上角（`fixed top-4 right-4 z-50`）

Zustand store MUST 新增：
- `toasts: ToastItem[]`
- `addToast(toast: Omit<ToastItem, 'id'>): void`
- `removeToast(id: string): void`

`ToastItem` MUST 包含：
- `id: string`（自動生成）
- `type: 'success' | 'error' | 'info'`
- `title: string`
- `message?: string`
- `duration?: number`（ms，預設 5000）
- `onClick?: () => void`

#### Scenario: 顯示 success toast
- **WHEN** 呼叫 addToast({ type: 'success', title: 'Done' })
- **THEN** 右上角顯示綠色 toast，5 秒後自動消失

#### Scenario: 顯示 error toast 且可點擊
- **WHEN** 呼叫 addToast({ type: 'error', title: 'Failed', onClick: handler })
- **THEN** 右上角顯示紅色 toast，點擊觸發 handler

#### Scenario: 自動消失
- **WHEN** toast 顯示 5 秒後（或自訂 duration）
- **THEN** toast 自動從畫面移除，store 中對應 ToastItem 被刪除

#### Scenario: 多個 toast 堆疊
- **WHEN** 同時有多個 toast 被加入
- **THEN** toast 垂直堆疊顯示，各自獨立計時消失

---

### Requirement: 前端 Cron 通知 Hook

系統 MUST 提供 `useCronNotifications` hook，在 AppShell 內呼叫：
1. 連線時發送 `cron:subscribe`
2. 監聽 `cron:job_completed` → 呼叫 addToast(success) + 增加 badge count
3. 監聯 `cron:job_failed` → 呼叫 addToast(error) + 增加 badge count

#### Scenario: 收到 job_completed 通知
- **WHEN** WebSocket 收到 `cron:job_completed` 事件
- **THEN** 顯示 success toast（標題包含 jobName）且 cronUnreadCount 增加 1

#### Scenario: 收到 job_failed 通知
- **WHEN** WebSocket 收到 `cron:job_failed` 事件
- **THEN** 顯示 error toast（標題包含 jobName、message 包含 outputPreview 前 100 字元）且 cronUnreadCount 和 cronFailedCount 各增加 1

---

### Requirement: TabBar Cron Badge

TabBar MUST 顯示永駐的 Cron 圖標按鈕（Clock icon），帶 badge 顯示未讀數。

Zustand store MUST 新增：
- `cronUnreadCount: number`（預設 0）
- `cronFailedCount: number`（預設 0）
- `setCronBadge(unread: number, failed: number): void`

Badge 顯示規則：
- 無未讀：不顯示 badge
- 有未讀但無失敗：顯示 accent 色 badge + 未讀數
- 有失敗：顯示 error 色（紅色）badge + 失敗數

#### Scenario: 無未讀時
- **WHEN** cronUnreadCount === 0 且 cronFailedCount === 0
- **THEN** Cron icon 不顯示 badge

#### Scenario: 有未讀無失敗
- **WHEN** cronUnreadCount === 3 且 cronFailedCount === 0
- **THEN** Cron icon 顯示 accent 色 badge 數字 3

#### Scenario: 有失敗
- **WHEN** cronFailedCount === 2
- **THEN** Cron icon 顯示紅色 badge 數字 2

#### Scenario: 切換到 Cron 頁面時清除 badge
- **WHEN** 用戶切換到 Cron tab（mode='cron'）
- **THEN** cronUnreadCount 和 cronFailedCount 重設為 0
