## 1. 後端綜合事件去重（Bug 1 & 4）

- [x] 1.1 撰寫測試：`copilot.test.ts` 新增 "should skip replayed assistant.message with duplicate messageId" — 發送兩個相同 messageId 的 `assistant.message`，驗證只累積一次、只轉發一次
- [x] 1.2 撰寫測試：`copilot.test.ts` 新增 "should skip replayed copilot:delta for already-seen messageId" — 驗證已完成 messageId 的 delta 事件被跳過
- [x] 1.3 撰寫測試：`copilot.test.ts` 新增 "should allow copilot:message with undefined messageId" — 驗證 messageId 為 undefined 時正常處理
- [x] 1.4 撰寫測試：`copilot.test.ts` 新增 "should skip duplicate tool_start with same toolCallId" — 驗證重複 toolCallId 被跳過
- [x] 1.5 撰寫測試：`copilot.test.ts` 新增 "should skip duplicate reasoning with same reasoningId" — 驗證重複 reasoningId 被跳過
- [x] 1.6 撰寫測試：`copilot.test.ts` 新增 "should skip tool_end when corresponding tool_start was filtered" — 驗證 orphan tool_end 被跳過
- [x] 1.7 撰寫測試：`copilot.test.ts` 新增 "should filter replayed events across turns using persistent dedup sets" — 驗證跨 turn 去重
- [x] 1.8 實作：`copilot.ts` — 在 `createCopilotHandler` 閉包層級宣告三組持久化去重 Set（`seenMessageIds`、`seenToolCallIds`、`seenReasoningIds`）
- [x] 1.9 實作：`copilot.ts` — `accumulatingSend` 為所有事件類型（message、delta、tool_start、tool_end、reasoning_delta、reasoning）加入 ID 去重
- [x] 1.10 實作：`copilot.ts` — 穩定 relay 模式：單一 EventRelay 實例 + 可變 `currentSendFn` 回呼
- [x] 1.11 驗證：執行 `cd backend && npx vitest run tests/ws/handlers/copilot.test.ts`，確認所有測試通過

## 2. 後端 reasoning 寫入 turnSegments（Bug 2 & 3）

- [x] 2.1 撰寫測試：`copilot.test.ts` 新增 "should include reasoning in turnSegments on idle" — 發送 `reasoning_delta` + `reasoning` + `message` + `idle`，驗證 `metadata.turnSegments` 首項為 reasoning segment
- [x] 2.2 撰寫測試：`copilot.test.ts` 新增 "should include reasoning in turnSegments when only copilot:reasoning fires (no deltas)" — 驗證 fallback 路徑
- [x] 2.3 更新測試：`copilot.test.ts` 的 "should persist reasoning in metadata on idle" — 新增斷言 `metadata.turnSegments` 含 reasoning type entry
- [x] 2.4 實作：`copilot.ts` — 拆分 `copilot:reasoning` / `copilot:reasoning_delta` 為獨立 case，`copilot:reasoning` complete 事件時 push reasoning segment 到 `turnSegments`
- [x] 2.5 驗證：執行 `cd backend && npx vitest run tests/ws/handlers/copilot.test.ts`，確認所有測試通過

## 3. 前端綜合事件去重（Bug 1 & 4）

- [x] 3.1 撰寫測試：`useCopilot.test.ts` 新增 "should skip duplicate copilot:message with same messageId" — 發送兩個相同 messageId 的 `copilot:message`，驗證 `turnContentSegments` 只有一項
- [x] 3.2 撰寫測試：`useCopilot.test.ts` 新增 "should allow copilot:message with undefined messageId" — 驗證正常處理
- [x] 3.3 撰寫測試：`useCopilot.test.ts` 新增 "should filter replayed messages across turns using persistent dedup" — 驗證跨 turn 持久化去重
- [x] 3.4 實作：`useCopilot.ts` — 新增三組持久化去重 ref（`seenMessageIdsRef`、`seenToolCallIdsRef`、`seenReasoningIdsRef`）
- [x] 3.5 實作：`useCopilot.ts` — 為所有事件類型加入 ID 去重（message、tool_start、tool_end guard、reasoning_delta、reasoning）
- [x] 3.6 實作：`useCopilot.ts` — 去重 Set 跨 turn 持久化，不在 idle 或 sendMessage 時清空
- [x] 3.7 驗證：執行 `cd frontend && npx vitest run tests/hooks/useCopilot.test.ts`，確認所有測試通過

