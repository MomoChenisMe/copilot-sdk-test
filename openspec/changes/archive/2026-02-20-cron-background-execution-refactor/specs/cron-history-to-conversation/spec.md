## ADDED Requirements

### Requirement: 從歷史紀錄開啟新對話 API

系統 MUST 提供 `POST /api/cron/history/:historyId/open-conversation` 端點。

流程：
1. 根據 historyId 查詢 cron_history 紀錄
2. 根據 jobId 查詢 job 名稱
3. 從 configSnapshot 提取 model 和 cwd
4. 建立新 conversation（不含 sdkSessionId）
5. 寫入一則 assistant 角色的摘要訊息
6. 更新 conversation title 為 `Cron: {jobName} ({startedAt 格式化})`
7. 回傳 `{ conversation: Conversation }`

摘要訊息 MUST 包含：
- Job 名稱
- 執行狀態
- 開始/結束時間
- 原始 prompt（如有）
- AI 回覆內容（如有）
- 使用的 tool 數量（如有）

摘要訊息的 metadata MUST 包含：
- `cronExecution: true`
- `historyId: string`
- `jobId: string`
- `turnSegments`（如有）
- `toolRecords`（如有）
- `usage`（如有）

#### Scenario: 成功開啟為對話
- **WHEN** POST /api/cron/history/:historyId/open-conversation，historyId 存在
- **THEN** 系統建立新 conversation，寫入摘要 assistant message，回傳 201 + conversation 物件

#### Scenario: 歷史紀錄不存在
- **WHEN** POST /api/cron/history/:historyId/open-conversation，historyId 不存在
- **THEN** 回傳 404 `{ error: 'History record not found' }`

#### Scenario: 摘要訊息格式
- **WHEN** 成功開啟包含 tool records 的歷史紀錄
- **THEN** 摘要訊息包含 Markdown 格式的 job 名稱、狀態、時間、prompt、回覆內容、tool 使用數量

#### Scenario: 對話可以繼續互動
- **WHEN** 用戶在摘要對話中發送新訊息
- **THEN** 系統建立新的 SDK session（因為 sdkSessionId 為 null），正常進行對話

---

### Requirement: 前端「開啟為對話」流程

前端 MUST 提供從 CronPage 歷史紀錄開啟新對話的完整流程。

流程：
1. 用戶點擊歷史紀錄的「開啟為對話」按鈕
2. 呼叫 `POST /api/cron/history/:historyId/open-conversation`
3. 將回傳的 conversation 加入 store
4. 開啟新的 copilot tab 並載入該 conversation
5. 切換到該 tab

#### Scenario: 點擊開啟為對話
- **WHEN** 用戶在 CronPage 的歷史紀錄列表中點擊「開啟為對話」
- **THEN** 系統建立新對話、開啟新 copilot tab、顯示摘要訊息、用戶可以繼續發送訊息

#### Scenario: 開啟為對話後原始歷史紀錄不受影響
- **WHEN** 用戶從同一筆歷史紀錄多次「開啟為對話」
- **THEN** 每次都建立新的獨立 conversation，歷史紀錄不被修改

---

### Requirement: 前端 Cron API 擴充

`frontend/src/lib/api.ts` 的 `cronApi` MUST 新增：

- `openAsConversation(historyId: string)` → POST /api/cron/history/:historyId/open-conversation
- `getRecentHistory(limit?: number)` → GET /api/cron/history/recent
- `getUnreadCount(since?: string)` → GET /api/cron/history/unread-count

`CronHistory` type MUST 擴充包含新欄位：prompt、configSnapshot、turnSegments、toolRecords、reasoning、usage、content（全部 nullable）。

#### Scenario: 呼叫 openAsConversation
- **WHEN** 前端呼叫 cronApi.openAsConversation(historyId)
- **THEN** 發送 POST 請求並回傳 `{ conversation: Conversation }`

#### Scenario: 呼叫 getRecentHistory
- **WHEN** 前端呼叫 cronApi.getRecentHistory(20)
- **THEN** 發送 GET 請求並回傳 `{ history: (CronHistory & { jobName: string })[] }`
