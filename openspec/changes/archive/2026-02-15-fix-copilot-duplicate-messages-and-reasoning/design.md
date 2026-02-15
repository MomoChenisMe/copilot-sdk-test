## Context

Copilot 聊天功能使用 `@github/copilot-sdk` 的 `infiniteSessions: { enabled: true }` 模式維持多輪對話。目前發現 SDK 在 `session.send()` 時會重播歷史事件（`assistant.message`、`tool.execution_start`、`assistant.reasoning` 等），且每次 turn 建立新的 EventRelay 可能導致事件監聽器在 SDK session 上累積（turn N 有 N 組監聽器）。後端累積層和前端 store 將重播/重複事件當作新內容處理，產生 N 倍重複（N = 對話輪次數）。同時，reasoning 事件從未被加入 `turnSegments` 資料結構，造成串流渲染位置錯誤和持久化後內容遺失。

**現有資料流**：
```
SDK event → EventRelay → accumulatingSend (累積+轉發) → 前端 useCopilot hook → Zustand store
                                ↓ (on idle)
                         persistAccumulated → SQLite
```

**問題點**：
1. `accumulatingSend` 沒有任何事件 ID 追蹤，所有事件都被無條件累積
2. 每次 turn 建立新 EventRelay 可能導致事件監聽器累積，N turn 後產生 N 倍事件
3. `copilot:reasoning_delta` 只更新 `reasoningText`，不加入 `turnSegments`
4. `copilot:reasoning` 完成事件在有 delta 時不加入 `turnSegments`
5. `MessageBlock` 走 turnSegments 路徑時忽略 `metadata.reasoning`

## Goals / Non-Goals

**Goals:**
- 在後端累積層實施綜合 ID 去重（messageId + toolCallId + reasoningId），根本消除所有事件類型的重複問題
- 使用穩定 relay 模式防止事件監聽器累積
- 在前端 hook 實施同等的 belt-and-suspenders 去重防護
- 確保 reasoning 正確出現在 turnSegments 中，串流和持久化都保持位置正確
- 向後相容已儲存的 legacy 訊息資料（turnSegments 無 reasoning 但 metadata.reasoning 有值）

**Non-Goals:**
- 修改 Copilot SDK 或 EventRelay 事件訂閱邏輯
- 遷移或修補已儲存的歷史訊息資料
- 重構 turnSegments 資料模型架構

## Decisions

### Decision 1: 後端攔截 vs 前端攔截

**選擇**：後端 `accumulatingSend` 作為主要攔截點，前端作為備援。

**理由**：後端攔截可同時防止 (a) 重複累積到 SQLite 和 (b) 重複事件轉發到前端，一次解決兩個問題。前端攔截只能防止本地 store 重複。

**替代方案**：僅前端攔截 — 較簡單但 SQLite 仍會存入重複資料，切換對話後重載時重複會重新出現。

### Decision 2: 基於事件唯一 ID 去重

**選擇**：使用 SDK 事件自帶的唯一 ID 欄位做去重 — `messageId` 用於 message/delta、`toolCallId` 用於 tool_start/tool_end、`reasoningId` 用於 reasoning/reasoning_delta。

**理由**：每種事件類型都有 SDK 分配的唯一識別碼。僅去重 messageId 無法防止 tool 和 reasoning 事件的重播。綜合去重覆蓋所有事件類型，確保任何重播都被正確過濾。

**替代方案**：僅 messageId 去重 — 無法處理 tool 和 reasoning 事件的重複，在實測中發現不足。

### Decision 3: reasoning 加入時機 — complete 事件 vs idle 時注入

**選擇**：在 `copilot:reasoning` complete 事件到達時加入 turnSegments。

**理由**：SDK 事件順序保證 reasoning 事件在 message/tool 事件之前，因此在 reasoning complete 時加入 turnSegments 自然保持正確的陣列位置。不需要在 idle 時重新排序。

**替代方案**：在 `copilot:idle` 時將 reasoningText 注入 turnSegments 開頭 — 需要 `unshift` 操作且可能與已有的 reasoning segment 衝突，邏輯更複雜。

