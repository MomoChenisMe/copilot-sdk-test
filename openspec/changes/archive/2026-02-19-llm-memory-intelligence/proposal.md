## Why

目前的自動記憶提取系統完全依賴正則匹配（`prefer`、`always use` 等關鍵字），導致三個問題：
1. **召回率低** — 漏掉隱含偏好（如「這寫法太醜」代表偏好簡潔程式碼）
2. **精確率低** — 無品質閘門，正則命中就寫入，垃圾事實（如 "I always use the bathroom"）污染記憶
3. **記憶膨脹** — MEMORY.md 無限增長，重複/過時的事實不會被清理或合併

現有系統已具備完善的儲存層（MemoryStore + SQLite FTS5）和整合層（stream:idle 事件、system prompt 注入），但**提取和品質判斷的智慧層完全缺失**。透過在現有 pipeline 中引入 LLM 智慧判斷，可以大幅提升記憶品質而不影響現有架構。

**目標使用者**：本工具的單人使用者（開發者），希望 AI 助手能跨對話記住偏好、專案慣例和工具選擇。

**使用情境**：使用者在對話中自然地表達偏好（包括隱含的），系統能智慧地提取、驗證、分類和整理這些記憶。

## What Changes

- **新增共用 LLM 呼叫器** — 建立 `MemoryLlmCaller`，利用 Copilot SDK 的 `session.sendAndWait()` 提供非串流 LLM 呼叫能力，供所有記憶智慧功能共用
- **新增 LLM 品質閘門** — 在 `reconcile()` 之後、`apply()` 之前插入 LLM 判斷層，過濾低品質候選事實
- **新增 LLM 智慧提取** — 用 LLM 取代正則 `extractCandidates()`，能理解隱含偏好和上下文語意，正則保留為 fallback
- **新增 LLM 記憶壓縮** — 當事實數量超過門檻時，用 LLM 合併重複、移除過時、分類組織 MEMORY.md
- **擴充記憶設定** — `MemoryConfig` 新增 7 個設定欄位，控制各 LLM 功能的啟用、模型和參數
- **擴充 REST API** — 新增 `POST /compact` endpoint 供手動觸發壓縮
- **擴充 Settings UI** — Memory tab 新增 LLM 功能的 toggle 開關、模型選擇和參數配置

所有新功能**預設關閉**（`false`），現有行為完全不受影響。

## Non-Goals（非目標）

- **不更換儲存引擎** — 不引入 Redis、向量資料庫或其他外部儲存
- **不改變現有 LLM 工具** — 現有 4 個 self-control tools（read_memory、append_memory、search_memory、append_daily_log）保持不變
- **不實作 Embedding 向量搜尋** — 不在此次變更中實作 sqlite-vec 向量搜尋增強
- **不修改 System Prompt 注入邏輯** — PromptComposer 的記憶注入方式不變
- **不改變節流機制** — 現有的 `shouldExtract()` 節流邏輯（minNewMessages、extractIntervalSeconds）保持不變

## Capabilities

### New Capabilities

- `llm-memory-caller`: 共用 LLM 工具呼叫器 — 利用 Copilot SDK 建立拋棄式 session 執行非串流 LLM 呼叫，供記憶品質閘門、智慧提取和壓縮共用
- `llm-memory-gating`: LLM 品質閘門 — 在 reconcile 之後 apply 之前，用 LLM 判斷候選事實是否值得長期記憶，過濾低品質事實
- `llm-memory-extraction`: LLM 智慧提取 — 用 LLM 取代正則進行對話事實提取，能理解隱含偏好和上下文語意，正則作為 fallback
- `llm-memory-compaction`: LLM 記憶壓縮 — 定期用 LLM 合併重複事實、移除過時資訊、分類組織 MEMORY.md，防止記憶膨脹

### Modified Capabilities

- `auto-memory`: 擴充記憶設定（MemoryConfig 新增 7 個 LLM 相關欄位）、擴充 REST API（新增 /compact endpoint）、擴充 Settings UI（新增 LLM 功能配置區塊）

## Impact

- **Backend `backend/src/memory/`** — 新增 4 個模組（llm-caller、memory-gating、llm-extractor、memory-compaction），修改 memory-extractor、memory-config、memory-routes
- **Backend `backend/src/index.ts`** — 初始化新模組，修改 stream:idle handler 整合新 pipeline
- **Backend `backend/src/copilot/client-manager.ts`** — 被新的 MemoryLlmCaller 依賴（唯讀使用，不修改）
- **Frontend `frontend/src/lib/api.ts`** — MemoryConfig 介面擴充
- **Frontend `frontend/src/components/settings/SettingsPanel.tsx`** — Memory tab 新增 LLM 設定區塊
- **Frontend `frontend/src/locales/`** — 新增 i18n 字串
- **API Surface** — 新增 `POST /api/auto-memory/compact` endpoint
- **Dependencies** — 無新外部依賴，僅使用現有 `@github/copilot-sdk`
- **成本影響** — LLM 呼叫會消耗 GitHub Copilot API 額度，每次品質閘門約 50 token、智慧提取約 300 token、壓縮約 1000 token（均使用最低成本模型）
