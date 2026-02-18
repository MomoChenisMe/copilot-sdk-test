## ADDED Requirements

### Requirement: Usage 持久化至資料庫

Backend SHALL 在 AccumulationState 中累計 inputTokens 與 outputTokens，並在 persist 時將累計值寫入 message metadata。

#### Scenario: 累計 token 計數

- WHEN SDK 發出多個 `assistant.usage` 事件
- THEN AccumulationState SHALL 累加 inputTokens 與 outputTokens 的總和
- AND 每次 usage 事件 SHALL 更新累計值而非覆蓋

#### Scenario: Persist 時寫入 metadata

- WHEN 系統執行 message persist 操作
- THEN 累計的 inputTokens 與 outputTokens SHALL 寫入該 assistant message 的 metadata
- AND metadata 中 SHALL 包含 `usage` 欄位（含 `inputTokens`、`outputTokens`）

#### Scenario: 新 turn 重置累計

- WHEN 一個新的 assistant turn 開始
- THEN AccumulationState 的 token 計數 SHALL 重置為 0
- AND 開始新一輪的累計

---

### Requirement: 歷史對話 usage 還原

當載入歷史對話時，frontend SHALL 從所有 assistant messages 的 metadata 中還原累計 usage。

#### Scenario: 載入歷史對話還原 usage

- WHEN frontend 載入一個歷史對話
- THEN 系統 SHALL 遍歷所有 assistant messages 的 metadata
- AND 累加各 message 的 `usage.inputTokens` 與 `usage.outputTokens`
- AND 將總和設定為該 tab 的 cumulative usage

#### Scenario: 無 usage metadata 的歷史訊息

- WHEN 歷史對話中某些 assistant messages 缺少 `usage` metadata
- THEN 系統 SHALL 跳過這些 messages
- AND 僅累加有 usage metadata 的 messages

---

### Requirement: Premium request 轉發

Backend SHALL 將 `assistant.usage` 事件中的 quotaSnapshots 轉發為 `copilot:quota` WebSocket message。

#### Scenario: 轉發 quota snapshots

- WHEN SDK 發出 `assistant.usage` 事件且包含 `quotaSnapshots` 欄位
- THEN backend SHALL 發送 `copilot:quota` WebSocket message
- AND message payload SHALL 包含完整的 `quotaSnapshots` 資料

#### Scenario: 無 quotaSnapshots 時不發送

- WHEN SDK 發出 `assistant.usage` 事件但不包含 `quotaSnapshots`
- THEN backend SHALL NOT 發送 `copilot:quota` WebSocket message

---

### Requirement: Session shutdown 轉發

Backend SHALL 將 `session.shutdown` 事件中的 totalPremiumRequests 轉發為 `copilot:shutdown` WebSocket message。

#### Scenario: 轉發 shutdown 資訊

- WHEN SDK 發出 `session.shutdown` 事件
- THEN backend SHALL 發送 `copilot:shutdown` WebSocket message
- AND message payload SHALL 包含 `totalPremiumRequests` 與 `modelMetrics`

---

### Requirement: Cache token 追蹤

Backend SHALL 將 cacheReadTokens 與 cacheWriteTokens 連同既有的 token counts 一起轉發。

#### Scenario: 轉發 cache token 資料

- WHEN SDK 發出 `assistant.usage` 事件且包含 cache token 資訊
- THEN `copilot:usage` WebSocket message SHALL 額外包含 `cacheReadTokens` 與 `cacheWriteTokens` 欄位

#### Scenario: Cache tokens 累計

- WHEN 多個 usage 事件包含 cache token 資料
- THEN AccumulationState SHALL 同時累計 cacheReadTokens 與 cacheWriteTokens
- AND persist 時一併寫入 message metadata

---

### Requirement: 可展開的 UsageBar

UsageBar SHALL 具備 collapsed（單行摘要）與 expanded（完整詳細）兩種狀態。

#### Scenario: 預設 collapsed 狀態

- WHEN tab 有 usage 資料
- THEN UsageBar SHALL 以 collapsed 狀態顯示
- AND 顯示為單行摘要

#### Scenario: 展開與收合切換

- WHEN 使用者點擊 UsageBar 的展開 chevron
- THEN UsageBar SHALL 切換為 expanded 狀態
- AND 再次點擊 SHALL 回到 collapsed 狀態

---

### Requirement: Collapsed 狀態顯示

Collapsed 狀態 SHALL 顯示：premium request count、total token count、mini context bar、expand chevron。

#### Scenario: Collapsed 單行內容

- WHEN UsageBar 處於 collapsed 狀態
- THEN SHALL 顯示 premium request 使用量（如 "5/50 premium"）
- AND SHALL 顯示 total token count（如 "12.5k tokens"）
- AND SHALL 顯示 mini context window progress bar
- AND SHALL 顯示 expand chevron icon

---

### Requirement: Expanded 狀態顯示

Expanded 狀態 SHALL 顯示：input/output/cache token breakdown、premium request progress bar（含 used/total 與 reset date）、context window progress bar、model info。

#### Scenario: Token breakdown 顯示

- WHEN UsageBar 處於 expanded 狀態
- THEN SHALL 分別顯示 input tokens、output tokens、cache read tokens、cache write tokens 的數量

#### Scenario: Premium request progress bar

- WHEN UsageBar 處於 expanded 狀態
- AND 有 quota 資料
- THEN SHALL 顯示 premium request progress bar
- AND bar 下方 SHALL 顯示 used/total 數字（如 "25/50"）
- AND SHALL 顯示 quota reset date

#### Scenario: Context window progress bar

- WHEN UsageBar 處於 expanded 狀態
- THEN SHALL 顯示 context window 使用率 progress bar
- AND 顯示 currentTokens / tokenLimit

#### Scenario: Model info 顯示

- WHEN UsageBar 處於 expanded 狀態
- THEN SHALL 顯示當前使用的 model 名稱

---

### Requirement: Quota 顏色等級

Premium request progress bar SHALL 根據使用百分比顯示不同顏色：emerald（<70%）、amber（70-90%）、red（>90%）。

#### Scenario: 低使用率顯示 emerald

- WHEN premium request 使用百分比 < 70%
- THEN progress bar SHALL 使用 emerald 色系

#### Scenario: 中使用率顯示 amber

- WHEN premium request 使用百分比 >= 70% 且 <= 90%
- THEN progress bar SHALL 使用 amber 色系

#### Scenario: 高使用率顯示 red

- WHEN premium request 使用百分比 > 90%
- THEN progress bar SHALL 使用 red 色系

---

### Requirement: Quota 資料持久化

Quota data SHALL 連同 token usage 一起包含在 message metadata 中。

#### Scenario: Persist quota 至 metadata

- WHEN 系統執行 message persist 且有 quota 資料
- THEN message metadata SHALL 額外包含 `quota` 欄位
- AND `quota` 欄位 SHALL 包含最新的 quotaSnapshots 資訊

#### Scenario: 還原歷史對話 quota

- WHEN frontend 載入歷史對話
- THEN 系統 SHALL 從最後一個包含 quota metadata 的 assistant message 還原 quota 資料
- AND UsageBar SHALL 顯示還原後的 quota 資訊
