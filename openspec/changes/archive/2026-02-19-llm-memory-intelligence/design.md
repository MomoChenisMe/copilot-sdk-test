## Context

現有自動記憶系統位於 `backend/src/memory/`，包含 7 個模組：
- `memory-extractor.ts` — 使用正則匹配提取候選事實，BM25 去重，直接寫入
- `memory-store.ts` — MEMORY.md 和 daily log 的檔案 I/O
- `memory-index.ts` — SQLite FTS5 全文索引
- `memory-tools.ts` — 4 個 LLM self-control tools
- `memory-config.ts` — 設定管理（5 個欄位）
- `compaction-monitor.ts` — Context window 使用率監控
- `memory-routes.ts` — REST API endpoints

提取 pipeline 在 `index.ts` 的 `stream:idle` handler 中執行：
`extractCandidates()` → `reconcile()` → `apply()`

Copilot SDK 提供 `session.sendAndWait()` 方法（預設 60 秒 timeout），可用於非串流 LLM 呼叫。`session.destroy()` 用於釋放資源。

## Goals / Non-Goals

**Goals:**
- 在不破壞現有架構的前提下，於提取 pipeline 的三個關鍵點引入 LLM 智慧
- 所有 LLM 功能可獨立啟用/停用，互不依賴
- LLM 呼叫失敗時 graceful fallback 到原有行為
- 共用 LLM 呼叫基礎設施，避免重複程式碼

**Non-Goals:**
- 不引入新的外部依賴（僅使用現有 @github/copilot-sdk）
- 不修改現有 LLM tools 的行為
- 不實作向量搜尋或 embedding

## Decisions

### Decision 1: 拋棄式 Session 模式 vs 長駐 Session

**選擇：拋棄式 Session**

每次 LLM 呼叫建立新 session，呼叫完畢立即 `destroy()`。

**理由：**
- 記憶 LLM 呼叫頻率低（每 60 秒最多一次），不需要 session 重用
- 避免 session 狀態污染（上下文累積可能影響判斷品質）
- 簡化錯誤處理（session 出問題直接丟棄，無需 recovery）

**替代方案：長駐 Session**
- 優點：省去 session 建立開銷（~200ms）
- 缺點：需管理 session 生命週期、context window 累積、error recovery
- 取捨：記憶呼叫不在效能關鍵路徑上，200ms 延遲可接受

### Decision 2: LLM 呼叫的 JSON 回應解析策略

**選擇：JSON in Markdown 寬鬆解析**

