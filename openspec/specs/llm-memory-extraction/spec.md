## ADDED Requirements

### Requirement: LLM 事實提取
系統 SHALL 提供 `LlmMemoryExtractor` 類別，使用 LLM 從對話中提取結構化事實，取代正則匹配。

#### Scenario: 成功提取結構化事實
- **WHEN** `LlmMemoryExtractor.extractFacts(messages)` 被呼叫且 LLM 可用
- **THEN** 系統 SHALL 回傳 `StructuredFact[]`，每條事實包含 `content`、`category` 和 `confidence`

#### Scenario: 隱含偏好提取
- **WHEN** 對話中包含隱含偏好（如使用者說「這寫法太醜了」）
- **THEN** LLM SHALL 能提取隱含偏好（如「偏好簡潔的程式碼風格」）

#### Scenario: 事實分類
- **WHEN** LLM 提取事實
- **THEN** 每條事實的 `category` SHALL 為以下之一：`preference`、`project`、`workflow`、`tool`、`convention`、`general`

#### Scenario: Confidence 過濾
- **WHEN** LLM 回傳事實的 `confidence` 低於 0.7
- **THEN** 該事實 SHALL 被過濾掉，不包含在結果中

#### Scenario: LLM 呼叫失敗
- **WHEN** `MemoryLlmCaller.call()` 回傳 `null`
- **THEN** `extractFacts()` SHALL 回傳 `null`，呼叫方 SHALL fallback 到正則提取

#### Scenario: JSON 解析失敗
- **WHEN** LLM 回傳無法解析為有效 JSON 的內容
- **THEN** `extractFacts()` SHALL 回傳 `null`

### Requirement: 訊息截斷控制
`LlmMemoryExtractor` SHALL 控制傳送給 LLM 的訊息數量以管理成本。

#### Scenario: 預設截斷
- **WHEN** 對話訊息超過 20 條且未指定 `maxMessages`
- **THEN** 系統 SHALL 只傳送最後 20 條訊息給 LLM

#### Scenario: 自訂截斷
- **WHEN** 呼叫方指定 `maxMessages` 為 N
- **THEN** 系統 SHALL 只傳送最後 N 條訊息給 LLM

### Requirement: 正則 Fallback 整合
`MemoryExtractor` SHALL 在 LLM 提取失敗時 fallback 到正則提取。

#### Scenario: LLM 提取成功
- **WHEN** `extractCandidatesSmartly(messages)` 被呼叫且 `LlmMemoryExtractor` 可用且提取成功
- **THEN** 系統 SHALL 使用 LLM 提取結果，不執行正則匹配

#### Scenario: LLM 提取失敗，Fallback 正則
- **WHEN** `extractCandidatesSmartly(messages)` 被呼叫且 LLM 提取回傳 `null`
- **THEN** 系統 SHALL fallback 到現有 `extractCandidates()` 正則匹配

#### Scenario: 未啟用 LLM 提取
- **WHEN** `MemoryExtractor` 未被注入 `LlmMemoryExtractor`
- **THEN** `extractCandidatesSmartly()` SHALL 直接使用正則 `extractCandidates()`

### Requirement: 分類傳遞
LLM 提取的事實分類 SHALL 被傳遞到 reconcile 階段。

#### Scenario: 分類用於 add action
- **WHEN** `reconcile()` 建立 `add` action 且 LLM 提供了分類
- **THEN** action 的 `category` SHALL 使用 LLM 提供的分類，而非預設的 `general`

#### Scenario: 無分類 Fallback
- **WHEN** `reconcile()` 建立 `add` action 且無 LLM 分類可用
- **THEN** action 的 `category` SHALL 使用預設值 `general`
