## 1. 前置：MemoryLlmCaller 共用呼叫器

- [x] 1.1 撰寫 `MemoryLlmCaller` 測試 — 建立 `backend/tests/memory/llm-caller.test.ts`，測試案例：成功呼叫回傳 string、session 建立失敗回傳 null、timeout 回傳 null、session.destroy() 在 finally 中被呼叫、tools 設為空陣列、systemMessage 使用 replace mode。Mock `ClientManager.getClient()` 回傳 mock session。
- [x] 1.2 實作 `MemoryLlmCaller` — 建立 `backend/src/memory/llm-caller.ts`，實作 `call(systemPrompt, userPrompt)` 方法：建立拋棄式 session → `sendAndWait()` → 取 `response?.data.content` → finally `session.destroy()`。預設 model `gpt-4o-mini`，timeout 30000ms。
- [x] 1.3 驗證 — 執行 `npx vitest run tests/memory/llm-caller` 確認全部通過

## 2. MemoryConfig 擴充

- [x] 2.1 撰寫 config 擴充測試 — 更新 `backend/tests/memory/memory-config.test.ts`，新增測試：DEFAULT_MEMORY_CONFIG 包含 7 個新欄位（`llmGatingEnabled`、`llmGatingModel`、`llmExtractionEnabled`、`llmExtractionModel`、`llmExtractionMaxMessages`、`llmCompactionEnabled`、`llmCompactionModel`、`llmCompactionFactThreshold`），舊 config 檔案讀取時新欄位使用預設值。
- [x] 2.2 實作 config 擴充 — 修改 `backend/src/memory/memory-config.ts`，在 `MemoryConfig` interface 和 `DEFAULT_MEMORY_CONFIG` 新增 7 個欄位，所有預設值為 `false` / `'gpt-4o-mini'` / `20` / `30`。
- [x] 2.3 驗證 — 執行 `npx vitest run tests/memory/memory-config` 確認全部通過

## 3. Phase 1：LLM 品質閘門

- [x] 3.1 撰寫 `MemoryQualityGate` 測試 — 建立 `backend/tests/memory/memory-gating.test.ts`，測試案例：具體偏好被 approved、模糊陳述被 rejected、空列表不呼叫 LLM、LLM 回傳 null 時全部 approved（graceful degradation）、JSON 解析失敗時全部 approved、JSON 包裹在 code block 中能正確解析。
- [x] 3.2 實作 `MemoryQualityGate` — 建立 `backend/src/memory/memory-gating.ts`，實作 `filter(actions)` 方法：建構含 few-shot 的品質判斷 prompt → 呼叫 LLM → 雙層 JSON 解析（直接 parse + code block 提取）→ 分類 approved/rejected。
- [x] 3.3 撰寫 `applyWithGating` 整合測試 — 更新 `backend/tests/memory/memory-extractor.test.ts`，新增測試：有 qualityGate 時 apply 只處理 approved、無 qualityGate 時行為不變。
- [x] 3.4 實作 `applyWithGating` — 修改 `backend/src/memory/memory-extractor.ts`，constructor 加 optional `qualityGate?: MemoryQualityGate`，新增 `async applyWithGating(actions)` 方法。
- [x] 3.5 驗證 — 執行 `npx vitest run tests/memory/memory-gating tests/memory/memory-extractor` 確認全部通過

## 4. Phase 2：LLM 智慧提取

- [x] 4.1 撰寫 `LlmMemoryExtractor` 測試 — 建立 `backend/tests/memory/llm-extractor.test.ts`，測試案例：成功提取結構化事實含 category、confidence < 0.7 被過濾、LLM 失敗回傳 null、JSON 解析失敗回傳 null、訊息超過 maxMessages 時截斷。
- [x] 4.2 實作 `LlmMemoryExtractor` — 建立 `backend/src/memory/llm-extractor.ts`，實作 `extractFacts(messages)` 方法：截取最後 N 條訊息 → 建構提取 prompt → 呼叫 LLM → 解析 JSON → 過濾 confidence < 0.7。
- [x] 4.3 撰寫 `extractCandidatesSmartly` 整合測試 — 更新 `backend/tests/memory/memory-extractor.test.ts`，新增測試：有 llmExtractor 且成功時使用 LLM 結果、LLM 失敗時 fallback 到正則、無 llmExtractor 時直接用正則、分類正確傳遞到 reconcile。
- [x] 4.4 實作 `extractCandidatesSmartly` — 修改 `backend/src/memory/memory-extractor.ts`，constructor 加 optional `llmExtractor?: LlmMemoryExtractor`，新增 `async extractCandidatesSmartly(messages)` 方法，`reconcile()` 加 optional `categories` 參數。
- [x] 4.5 驗證 — 執行 `npx vitest run tests/memory/llm-extractor tests/memory/memory-extractor` 確認全部通過

## 5. Phase 3：LLM 記憶壓縮

