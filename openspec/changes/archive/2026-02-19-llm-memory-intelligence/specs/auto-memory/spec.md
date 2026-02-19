## MODIFIED Requirements

### Requirement: 自動記憶提取
系統 SHALL 在每次對話 turn 完成後（`stream:idle` 事件）自動提取可記憶的事實。

#### Scenario: Turn 完成後提取
- **WHEN** 對話 streaming 結束（idle event）且自動記憶已啟用
- **THEN** 系統 SHALL 非同步執行記憶提取 pipeline

#### Scenario: 節流控制
- **WHEN** 距離上次提取不足 60 秒或新訊息不足 4 條
- **THEN** 系統 SHALL 跳過此次提取

#### Scenario: 提取結果
- **WHEN** 提取 pipeline 完成
- **THEN** 新事實 SHALL 被寫入記憶檔案並更新索引

#### Scenario: LLM 智慧提取
- **WHEN** LLM 提取已啟用（`llmExtractionEnabled: true`）
- **THEN** 系統 SHALL 優先使用 LLM 提取，失敗時 fallback 到正則提取

#### Scenario: LLM 品質閘門
- **WHEN** LLM 品質閘門已啟用（`llmGatingEnabled: true`）
- **THEN** 系統 SHALL 在 reconcile 之後、apply 之前執行品質閘門過濾

#### Scenario: 壓縮觸發
- **WHEN** 記憶提取完成後且 LLM 壓縮已啟用（`llmCompactionEnabled: true`）且 `shouldCompact()` 回傳 `true`
- **THEN** 系統 SHALL 非同步觸發記憶壓縮

## ADDED Requirements

### Requirement: LLM 記憶設定擴充
`MemoryConfig` SHALL 新增 7 個欄位控制 LLM 記憶功能。

#### Scenario: 品質閘門設定
- **WHEN** 讀取 `MemoryConfig`
- **THEN** SHALL 包含 `llmGatingEnabled`（預設 `false`）和 `llmGatingModel`（預設 `gpt-4o-mini`）

#### Scenario: 智慧提取設定
- **WHEN** 讀取 `MemoryConfig`
- **THEN** SHALL 包含 `llmExtractionEnabled`（預設 `false`）、`llmExtractionModel`（預設 `gpt-4o-mini`）和 `llmExtractionMaxMessages`（預設 `20`）

#### Scenario: 記憶壓縮設定
- **WHEN** 讀取 `MemoryConfig`
- **THEN** SHALL 包含 `llmCompactionEnabled`（預設 `false`）、`llmCompactionModel`（預設 `gpt-4o-mini`）和 `llmCompactionFactThreshold`（預設 `30`）

#### Scenario: 向下相容
- **WHEN** 現有的 `memory-config.json` 不包含新欄位
- **THEN** 系統 SHALL 使用預設值填補，不影響現有行為

### Requirement: Memory Settings UI 擴充
Settings 面板 Memory tab SHALL 顯示 LLM 記憶功能的設定控制項。

#### Scenario: 品質閘門 Toggle
- **WHEN** 使用者在 Memory tab 切換 LLM 品質閘門
- **THEN** 系統 SHALL 更新 `llmGatingEnabled` 設定

#### Scenario: 智慧提取 Toggle
- **WHEN** 使用者在 Memory tab 切換 LLM 智慧提取
- **THEN** 系統 SHALL 更新 `llmExtractionEnabled` 設定

#### Scenario: 壓縮 Toggle 和手動觸發
- **WHEN** 使用者在 Memory tab 切換 LLM 壓縮或點擊手動壓縮按鈕
- **THEN** 系統 SHALL 更新 `llmCompactionEnabled` 設定或呼叫 `POST /api/auto-memory/compact`

#### Scenario: 模型選擇
- **WHEN** 使用者在 LLM 功能區塊選擇不同模型
- **THEN** 系統 SHALL 更新對應的 model 設定欄位

#### Scenario: 功能說明文字
- **WHEN** 使用者查看 LLM Intelligence 區塊
- **THEN** 每個 toggle 下方 SHALL 顯示該功能的簡短說明文字，幫助使用者理解功能用途
- **AND** 說明文字 SHALL 支援 i18n（en + zh-TW）

#### Scenario: 模型選擇下拉選單
- **WHEN** 使用者啟用某個 LLM 功能
- **THEN** 該功能下方 SHALL 顯示模型選擇下拉選單，列出可用模型
- **AND** 選擇模型後 SHALL 即時更新對應的 config 欄位（`llmGatingModel`/`llmExtractionModel`/`llmCompactionModel`）
- **AND** 模型清單 SHALL 從 Copilot SDK models API 取得
