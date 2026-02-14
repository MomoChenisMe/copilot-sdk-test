## 1. 模型選擇器修復（Bug 5）

- [x] 1.1 撰寫後端 repository update model 測試 — 驗證 `repo.update(id, { model })` 能正確更新 DB 中的 model 欄位（`backend/src/conversation/repository.ts`）
- [x] 1.2 實作後端 repository update 支援 model 欄位 — 在 update 方法中新增 `model?: string` 參數和 SQL 更新邏輯（`backend/src/conversation/repository.ts`）
- [x] 1.3 撰寫後端 PATCH route model 測試 — 驗證 `PATCH /api/conversations/:id` 可接受 `{ model }` 並回傳更新後的對話（`backend/src/conversation/routes.ts`）
- [x] 1.4 實作後端 PATCH route 支援 model — 解構 `model` 並傳入 `repo.update`（`backend/src/conversation/routes.ts`）
- [x] 1.5 撰寫前端 handleModelChange 測試 — 驗證 `onModelChange(modelId)` 會呼叫 `updateConversation(id, { model: modelId })`
- [x] 1.6 修復前端 handleModelChange — `AppShell.tsx` 中改為 `updateConversation(activeConversationId, { model: modelId })`；`api.ts` 的 update 型別加入 `model?: string`；`useConversations.ts` 的 update 型別加入 `model`
- [x] 1.7 驗證 — 編譯通過，後端和前端測試全數通過

## 2. ToolRecord 白屏修復（Bug 3）

- [x] 2.1 撰寫 safeStringify 測試 — 驗證 circular reference、null、undefined、正常物件等各種情境的輸出（`frontend/tests/components/copilot/ToolRecord.test.tsx`）
- [x] 2.2 實作 safeStringify 函式 — 在 `ToolRecord.tsx` 中新增 `safeStringify(value: unknown): string`，用 try-catch 包裝 `JSON.stringify`
- [x] 2.3 撰寫 ToolRecord 空值防護測試 — 驗證 `toolName` 為 undefined/null 時顯示 'unknown'
- [x] 2.4 實作 ToolRecord 空值防護 — `record.toolName ?? 'unknown'`，替換所有 `JSON.stringify` 為 `safeStringify`
- [x] 2.5 撰寫 ToolRecordErrorBoundary 測試 — 驗證子元件 throw error 時顯示 fallback UI
- [x] 2.6 實作 ToolRecordErrorBoundary — 新建 `frontend/src/components/copilot/ToolRecordErrorBoundary.tsx`，React class-based error boundary
- [x] 2.7 在 MessageBlock 和 ChatView 中包裝 ToolRecord — 用 ToolRecordErrorBoundary 包住每個 `<ToolRecord>`
- [x] 2.8 驗證 — 編譯通過，所有相關測試通過

## 3. 後端訊息持久化修復（Bug 4 + Bug 2）

- [x] 3.1 撰寫 accumulatingSend 測試 — 驗證 copilot:message / tool_start / tool_end / reasoning / idle 事件的累積和持久化邏輯（`backend/tests/ws/handlers/copilot.test.ts`）
- [x] 3.2 撰寫 accumulatingSend idle 持久化測試 — 驗證 idle 時呼叫 `repo.addMessage` 帶正確的 content 和 metadata（含 turnSegments、toolRecords、reasoning）
- [x] 3.3 撰寫 accumulatingSend 事件轉發測試 — 驗證所有事件在累積後仍然被轉發到前端
- [x] 3.4 撰寫 copilot:send 重設累積狀態測試 — 驗證新 turn 開始時累積狀態被正確重設
- [x] 3.5 撰寫 copilot:abort 保存測試 — 驗證 abort 時已累積的內容被保存到 DB
- [x] 3.6 實作 accumulatingSend — 在 `backend/src/ws/handlers/copilot.ts` 中移除 `wrappedSend`，建立 accumulatingSend 包裝器，實作事件累積和 idle 持久化
- [x] 3.7 實作 copilot:send 累積重設 — 在 `copilot:send` handler 開頭重設累積狀態
- [x] 3.8 實作 copilot:abort 保存 — 在 abort handler 中保存已累積內容
- [x] 3.9 驗證 — 編譯通過，後端全部測試通過；確認不再 per-message 存儲

## 4. 前端 TurnSegment 型別與 Store