- [x] 5.1 撰寫 `MemoryCompactor` 測試 — 建立 `backend/tests/memory/memory-compaction.test.ts`，測試案例：shouldCompact 事實未達門檻回傳 false、達門檻回傳 true、冷卻時間內回傳 false、isRunning 時回傳 false、成功壓縮重寫 MEMORY.md 並 reindex、LLM 失敗不動 MEMORY.md、結果無 bullet point 被拒絕、finally 釋放 isRunning 鎖。
- [x] 5.2 實作 `MemoryCompactor` — 建立 `backend/src/memory/memory-compaction.ts`，實作 `shouldCompact()` 和 `compact()` 方法。
- [x] 5.3 撰寫 `/compact` API 測試 — 更新 `backend/tests/memory/memory-routes.test.ts`，新增測試：POST /compact 成功回傳結果、未啟用回傳 400、compact 回傳 null 時回傳提示訊息。
- [x] 5.4 實作 `/compact` API — 修改 `backend/src/memory/memory-routes.ts`，函式簽名加 optional `compactor?: MemoryCompactor`，新增 `POST /compact` endpoint。
- [x] 5.5 驗證 — 執行 `npx vitest run tests/memory/memory-compaction tests/memory/memory-routes` 確認全部通過

## 6. 主程式整合

- [x] 6.1 整合 index.ts — 修改 `backend/src/index.ts`：初始化區建立共用 `MemoryLlmCaller`（根據任一 LLM 功能啟用時建立），建立 `MemoryQualityGate`、`LlmMemoryExtractor`、`MemoryCompactor`（各依 config 條件），注入 `MemoryExtractor`。修改 `stream:idle` handler：`extractCandidates` → `extractCandidatesSmartly`、`apply` → `applyWithGating`、末尾加壓縮觸發。`createAutoMemoryRoutes()` 傳入 compactor。
- [x] 6.2 驗證 — 執行 `npx vitest run tests/memory/` 確認所有記憶模組測試通過

## 7. 前端 Settings UI

- [x] 7.1 撰寫前端測試 — 更新 `frontend/tests/components/settings/SettingsPanel.test.tsx`，新增測試：Memory tab 顯示 LLM 品質閘門 toggle、智慧提取 toggle、壓縮 toggle 和手動壓縮按鈕、toggle 切換更新 config。
- [x] 7.2 擴充 API 介面 — 修改 `frontend/src/lib/api.ts`，`MemoryConfig` interface 新增 7 個欄位，新增 `compactMemory()` 方法呼叫 `POST /api/auto-memory/compact`。
- [x] 7.3 實作 Settings UI — 修改 `frontend/src/components/settings/SettingsPanel.tsx`，Memory tab 新增 LLM Intelligence 區塊：3 個 toggle + model 選擇 + 參數輸入 + 手動壓縮按鈕。
- [x] 7.4 新增 i18n 字串 — 修改 `frontend/src/locales/en.json` 和 `frontend/src/locales/zh-TW.json`，新增 LLM 記憶功能相關翻譯。
- [x] 7.5 驗證 — 執行 `npx vitest run tests/components/settings/SettingsPanel` 確認通過

## 8. 端對端驗證

- [x] 8.1 全量測試 — 執行 `cd backend && npx vitest run` 和 `cd frontend && npx vitest run` 確認所有測試通過
- [x] 8.2 編譯驗證 — 執行 `npx tsc --noEmit` 確認 TypeScript 編譯無錯誤（新增程式碼無 TS 錯誤，既有 stream-manager/mcp 錯誤為先前存在）

## 9. UI 增強：功能說明文字 + 模型選擇下拉選單

- [x] 9.1 撰寫前端測試 — 更新 `frontend/tests/components/settings/SettingsPanel.test.tsx`，新增測試：每個 LLM toggle 下方顯示說明文字（data-testid: `llm-gating-desc`/`llm-extraction-desc`/`llm-compaction-desc`）、啟用功能後顯示模型選擇下拉選單（data-testid: `llm-gating-model`/`llm-extraction-model`/`llm-compaction-model`）、選擇模型後更新 config。
- [x] 9.2 新增 i18n 字串 — 修改 `frontend/src/locales/en.json` 和 `frontend/src/locales/zh-TW.json`，新增功能說明文字翻譯（`llmGatingDesc`/`llmExtractionDesc`/`llmCompactionDesc`）和模型選擇標籤（`selectModel`）。
- [x] 9.3 實作 UI — 修改 `frontend/src/components/settings/SettingsPanel.tsx`，每個 LLM toggle 下方加入說明文字 `<p>`，啟用時顯示模型 `<select>` 下拉選單（從 `useAppStore` 的 `models` 取得清單），選擇後呼叫 `handleLlmModelChange` 更新對應 config 欄位。
- [x] 9.4 驗證 — 執行 `npx vitest run tests/components/settings/SettingsPanel` 確認通過
