## ADDED Requirements

### Requirement: 對話 Cron 排程欄位

conversations 資料表 SHALL 新增 cron 排程相關欄位，讓每個對話可以獨立設定定時排程。

#### Scenario: 資料庫 schema

- **WHEN** 系統啟動執行 migration
- **THEN** conversations 表 MUST 包含以下欄位：
  - `cron_enabled` INTEGER NOT NULL DEFAULT 0
  - `cron_schedule_type` TEXT（值為 'cron' 或 'interval'，可為 NULL）
  - `cron_schedule_value` TEXT（cron expression 或毫秒數，可為 NULL）
  - `cron_prompt` TEXT（排程觸發時發送的提示詞，可為 NULL）

#### Scenario: 既有對話不受影響

- **WHEN** migration 執行時
- **THEN** 所有既有對話的 `cron_enabled` MUST 為 0
- **AND** 其他 cron 欄位 MUST 為 NULL

### Requirement: 對話 Cron API

後端 SHALL 提供 `PUT /api/conversations/:id/cron` endpoint 管理對話的 cron 設定。

#### Scenario: 啟用 cron 排程

- **WHEN** 前端呼叫 `PUT /api/conversations/:id/cron` body: `{ cronEnabled: true, cronScheduleType: "cron", cronScheduleValue: "0 */6 * * *", cronPrompt: "檢查系統狀態" }`
- **THEN** 後端 MUST 更新對話的 cron 欄位
- **AND** MUST 向 ConversationCronScheduler 註冊該排程
- **AND** MUST 回傳更新後的 conversation 物件

#### Scenario: 停用 cron 排程

- **WHEN** 前端呼叫 `PUT /api/conversations/:id/cron` body: `{ cronEnabled: false }`
- **THEN** 後端 MUST 設定 `cron_enabled = 0`
- **AND** MUST 從 ConversationCronScheduler 取消註冊該排程

#### Scenario: 修改排程參數

- **WHEN** cron 已啟用的對話更新 cronScheduleValue
- **THEN** 系統 MUST 先取消舊排程再註冊新排程

#### Scenario: 對話不存在

- **WHEN** PUT 請求的 conversation id 不存在
- **THEN** MUST 回傳 404 錯誤

### Requirement: ConversationCronScheduler 排程執行

ConversationCronScheduler SHALL 根據對話的 cron 設定在指定時間觸發，自動在對話中發送提示詞並取得 AI 回應。

#### Scenario: cron expression 排程觸發

- **WHEN** 對話設定 `cronScheduleType: "cron"` 且 `cronScheduleValue: "0 */6 * * *"`
- **THEN** 排程器 MUST 使用 croner 套件建立排程
- **AND** 每 6 小時觸發一次

#### Scenario: interval 排程觸發

- **WHEN** 對話設定 `cronScheduleType: "interval"` 且 `cronScheduleValue: "3600000"`
- **THEN** 排程器 MUST 使用 setInterval 每 3600000ms 觸發一次

#### Scenario: 觸發時自動發送訊息

- **WHEN** 排程觸發
- **THEN** 系統 MUST 在該對話中新增一筆 role=user 的訊息，content 為 `cronPrompt`
- **AND** MUST 呼叫 copilot session 產生 AI 回應
- **AND** AI 回應 MUST 寫入對話的 messages 中
- **AND** MUST 透過 WebSocket 廣播新訊息，讓已連線的前端即時顯示

#### Scenario: 啟動時載入所有排程

- **WHEN** 後端服務啟動
- **THEN** ConversationCronScheduler MUST 從 DB 載入所有 `cron_enabled = 1` 的對話
- **AND** MUST 為每個對話註冊排程

#### Scenario: 對話被刪除時清理排程

- **WHEN** 一個有 cron 的對話被刪除
- **THEN** 排程器 MUST 自動取消該對話的排程

#### Scenario: 排程觸發失敗不影響其他排程

- **WHEN** 某個對話的 cron 觸發執行失敗（如 API 錯誤）
- **THEN** 系統 MUST 記錄錯誤 log
- **AND** MUST NOT 影響其他對話的排程執行

