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
