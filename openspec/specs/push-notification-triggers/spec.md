## ADDED Requirements

### Requirement: Cron 任務完成觸發推播

系統 SHALL 在 Cron 任務完成時觸發 Web Push 通知。
Conversation cron 使用 `streamManager.startStream()` 執行，完成後 emit `stream:idle` 事件。
系統透過監聽 `stream:idle` 事件並檢查 `conversation.cronEnabled` 來辨識 cron 完成，
統一在同一個 listener 中處理 cron 和一般 stream 的推播（無需包裝 broadcastFn）。

推播 payload：
- `title`: "Cron Job Completed"
- `body`: conversation title（即 cron job 名稱）
- `tag`: `cron-<conversationId>`（用於合併同 conversation 的通知）
- `data.type`: "cron"
- `data.url`: "/"
- `data.conversationId`: conversation ID

推播前 MUST 呼叫 `pushService.shouldNotify('cron')` 檢查使用者偏好。

#### Scenario: Cron 任務完成
- **WHEN** StreamManager emit stream:idle 且 conversation.cronEnabled 為 true 且推播已啟用
- **THEN** 發送 Web Push 通知，title 為 "Cron Job Completed"，body 包含 conversation title

#### Scenario: 推播未啟用
- **WHEN** stream:idle 觸發但 pushNotifications.cronEnabled 為 false
- **THEN** 不發送 Web Push 通知（WebSocket broadcast 和 memory extraction 不受影響）

#### Scenario: 推播失敗不影響其他處理
- **WHEN** Web Push 發送失敗
- **THEN** 錯誤僅記錄在 log 中，不影響其他 stream:idle listener

### Requirement: AI 回覆完成觸發推播

系統 SHALL 在 `StreamManager` emit `stream:idle` 事件時觸發 Web Push 通知。
透過在 `index.ts` 中新增另一個 `stream:idle` listener（不影響既有 memory extraction listener）。

推播 payload：
- `title`: "CodeForge"
- `body`: `{conversation.title} — response ready`
- `tag`: `stream-<conversationId>`
- `data.type`: "stream"
- `data.url`: "/"
- `data.conversationId`: conversation ID

推播前 MUST 呼叫 `pushService.shouldNotify('stream')` 檢查使用者偏好。

#### Scenario: AI 回覆完成
- **WHEN** StreamManager emit stream:idle 事件且推播已啟用
- **THEN** 發送 Web Push 通知，body 包含 conversation title

#### Scenario: 推播未啟用
- **WHEN** StreamManager emit stream:idle 但 pushNotifications.streamEnabled 為 false
- **THEN** 不發送 Web Push 通知

#### Scenario: 推播失敗不影響其他事件處理
- **WHEN** Web Push 發送失敗
- **THEN** 既有的 memory extraction 和 WebSocket broadcast 不受影響