### Requirement: Cron 設定 AI Skill

使用者 SHALL 可透過 `/cron` skill 與 AI 協作設定對話的 cron 排程。`/cron` 為 AI skill 而非 builtin slash command，AI 透過 `configure_cron` 和 `get_cron_config` 工具協助使用者設定排程。

#### Scenario: 輸入 /cron 觸發 AI Skill

- **WHEN** 使用者在輸入框輸入 `/cron` 並選取
- **THEN** 系統 MUST 載入 cron skill（`backend/src/skills/builtin/cron/SKILL.md`）
- **AND** AI MUST 使用 `get_cron_config` 工具讀取現有設定
- **AND** AI MUST 引導使用者設定排程參數（頻率、提示詞等）
- **AND** AI MUST 使用 `configure_cron` 工具寫入設定

#### Scenario: /cron 出現在 slash command 選單

- **WHEN** 使用者輸入 `/` 觸發 slash command 選單
- **THEN** 選單 MUST 包含 `cron` 指令（type: skill）及其描述

#### Scenario: Cron 工具定義

- **WHEN** AI 接收到 cron skill
- **THEN** 系統 MUST 提供以下工具：
  - `configure_cron`：設定 cronEnabled、scheduleType、scheduleValue、prompt、model
  - `get_cron_config`：讀取當前對話的 cron 設定

### Requirement: CronConfigPanel 設定面板

CronConfigPanel SHALL 為內嵌在對話輸入區域上方的設定面板，供使用者設定或修改對話的 cron 排程。

#### Scenario: 面板顯示

- **WHEN** CronConfigPanel 開啟
- **THEN** MUST 顯示以下控制項：
  - 啟用/停用 toggle
  - 排程類型下拉（Cron expression / Interval）
  - 排程值輸入框
  - 提示詞 textarea
  - 儲存按鈕
  - 取消按鈕

#### Scenario: 載入既有設定

- **WHEN** 對話已有 cron 設定（cronEnabled = true）
- **AND** CronConfigPanel 開啟
- **THEN** 面板 MUST 預填現有的排程設定

#### Scenario: 儲存設定

- **WHEN** 使用者填寫排程設定並點擊儲存
- **THEN** 系統 MUST 呼叫 `PUT /api/conversations/:id/cron`
- **AND** 成功後 MUST 關閉面板
- **AND** MUST 顯示成功 toast

#### Scenario: 取消不儲存

- **WHEN** 使用者點擊取消
- **THEN** 面板 MUST 關閉
- **AND** MUST NOT 呼叫 API

#### Scenario: 必填驗證

- **WHEN** cron 啟用但排程值或提示詞為空
- **THEN** 儲存按鈕 MUST 禁用（disabled）

### Requirement: 工具列 Cron 按鈕

底部工具列 SHALL 包含一個 Clock icon 按鈕，點擊後開啟 CronConfigPanel。

#### Scenario: 顯示 cron 按鈕

- **WHEN** 對話有 tabId（非空狀態）
- **THEN** 工具列 MUST 在 PlanActToggle 後顯示 Clock icon 按鈕

#### Scenario: 點擊開啟設定面板

- **WHEN** 使用者點擊 Clock icon 按鈕
- **THEN** CronConfigPanel MUST 開啟

#### Scenario: 已啟用 cron 時按鈕標示

- **WHEN** 對話已啟用 cron
- **THEN** Clock icon 按鈕 MUST 以 accent 色標示（表示已啟用）

### Requirement: 查詢已啟用 Cron 的對話

後端 SHALL 支援查詢所有已啟用 cron 的對話。

#### Scenario: 過濾 cron 對話

- **WHEN** 前端呼叫 `GET /api/conversations?cronEnabled=true`
- **THEN** 後端 MUST 只回傳 `cron_enabled = 1` 的對話
- **AND** 回傳資料 MUST 包含 cron 相關欄位

#### Scenario: 一般查詢包含 cron 欄位

- **WHEN** 前端呼叫 `GET /api/conversations`（無 cronEnabled 參數）
- **THEN** 回傳的每筆對話 MUST 包含 `cronEnabled` 欄位