## 4. 前端 reasoning 加入 turnSegments（Bug 2）

- [x] 4.1 撰寫測試：`useCopilot.test.ts` 新增 "should add reasoning to turnSegments on copilot:reasoning after deltas" — 發送 `reasoning_delta` + `reasoning`，驗證 `turnSegments` 含 reasoning segment
- [x] 4.2 更新測試：`useCopilot.test.ts` 的 "should include toolRecords and reasoning in message metadata on copilot:idle"（行 180）— 因 reasoning 也加入 turnSegments，更新 turnSegments 長度斷言
- [x] 4.3 實作：`useCopilot.ts` — 修改 `copilot:reasoning` handler，始終將 reasoning 加入 `turnSegments`（使用已累積或事件的 content）
- [x] 4.4 驗證：執行 `cd frontend && npx vitest run tests/hooks/useCopilot.test.ts`，確認所有測試通過

## 5. MessageBlock legacy reasoning 降級渲染（Bug 3）

- [x] 5.1 撰寫測試：`MessageBlock.test.tsx` 新增 "renders reasoning from metadata.reasoning when turnSegments has no reasoning entry" — legacy 訊息場景
- [x] 5.2 撰寫測試：`MessageBlock.test.tsx` 新增 "does not double-render reasoning when both turnSegments and metadata.reasoning have it" — 防止重複
- [x] 5.3 實作：`MessageBlock.tsx` — `renderContent()` turnSegments 分支加入 `hasReasoningSegment` 檢查，無則在最前面渲染 `metadata.reasoning`
- [x] 5.4 驗證：執行 `cd frontend && npx vitest run tests/components/copilot/MessageBlock.test.tsx`，確認所有測試通過

## 6. ChatView 串流中 reasoning 渲染（Bug 2 中間態）

- [x] 6.1 撰寫測試：`ChatView.test.tsx` 新增 "renders reasoning during streaming when turnSegments has no reasoning entry yet" — 設定 store 有 turnSegments（tool）和 reasoningText，驗證 ReasoningBlock 渲染
- [x] 6.2 實作：`ChatView.tsx` — turnSegments 渲染分支加入 reasoning 中間態渲染（turnSegments 無 reasoning 但 reasoningText 不為空時在最前面顯示）
- [x] 6.3 驗證：執行 `cd frontend && npx vitest run tests/components/copilot/ChatView.test.tsx`，確認所有測試通過

## 7. 全量驗證

- [x] 7.1 執行全量後端測試：`cd backend && npx vitest run` — 29 files, 259 tests passed
- [x] 7.2 執行全量前端測試：`cd frontend && npx vitest run` — 18 files, 230 tests passed
- [x] 7.3 執行 TypeScript 編譯檢查：`cd backend && npx tsc --noEmit`（既有 auth-routes.ts 型別錯誤，非本次修改） 和 `cd frontend && npx tsc --noEmit`（零錯誤）

---

### 實作演進紀錄

初始設計僅針對 `messageId` 做去重（放在 `AccumulationState` 內，每次 idle/send 重置）。實測發現三個問題：
1. 僅 messageId 去重無法防止 tool 和 reasoning 事件的重播重複
2. 每次 turn 重置 Set 讓跨 turn 重播穿透（SDK `infiniteSessions` 會重播所有歷史事件）
3. 每次 turn 建立新 EventRelay 可能導致 SDK session 上監聽器累積

最終方案演化為：
- **綜合 ID 去重**：三組 Set 覆蓋所有事件類型
- **持久化去重 Set**：宣告在閉包層級，跨 turn 永不重置
- **穩定 relay 模式**：單一 EventRelay 實例 + 可變 send callback