LLM 回應可能包裹在 ````json` code block 中，解析器先嘗試直接 `JSON.parse()`，失敗則用正則提取 code block 內容再解析。

**理由：**
- LLM 輸出格式不完全可控，需要容錯
- 雙層解析成本極低（只在第一次失敗時才做正則提取）

**替代方案：Structured Output / Function Calling**
- 優點：輸出格式保證正確
- 缺點：Copilot SDK 的 `sendAndWait()` 不支援 function calling 模式；需額外設定
- 取捨：寬鬆解析已足夠可靠，且更簡單

### Decision 3: 品質閘門注入點 — Constructor DI vs 方法參數

**選擇：Constructor 依賴注入**

`MemoryExtractor` 在 constructor 接受 optional `qualityGate` 和 `llmExtractor` 參數。

**理由：**
- 初始化時一次性決定是否啟用 LLM 功能，避免每次呼叫都傳參
- 符合現有模組的依賴注入模式（`MemoryExtractor` 已接受 `store`、`index`）
- 新增 `applyWithGating()` 和 `extractCandidatesSmartly()` async 方法，原方法不變

**替代方案：Middleware Pipeline / Strategy Pattern**
- 優點：更靈活，可動態組合 pipeline
- 缺點：過度工程化，目前只有 3 個固定的注入點
- 取捨：YAGNI — 目前不需要動態 pipeline

### Decision 4: 壓縮執行模式 — 同步 vs 非同步

**選擇：Fire-and-forget 非同步**

壓縮在 `stream:idle` handler 中以 `.then().catch()` 方式觸發，不阻塞 idle 處理。

**理由：**
- 壓縮是低優先度的維護操作，不應影響主要對話流程
- `isRunning` 互斥鎖防止並發壓縮
- 5 分鐘冷卻時間防止頻繁觸發

**替代方案：Cron Job / 定時排程**
- 優點：可預測的執行時間
- 缺點：個人工具不需要 cron 排程的複雜度；事件驅動更自然
- 取捨：`stream:idle` 已是最佳觸發點，壓縮需求通常在對話活動後出現

### Decision 5: LLM 模型選擇 — 固定 vs 可配置

**選擇：可配置，預設 `gpt-4o-mini`**

每個 LLM 功能有獨立的 model 設定欄位，預設使用最低成本模型。

**理由：**
- 不同功能對 LLM 能力的要求不同（品質閘門簡單，壓縮較複雜）
- 使用者可能想用更強的模型（如 `gpt-4o`）提升壓縮品質
- 成本控制由使用者自行決定

**替代方案：統一使用主對話模型**
- 優點：配置更簡單
- 缺點：主模型可能太貴（如 claude-opus-4.6）用於記憶工具呼叫
- 取捨：獨立配置提供更好的成本彈性

### Decision 6: 壓縮後重建索引策略

**選擇：全量 reindex**

壓縮完成後呼叫現有 `MemoryIndex.reindexFromFiles(store)` 重建整個索引。

**理由：**
- 壓縮會改變 MEMORY.md 的整個內容，差量更新不可行
- `reindexFromFiles()` 已實作並經過測試
- 事實數量通常 < 100 條，全量 reindex 耗時可忽略

**替代方案：差量更新（diff-based update）**
- 優點：理論上更高效
- 缺點：需要追蹤 LLM 合併了哪些事實、刪除了哪些，邏輯複雜
- 取捨：全量 reindex 簡單且足夠快

## Risks / Trade-offs

### Risk 1: LLM 呼叫延遲影響 idle 處理

**風險：** `sendAndWait()` 可能需要 5-30 秒，在此期間 idle handler 被阻塞。

**緩解：**
- 品質閘門和提取的 timeout 設為 30 秒
- 壓縮以 fire-and-forget 非同步執行，不阻塞 idle handler
- 即使品質閘門超時，fallback 到原有行為（全部通過）

### Risk 2: LLM JSON 輸出不穩定

**風險：** LLM 可能回傳格式錯誤的 JSON，導致解析失敗。

**緩解：**
- 雙層 JSON 解析（直接 parse + code block 提取）
- 解析失敗時 graceful fallback（品質閘門全部通過、提取回退到正則）
- 品質閘門和提取 prompt 包含 few-shot 範例，引導正確輸出格式

### Risk 3: 壓縮損失有用記憶

**風險：** LLM 壓縮時可能錯誤刪除仍然有用的事實。

**緩解：**
- 壓縮 prompt 強調「合併而非刪除」策略
- 壓縮結果必須包含至少一個 bullet point，否則拒絕
- 壓縮前原始內容已在 SQLite 中備份（daily log 不受影響）
- `isRunning` + 冷卻時間防止連續壓縮造成資訊流失

### Risk 4: Copilot API 額度消耗

**風險：** 頻繁的 LLM 呼叫可能消耗大量 API 額度。

**緩解：**
- 所有功能預設關閉
- 使用最低成本模型（gpt-4o-mini）
- 受現有節流機制保護（60 秒間隔、4 條訊息門檻）
- 壓縮有獨立的 5 分鐘冷卻 + 30 條事實門檻

### Risk 5: Session 建立失敗

**風險：** Copilot SDK 可能因認證過期或網路問題無法建立 session。

**緩解：**
- `MemoryLlmCaller.call()` 所有錯誤回傳 `null`
- 所有呼叫方在 `null` 時 fallback 到原有行為
- session 在 `finally` block 中 `destroy()`，確保資源釋放