- [x] 4.1 定義 TurnSegment 型別 — 在 `frontend/src/lib/api.ts` 新增 `TurnSegment` discriminated union 型別，擴充 `MessageMetadata` 加入 `turnSegments?: TurnSegment[]`
- [x] 4.2 撰寫 store turnSegments 測試 — 驗證 `addTurnSegment`、`updateToolInTurnSegments`、clearStreaming / setActiveConversationId 時重設（`frontend/tests/store/`）
- [x] 4.3 實作 store turnSegments 狀態和 actions — 在 `frontend/src/store/index.ts` 新增 `turnSegments: TurnSegment[]`、`addTurnSegment()`、`updateToolInTurnSegments(toolCallId, updates)`
- [x] 4.4 驗證 — 編譯通過，store 測試通過

## 5. 前端 useCopilot 事件處理重構

- [x] 5.1 撰寫 useCopilot turnSegments 累積測試 — 驗證 copilot:message 推入 text segment、copilot:tool_start 推入 tool segment、copilot:tool_end 更新 tool segment、copilot:reasoning 推入 reasoning segment（`frontend/tests/hooks/useCopilot.test.ts`）
- [x] 5.2 撰寫 useCopilot idle 合併 turnSegments 測試 — 驗證 idle 時 metadata 包含 turnSegments 和 toolRecords 和 reasoning
- [x] 5.3 實作 useCopilot turnSegments 累積 — 在各事件 handler 中同時呼叫 `addTurnSegment` 或 `updateToolInTurnSegments`
- [x] 5.4 實作 useCopilot idle metadata 擴充 — idle handler 中將 `turnSegments` 加入 metadata
- [x] 5.5 驗證 — 編譯通過，useCopilot 測試全數通過

## 6. MessageBlock 交錯渲染

- [x] 6.1 撰寫 MessageBlock turnSegments 渲染測試 — 驗證有 turnSegments 時按順序渲染各 segment 型別（`frontend/tests/components/copilot/MessageBlock.test.tsx`）
- [x] 6.2 撰寫 MessageBlock 向後相容測試 — 驗證無 turnSegments 時 fallback 到現有渲染（toolRecords → text）
- [x] 6.3 撰寫 MessageBlock metadata null 測試 — 驗證 metadata 為 null 時只渲染 text content
- [x] 6.4 實作 MessageBlock turnSegments 渲染 — 在 `frontend/src/components/copilot/MessageBlock.tsx` 中加入 turnSegments 判斷和迴圈渲染
- [x] 6.5 驗證 — 編譯通過，MessageBlock 測試全數通過

## 7. ToolResultBlock 元件

- [x] 7.1 撰寫 ToolResultBlock 測試 — 驗證物件 result（content/detailedContent）、字串 result、異常型別 result 的渲染（`frontend/tests/components/copilot/ToolResultBlock.test.tsx`）
- [x] 7.2 實作 ToolResultBlock 元件 — 新建 `frontend/src/components/copilot/ToolResultBlock.tsx`，支援 code block 渲染和長輸出截斷
- [x] 7.3 整合 ToolResultBlock 到 MessageBlock — 在 turnSegments 渲染中，對 inline result tools（bash/shell/execute/run）的 tool segment 額外渲染 ToolResultBlock
- [x] 7.4 驗證 — 編譯通過，ToolResultBlock 測試通過

## 8. ChatView Streaming Block 重構

- [x] 8.1 撰寫 ChatView streaming block turnSegments 渲染測試 — 驗證 streaming 期間按 turnSegments 順序渲染，尾端顯示 streamingText
- [x] 8.2 實作 ChatView streaming block turnSegments 渲染 — 讀取 store 的 `turnSegments`，按順序渲染已完成段落 + 尾端 streamingText
- [x] 8.3 驗證 — 編譯通過，ChatView 測試通過

## 9. 端對端驗證

- [x] 9.1 執行完整測試套件 — `cd frontend && npm test` 和 `cd backend && npm test`，確認全部通過
- [x] 9.2 手動驗證 Bug 5 — 選擇模型 → 重新整理 → 確認模型已切換（需啟動應用）
- [x] 9.3 手動驗證 Bug 3 — 觸發失敗的工具 → 點擊展開 → 確認不白屏（需啟動應用）
- [x] 9.4 手動驗證 Bug 4 — 發送觸發工具的訊息 → 離開聊天室 → 重新進入 → 確認工具記錄仍在（需啟動應用）
- [x] 9.5 手動驗證 Bug 2 — 連續發送兩次訊息 → 確認無重複內容（需啟動應用）
- [ ] 9.6 手動驗證 Bug 1 — 觸發 bash 工具 → 確認輸出以 code block 顯示、文字和工具按實際順序交錯（需啟動應用）
