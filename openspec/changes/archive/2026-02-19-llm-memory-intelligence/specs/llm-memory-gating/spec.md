## ADDED Requirements

### Requirement: 品質閘門過濾
系統 SHALL 提供 `MemoryQualityGate` 類別，在 `reconcile()` 之後、`apply()` 之前過濾低品質的候選事實。

#### Scenario: 過濾低品質事實
- **WHEN** `MemoryQualityGate.filter(actions)` 被呼叫，actions 包含具體偏好和模糊陳述
- **THEN** 系統 SHALL 呼叫 LLM 判斷每條事實品質，回傳 `GatingResult` 包含 `approved` 和 `rejected` 陣列

#### Scenario: 空列表
- **WHEN** `filter([])` 被呼叫且 actions 為空
- **THEN** 系統 SHALL 直接回傳 `{ approved: [], rejected: [] }`，不呼叫 LLM

#### Scenario: 保留具體偏好
- **WHEN** 候選事實為具體、持久的使用者偏好或專案資訊（如 "I prefer TypeScript strict mode"）
- **THEN** 該事實 SHALL 被分類到 `approved`

#### Scenario: 拒絕模糊陳述
- **WHEN** 候選事實為模糊、臨時性或情境性陳述（如 "I like this approach"）
- **THEN** 該事實 SHALL 被分類到 `rejected`，並附帶 `reason` 說明

### Requirement: Graceful Degradation
品質閘門 SHALL 在 LLM 不可用時 graceful fallback，不阻塞記憶提取。

#### Scenario: LLM 呼叫失敗
- **WHEN** `MemoryLlmCaller.call()` 回傳 `null`（LLM 不可用）
- **THEN** `filter()` SHALL 將所有 actions 放入 `approved`，不拒絕任何事實

#### Scenario: JSON 解析失敗
- **WHEN** LLM 回傳的內容無法解析為有效 JSON
- **THEN** `filter()` SHALL 將所有 actions 放入 `approved`，不拒絕任何事實

### Requirement: LLM Prompt 格式
品質閘門 SHALL 使用結構化 prompt 引導 LLM 輸出可解析的 JSON。

#### Scenario: Prompt 結構
- **WHEN** 系統建構品質閘門 prompt
- **THEN** prompt SHALL 包含候選事實的編號列表，並要求 LLM 回傳 `[{ index, keep, reason }]` JSON 格式

#### Scenario: JSON 解析策略
- **WHEN** LLM 回傳可能包裹在 markdown code block 中的 JSON
- **THEN** 系統 SHALL 先嘗試直接 `JSON.parse()`，失敗則用正則提取 code block 內容再解析

### Requirement: MemoryExtractor 整合
`MemoryExtractor` SHALL 支援 optional 品質閘門注入。

#### Scenario: 啟用品質閘門
- **WHEN** `MemoryExtractor` 被注入 `MemoryQualityGate` 且呼叫 `applyWithGating(actions)`
- **THEN** 系統 SHALL 先經過品質閘門過濾，再對 `approved` 執行 `apply()`

#### Scenario: 未啟用品質閘門
- **WHEN** `MemoryExtractor` 未被注入 `MemoryQualityGate` 且呼叫 `applyWithGating(actions)`
- **THEN** 系統 SHALL 直接對所有 actions 執行 `apply()`（等同原有行為）
