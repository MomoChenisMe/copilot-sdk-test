## ADDED Requirements

### Requirement: Cron 任務定義與儲存
系統 SHALL 使用 SQLite 儲存 cron 任務定義。`cron_jobs` 表 MUST 包含以下欄位：`id`（UUID）、`name`（使用者自訂名稱）、`type`（`ai` 或 `shell`）、`schedule_type`（`cron` | `interval` | `once`）、`schedule_value`（cron 表達式 / 毫秒間隔 / ISO datetime）、`config`（JSON，任務設定）、`enabled`（boolean）、`last_run`（ISO datetime）、`next_run`（ISO datetime）、`created_at`、`updated_at`。

#### Scenario: 建立 cron 表達式任務
- **WHEN** 使用者建立任務，schedule_type 為 `cron`，schedule_value 為 `0 9 * * 1-5`
- **THEN** 系統儲存任務，next_run 計算為下一個週一至週五上午 9 點

#### Scenario: 建立間隔任務
- **WHEN** 使用者建立任務，schedule_type 為 `interval`，schedule_value 為 `3600000`（1 小時）
- **THEN** 系統儲存任務，next_run 為現在 + 1 小時

#### Scenario: 建立一次性任務
- **WHEN** 使用者建立任務，schedule_type 為 `once`，schedule_value 為 `2026-03-01T10:00:00Z`
- **THEN** 系統儲存任務，next_run 為指定時間，執行後自動停用

### Requirement: Cron 排程引擎
系統 SHALL 使用 `croner` 套件驅動排程。後端啟動時 MUST 從 SQLite 載入所有 `enabled=true` 的任務並註冊至排程器。任務觸發時 MUST 根據 `type` 執行對應動作。排程器 MUST 在後端 graceful shutdown 時停止所有已排程任務。

#### Scenario: 後端啟動載入任務
- **WHEN** 後端啟動
- **THEN** 從 `cron_jobs` 表載入所有 enabled 任務，為每個任務建立 croner job

#### Scenario: cron 任務觸發
- **WHEN** 當前時間匹配 cron 表達式
- **THEN** 排程器執行任務，更新 `last_run` 和 `next_run`，寫入 `cron_history`

#### Scenario: 任務停用
- **WHEN** 使用者停用一個 cron 任務
- **THEN** 排程器取消對應的 croner job，任務不再觸發

#### Scenario: Graceful shutdown
- **WHEN** 後端收到 SIGTERM/SIGINT
- **THEN** 所有排程中的 croner jobs 被停止，進行中的任務等待完成（最多 10 秒）

### Requirement: AI 對話任務執行
type 為 `ai` 的任務 SHALL 建立新的對話並發送指定的 prompt。config MUST 包含 `prompt`（string）、`model`（可選 string）、`cwd`（可選 string）。任務執行 MUST 遵守現有的 maxConcurrency 限制（排隊等候而非拒絕）。

#### Scenario: AI 任務正常執行
- **WHEN** cron 觸發一個 AI 任務，config 為 `{prompt: "檢查 disk usage", model: "gpt-4o"}`
- **THEN** 系統建立新對話，使用指定 model 和 prompt 發送至 Copilot SDK，對話記錄可在前端查看

#### Scenario: AI 任務遵守並發限制
- **WHEN** cron 觸發 AI 任務但已有 3 個串流在執行（maxConcurrency=3）
- **THEN** 任務排隊等候，直到有空閒的串流插槽

#### Scenario: AI 任務執行失敗
- **WHEN** AI 任務的 Copilot SDK 呼叫失敗（例如 API 錯誤）
- **THEN** 在 `cron_history` 記錄 status 為 `error` 和錯誤訊息

### Requirement: Shell 命令任務執行
type 為 `shell` 的任務 SHALL 使用 `child_process.exec` 執行指定命令。config MUST 包含 `command`（string）、`cwd`（可選 string）、`timeout`（可選 number，預設 60000ms）。命令輸出（stdout + stderr）MUST 記錄在 `cron_history`。

#### Scenario: Shell 任務正常執行
- **WHEN** cron 觸發 Shell 任務，config 為 `{command: "df -h", cwd: "/home"}`
- **THEN** 系統在 `/home` 目錄執行 `df -h`，stdout 記錄在 `cron_history`

#### Scenario: Shell 任務逾時
- **WHEN** Shell 命令執行超過 timeout 設定
- **THEN** 系統 kill 子程序，在 `cron_history` 記錄 status 為 `timeout`

#### Scenario: Shell 命令錯誤
- **WHEN** Shell 命令回傳非零 exit code
- **THEN** 在 `cron_history` 記錄 status 為 `error`，包含 stderr 輸出

### Requirement: Cron 執行歷史
系統 SHALL 在 `cron_history` 表記錄每次任務執行的結果。表 MUST 包含：`id`、`job_id`（外鍵）、`started_at`、`finished_at`、`status`（`success` | `error` | `timeout`）、`output`（文字，最多 10000 字元）。

#### Scenario: 成功執行紀錄
- **WHEN** 任務執行成功
- **THEN** 寫入 `cron_history`，status 為 `success`，output 包含結果摘要

#### Scenario: 歷史紀錄查詢
- **WHEN** 前端查詢特定任務的執行歷史
- **THEN** 回傳按時間倒序排列的歷史紀錄列表

### Requirement: Cron REST API
系統 SHALL 提供 REST API 管理 cron 任務：
- `GET /api/cron/jobs` — 列出所有任務
- `POST /api/cron/jobs` — 建立新任務
- `PUT /api/cron/jobs/:id` — 更新任務
- `DELETE /api/cron/jobs/:id` — 刪除任務
- `POST /api/cron/jobs/:id/trigger` — 手動觸發任務
- `GET /api/cron/jobs/:id/history` — 取得執行歷史

#### Scenario: 建立任務
- **WHEN** 前端發送 `POST /api/cron/jobs` 包含任務定義
- **THEN** 系統驗證輸入（Zod schema）、儲存至 SQLite、註冊至排程器、回傳 201

#### Scenario: 手動觸發
- **WHEN** 前端發送 `POST /api/cron/jobs/:id/trigger`
- **THEN** 系統立即執行該任務（不影響排程），回傳 202

#### Scenario: 刪除任務
- **WHEN** 前端發送 `DELETE /api/cron/jobs/:id`
- **THEN** 系統從排程器移除、從 SQLite 刪除、回傳 204

### Requirement: Cron Settings UI
前端 SettingsPanel SHALL 新增 Cron Tab，顯示所有已定義的 cron 任務。UI SHALL 提供建立/編輯/刪除/啟用/停用/手動觸發任務的功能，以及查看執行歷史。

#### Scenario: 任務列表顯示
- **WHEN** 使用者開啟 Settings 的 Cron tab
- **THEN** 顯示所有任務的卡片清單，包含名稱、類型、排程、狀態（enabled/disabled）、上次執行時間

#### Scenario: 建立新任務表單
- **WHEN** 使用者點擊 "New Job" 按鈕
- **THEN** 顯示表單：名稱、類型選擇（AI/Shell）、排程設定、config 欄位（根據類型動態切換）

#### Scenario: 查看執行歷史
- **WHEN** 使用者點擊任務卡片的 "History" 按鈕
- **THEN** 顯示該任務最近 20 筆執行紀錄，包含時間、狀態、輸出預覽
