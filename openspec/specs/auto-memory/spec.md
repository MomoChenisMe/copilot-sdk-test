## ADDED Requirements

### Requirement: 記憶檔案儲存
系統 SHALL 使用 Markdown 檔案作為記憶的 source of truth。

#### Scenario: MEMORY.md 持久化
- **WHEN** 系統寫入記憶事實
- **THEN** 事實 SHALL 被追加到 `data/prompts/memory/MEMORY.md` 檔案

#### Scenario: 每日日誌
- **WHEN** 系統寫入時間性筆記
- **THEN** 筆記 SHALL 被追加到 `data/prompts/memory/daily/YYYY-MM-DD.md`

#### Scenario: 目錄初始化
- **WHEN** 系統啟動時記憶目錄不存在
- **THEN** 系統 SHALL 自動建立 `memory/` 和 `memory/daily/` 目錄

### Requirement: FTS5 全文搜尋索引
系統 SHALL 使用 SQLite FTS5 virtual table 建立記憶內容的 BM25 關鍵字搜尋索引。

#### Scenario: 搜尋記憶
- **WHEN** 使用者或系統以查詢字串搜尋記憶
- **THEN** 系統 SHALL 回傳按 BM25 分數排序的相關記憶列表

#### Scenario: 自動重建索引
- **WHEN** 記憶檔案被修改（檔案系統 watch 偵測到變更，debounce 1.5 秒）
- **THEN** 系統 SHALL 自動重建 FTS 索引

### Requirement: 向量搜尋（Optional Enhancement）
系統 SHOULD 支援 sqlite-vec 向量搜尋作為 FTS5 的補充。

#### Scenario: 混合搜尋
- **WHEN** sqlite-vec extension 可用且 embedding 已建立
- **THEN** 搜尋 SHALL 使用混合分數（0.7 * vectorScore + 0.3 * bm25Score）

#### Scenario: sqlite-vec 不可用時 fallback
- **WHEN** sqlite-vec extension 載入失敗
- **THEN** 系統 SHALL fallback 到純 FTS5 BM25 搜尋

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

### Requirement: Pre-Compaction 記憶刷入
系統 SHALL 在 context window 接近上限時自動將重要內容刷入記憶。

#### Scenario: Context 使用率達門檻
- **WHEN** `session.usage_info` 事件顯示 context 使用率 >= 75%
- **THEN** 系統 SHALL 觸發記憶刷入（每次 compaction cycle 只觸發一次）

#### Scenario: Compaction 事件觸發
- **WHEN** 收到 `session.compaction_start` 事件且尚未刷入
- **THEN** 系統 SHALL 作為最後機會觸發記憶刷入

### Requirement: System Prompt 記憶注入
PromptComposer SHALL 在組合 system prompt 時注入相關記憶。

#### Scenario: 注入 MEMORY.md
- **WHEN** 組合 system prompt
- **THEN** MEMORY.md 全文 SHALL 被注入為 "Long-term Memory" section

#### Scenario: 注入搜尋結果
- **WHEN** 使用者發送訊息且記憶索引可用
- **THEN** 系統 SHALL 搜尋相關記憶並注入為 "Relevant Past Context" section

### Requirement: LLM 記憶工具
系統 SHALL 提供 4 個 self-control tools 供 LLM 在對話中操作記憶。

#### Scenario: read_memory tool
- **WHEN** LLM 呼叫 read_memory
- **THEN** 系統 SHALL 回傳 MEMORY.md 的完整內容

#### Scenario: append_memory tool
- **WHEN** LLM 呼叫 append_memory(fact, category)
- **THEN** 事實 SHALL 被追加到 MEMORY.md 並更新索引

#### Scenario: search_memory tool
- **WHEN** LLM 呼叫 search_memory(query)
- **THEN** 系統 SHALL 回傳最多 10 筆相關記憶結果

#### Scenario: append_daily_log tool
- **WHEN** LLM 呼叫 append_daily_log(entry)
- **THEN** 條目 SHALL 被追加到今日的日誌檔案

### Requirement: Memory REST API
系統 SHALL 提供完整的記憶管理 REST API。

#### Scenario: CRUD 操作
- **WHEN** 前端呼叫 GET/PUT /api/memory/main
- **THEN** 系統 SHALL 讀取/寫入 MEMORY.md

#### Scenario: 搜尋 API
- **WHEN** 前端呼叫 GET /api/memory/search?q=query
- **THEN** 系統 SHALL 回傳搜尋結果

#### Scenario: 設定 API
- **WHEN** 前端呼叫 GET/PUT /api/memory/config
- **THEN** 系統 SHALL 讀取/寫入記憶設定（enabled, autoExtract, flushThreshold 等）

### Requirement: Memory Settings UI
Settings 面板 Memory tab SHALL 提供完整的記憶管理介面。

#### Scenario: MEMORY.md 編輯
- **WHEN** 使用者在 Memory tab 編輯 MEMORY.md 內容
- **THEN** 系統 SHALL 儲存變更

#### Scenario: 自動記憶開關
- **WHEN** 使用者切換 auto-memory toggle
- **THEN** 自動提取功能 SHALL 被啟用/停用

#### Scenario: 記憶搜尋
- **WHEN** 使用者在搜尋框輸入查詢
- **THEN** 系統 SHALL 顯示匹配的記憶結果

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
