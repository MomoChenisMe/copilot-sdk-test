## ADDED Requirements

### Requirement: manage_cron_jobs 內建工具

系統 SHALL 提供一個名為 `manage_cron_jobs` 的 self-control tool，讓 AI 在對話中管理排程任務。
工具 MUST 支援以下 actions: `list`, `get`, `create`, `update`, `delete`, `trigger`。

#### Scenario: AI 列出所有排程

- **WHEN** AI 呼叫 `manage_cron_jobs` action 為 `list`
- **THEN** 回傳所有 cron jobs 的清單（含 id, name, schedule, enabled 狀態）

### Requirement: 透過 AI 建立排程任務

`create` action MUST 接受以下必填參數：`name`, `type` (ai/shell), `scheduleType` (cron/interval/once), `scheduleValue`。
可選參數：`config`（ai job: { prompt, model, cwd }; shell job: { command, cwd }）。
建立後 MUST 自動向 CronScheduler 註冊該 job。

#### Scenario: 建立 AI 排程任務

- **WHEN** AI 呼叫 `manage_cron_jobs` action 為 `create`，參數為 `{ name: "daily-backup", type: "shell", scheduleType: "cron", scheduleValue: "0 3 * * *", config: { command: "tar -czf backup.tar.gz ." } }`
- **THEN** 建立新 cron job，回傳完整 job 物件（含生成的 id），並向 scheduler 註冊

#### Scenario: 缺少必填參數

- **WHEN** AI 呼叫 `create` 但缺少 `name` 參數
- **THEN** 回傳錯誤訊息 `{ error: "name is required" }`

### Requirement: 透過 AI 更新排程任務

`update` action MUST 接受 `id` 必填參數和任意可更新欄位。
更新後 MUST 重新註冊或取消註冊 scheduler。

#### Scenario: 停用排程

- **WHEN** AI 呼叫 `update` 參數為 `{ id: "abc123", enabled: false }`
- **THEN** 更新 job 的 enabled 為 false，從 scheduler 取消註冊

#### Scenario: 更新不存在的 job

- **WHEN** AI 呼叫 `update` 參數為 `{ id: "nonexistent" }`
- **THEN** 回傳 `{ error: "Job not found" }`

### Requirement: 透過 AI 刪除和觸發排程

`delete` action MUST 接受 `id` 參數，刪除 job 並從 scheduler 取消註冊。
`trigger` action MUST 接受 `id` 參數，立即觸發一次 job 執行（非同步）。

#### Scenario: 刪除排程

- **WHEN** AI 呼叫 `delete` 參數為 `{ id: "abc123" }`
- **THEN** 從 CronStore 刪除、從 scheduler 取消註冊，回傳 `{ ok: true }`

#### Scenario: 手動觸發排程

- **WHEN** AI 呼叫 `trigger` 參數為 `{ id: "abc123" }`
- **THEN** 非同步觸發 job 執行，立即回傳 `{ ok: true, message: "Job triggered" }`

### Requirement: Cron 工具在 self-control tools 中註冊

`manage_cron_jobs` 工具 MUST 被加入到 self-control tools 陣列中，確保在每個 AI 對話 session 中都可使用。
工具的建立 MUST 在 CronStore 和 CronScheduler 初始化之後。

#### Scenario: 新對話中可使用 cron 工具

- **WHEN** 使用者開啟新對話並詢問 "幫我建立一個每天凌晨 3 點跑的排程"
- **THEN** AI 可以呼叫 `manage_cron_jobs` 工具來建立排程
