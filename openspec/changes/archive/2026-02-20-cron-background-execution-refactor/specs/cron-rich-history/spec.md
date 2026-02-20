## ADDED Requirements

### Requirement: cron_history Schema 擴充

系統 MUST 在 cron_history table 新增以下欄位（全部 nullable TEXT）：

| 欄位 | 類型 | 用途 |
|------|------|------|
| `prompt` | TEXT | 觸發時的原始 prompt |
| `config_snapshot` | TEXT (JSON) | 執行時的 job config 快照 |
| `turn_segments` | TEXT (JSON) | TurnSegment[] 完整執行段落 |
| `tool_records` | TEXT (JSON) | ToolRecord[] 工具呼叫紀錄 |
| `reasoning` | TEXT | 推理/思考文字 |
| `usage` | TEXT (JSON) | { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens } |
| `content` | TEXT | 完整 AI 回覆文字（contentSegments 拼接） |

遷移 MUST 使用 `ALTER TABLE ADD COLUMN`（try/catch 包裝）確保冪等性。

#### Scenario: Schema 遷移成功
- **WHEN** 系統啟動並執行 migrate()
- **THEN** cron_history table 包含 7 個新欄位，舊資料不受影響

#### Scenario: 重複遷移不報錯
- **WHEN** migrate() 被多次呼叫
- **THEN** ALTER TABLE ADD COLUMN 的 duplicate column 錯誤被 catch 忽略，系統正常啟動

---

### Requirement: CronHistory Interface 擴充

`CronHistory` interface MUST 包含新欄位（全部 nullable）：
- `prompt: string | null`
- `configSnapshot: Record<string, unknown> | null`
- `turnSegments: TurnSegment[] | null`
- `toolRecords: ToolRecord[] | null`
- `reasoning: string | null`
- `usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number } | null`
- `content: string | null`

`mapHistory()` MUST 將 JSON 欄位反序列化為對應的 TypeScript 物件，null 值保持 null。

#### Scenario: 讀取含新欄位的歷史紀錄
- **WHEN** 查詢包含 turn_segments、tool_records、usage 的歷史紀錄
- **THEN** mapHistory() 將 JSON 字串反序列化為陣列/物件

#### Scenario: 讀取舊格式歷史紀錄
- **WHEN** 查詢遷移前建立的歷史紀錄（新欄位為 NULL）
- **THEN** mapHistory() 回傳新欄位為 null，不報錯

---

### Requirement: AddHistoryInput 擴充

`AddHistoryInput` MUST 接受新欄位（全部 optional）：prompt、configSnapshot、turnSegments、toolRecords、reasoning、usage、content。

`addHistory()` MUST 將物件類型欄位（configSnapshot、turnSegments、toolRecords、usage）序列化為 JSON 字串存入資料庫。

#### Scenario: 新增含完整執行資料的歷史紀錄
- **WHEN** 呼叫 addHistory() 並傳入 turnSegments、toolRecords、usage
- **THEN** 系統將物件 JSON.stringify() 後存入對應欄位

#### Scenario: 新增僅基本資料的歷史紀錄（shell job）
- **WHEN** 呼叫 addHistory() 不傳入新欄位
- **THEN** 新欄位存為 NULL，不影響既有行為

---

### Requirement: updateHistory 方法

系統 MUST 提供 `updateHistory(id, updates)` 方法，用於將 status 從 'running' 更新為最終狀態，並填入完整執行資料。

#### Scenario: 更新 running 狀態為 success
- **WHEN** 呼叫 updateHistory(id, { status: 'success', finishedAt, content, turnSegments, toolRecords, usage })
- **THEN** 對應紀錄的所有欄位被更新

#### Scenario: 更新 running 狀態為 error
- **WHEN** 呼叫 updateHistory(id, { status: 'error', finishedAt, output: errorMessage })
- **THEN** 對應紀錄的 status 和 output 被更新

---

### Requirement: 全域歷史查詢

系統 MUST 提供 `getAllRecentHistory(limit)` 方法，回傳跨所有 job 的最近歷史紀錄（含 jobName），按 started_at DESC 排序。

#### Scenario: 查詢最近 50 筆歷史
- **WHEN** 呼叫 getAllRecentHistory(50)
- **THEN** 回傳最多 50 筆歷史紀錄，每筆包含 jobName（來自 JOIN cron_jobs），按 started_at DESC 排序

---

### Requirement: 未讀/失敗計數查詢

系統 MUST 提供：
- `getUnreadCount(since)` — 回傳指定時間後的歷史紀錄總數
- `getFailedCount(since)` — 回傳指定時間後 status='error' 的紀錄數

#### Scenario: 查詢未讀數
- **WHEN** 呼叫 getUnreadCount('2026-02-19T00:00:00Z')
- **THEN** 回傳該時間之後的所有歷史紀錄數量

#### Scenario: 查詢失敗數
- **WHEN** 呼叫 getFailedCount('2026-02-19T00:00:00Z')
- **THEN** 只回傳 status='error' 的紀錄數量

---

### Requirement: getHistoryById 公開方法

系統 MUST 提供 `getHistoryById(id)` 公開方法，根據 history ID 查詢單筆完整歷史紀錄。

#### Scenario: 查詢存在的歷史紀錄
- **WHEN** 呼叫 getHistoryById(validId)
- **THEN** 回傳完整的 CronHistory 物件（含所有新欄位）

#### Scenario: 查詢不存在的歷史紀錄
- **WHEN** 呼叫 getHistoryById(invalidId)
- **THEN** 回傳 null

---

### Requirement: CronJobConfig 結構化介面

系統 MUST 定義 `CronJobConfig` 結構化 interface，取代 `Record<string, unknown>`：

```
CronJobConfig {
  prompt?: string        // AI prompt
  model?: string         // 模型選擇
  cwd?: string           // 工作目錄
  command?: string       // Shell 命令（shell job only）
  timeout?: number       // Shell timeout（ms）
  timeoutMs?: number     // AI session timeout（ms）
  toolConfig?: CronToolConfig  // Tool 配置
}
```

#### Scenario: AI job 使用結構化 config
- **WHEN** 建立 AI cron job 並設定 model、toolConfig
- **THEN** config 被序列化為符合 CronJobConfig 結構的 JSON 存入資料庫

---

### Requirement: CronScheduler triggerJob 擴充

`CronScheduler.triggerJob()` MUST 改為：
1. 先建立 status='running' 的 history 紀錄
2. 執行 job
3. 用 updateHistory() 更新完整結果（含 executionData）
4. 更新 job 的 lastRun 時間戳

#### Scenario: triggerJob 建立 running 紀錄後執行
- **WHEN** cron job 被觸發
- **THEN** 系統先在 cron_history 插入 status='running' 紀錄，再開始執行

#### Scenario: 執行完畢更新歷史
- **WHEN** AI cron job 執行完畢（成功或失敗）
- **THEN** 系統用 updateHistory() 將 status、finishedAt、turnSegments、toolRecords、usage、content 寫入紀錄