### Decision 4: legacy 資料處理 — 渲染降級 vs 資料遷移

**選擇**：在 `MessageBlock` 和 `ChatView` 的渲染邏輯中加入降級檢查。

**理由**：已儲存的訊息數量有限（個人使用工具），渲染層降級即可覆蓋所有 legacy 資料。無需資料庫遷移 script，部署零風險。

**替代方案**：寫 SQLite migration script 更新所有歷史 metadata — 需要解析 JSON、修改、回寫，有資料損壞風險，且收益不大。

### Decision 5: 持久化去重 Set vs 每 turn 重置

**選擇**：去重 Set（`seenMessageIds`、`seenToolCallIds`、`seenReasoningIds`）宣告在 `createCopilotHandler` 閉包層級，跨 turn 永不重置。

**理由**：事件 ID 為全域唯一 UUID，同一 ID 不會在不同 turn 中代表不同事件。持久化 Set 可以過濾跨 turn 的重播（SDK `infiniteSessions` 模式在每次 `session.send()` 時可能重播所有歷史事件，包括前幾輪的）。重置 Set 會讓跨 turn 重播通過過濾。

**替代方案**：每次 `copilot:idle` 和 `copilot:send` 時重置 Set — 最初的設計，但在實測中發現跨 turn 重播仍會穿透，導致第二輪以後的訊息重複。

### Decision 6: 穩定 Relay 模式

**選擇**：在 handler 閉包中建立單一 `EventRelay` 實例，透過可變 `currentSendFn` 回呼切換每次 turn 的 send 函數，而非每次 turn 建立新的 EventRelay。

**理由**：每次 turn 建立新 EventRelay 並 `relay.attach(session)` 時，若舊 relay 的 `detach()` 無法完全清除 SDK session 上的監聽器，就會累積多組監聽器。穩定 relay 模式確保只有一組監聽器始終存在。

**替代方案**：每次 turn 建立新 EventRelay 並手動確保 detach — 依賴 EventRelay.detach() 的正確性，且有競態條件風險（async session 建立期間舊 relay 可能仍在觸發）。

### Decision 7: tool_end 安全守衛

**選擇**：`copilot:tool_end` handler 在處理前檢查對應 `toolCallId` 是否已有 tool record 存在。若無（因為對應 `tool_start` 被去重過濾掉了），直接跳過。

**理由**：當 tool_start 事件被去重過濾後，對應的 tool_end 不應該被處理（因為沒有對應的 record 可以更新）。這防止了 orphan tool_end 事件造成的錯誤。

## Risks / Trade-offs

**[Risk] SDK 事件 ID 行為未文件化** → 我們假設 SDK 為每個事件分配全域唯一 ID（messageId、toolCallId、reasoningId），且重播事件使用相同 ID。若 SDK 改變行為（如每次重播使用新 ID），去重會失效。**Mitigation**：前端 store 仍有 `addMessage` 的 ID 級去重作為最後防線；且即使去重失效也不會比修復前更差。

**[Risk] reasoning segment 重複加入 turnSegments** → 若 SDK 在某些路徑下發出多個 `copilot:reasoning` complete 事件，turnSegments 會有多個 reasoning entries。**Mitigation**：reasoningId 去重可防止同一 reasoning 完成事件被處理多次。MessageBlock 和 ChatView 渲染時使用 `turnSegments.some(s => s.type === 'reasoning')` 檢查。

**[Risk] 去重 Set 記憶體成長** → 持久化 Set 在整個 handler 生命週期內不斷累積 ID。**Mitigation**：每個 turn 通常只有 1-3 個 messageId、0-5 個 toolCallId、0-1 個 reasoningId。即使 100 輪對話也只有幾百個 UUID 字串（< 10KB），記憶體影響可忽略。handler 隨 WebSocket 連線結束而釋放。

**[Trade-off] 穩定 relay 增加閉包狀態** → `currentSendFn` 作為可變變數增加了狀態管理複雜度。**Acceptance**：這是防止監聽器累積的最直接方案，且閉包內的狀態管理是 JavaScript 常見模式。

## Open Questions

（無待解問題，所有技術決策已確定。）
