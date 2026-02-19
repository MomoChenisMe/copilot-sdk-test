## ADDED Requirements

### Requirement: 非串流 LLM 呼叫
系統 SHALL 提供 `MemoryLlmCaller` 類別，透過 Copilot SDK 執行非串流 LLM 呼叫，供記憶智慧功能共用。

#### Scenario: 成功呼叫
- **WHEN** `MemoryLlmCaller.call(systemPrompt, userPrompt)` 被呼叫且 Copilot SDK 可用
- **THEN** 系統 SHALL 建立拋棄式 session、發送 prompt、等待回應、回傳 `string` 內容

#### Scenario: Session 建立失敗
- **WHEN** `ClientManager.getClient()` 或 `client.createSession()` 拋出錯誤
- **THEN** `call()` SHALL 回傳 `null`，不拋出例外

#### Scenario: Timeout
- **WHEN** `sendAndWait()` 超過設定的 timeout 時間（預設 30 秒）
- **THEN** `call()` SHALL 回傳 `null`，不拋出例外

#### Scenario: Session 資源釋放
- **WHEN** LLM 呼叫完成（無論成功或失敗）
- **THEN** 系統 SHALL 在 `finally` block 中呼叫 `session.destroy()` 釋放資源

### Requirement: Session 隔離
系統 SHALL 確保記憶 LLM 呼叫不會與主對話 session 互相干擾。

#### Scenario: 拋棄式 Session
- **WHEN** 每次 `call()` 被呼叫
- **THEN** 系統 SHALL 建立全新的 session 並在呼叫後銷毀，不復用任何 session

#### Scenario: 工具禁用
- **WHEN** 建立記憶用的 LLM session
- **THEN** session 配置 SHALL 設定 `tools: []`，禁止 LLM 執行任何工具

#### Scenario: System Prompt 隔離
- **WHEN** 建立記憶用的 LLM session
- **THEN** session 配置 SHALL 使用 `systemMessage: { mode: 'replace', content: systemPrompt }`，完全替換預設 system prompt

### Requirement: 模型配置
`MemoryLlmCaller` SHALL 支援可配置的模型和 timeout。

#### Scenario: 預設值
- **WHEN** 未指定 model 和 timeoutMs
- **THEN** 系統 SHALL 使用 `gpt-4o-mini` 作為預設模型，`30000` 毫秒作為預設 timeout

#### Scenario: 自訂模型
- **WHEN** 呼叫方指定不同的 model（如 `gpt-4o`）
- **THEN** session 建立 SHALL 使用指定的模型
