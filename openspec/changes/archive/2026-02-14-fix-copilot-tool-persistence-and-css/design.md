## Context

目前的 Copilot Agent 聊天介面存在兩個核心問題：

1. **Tool records 生命週期問題**：Copilot SDK 在一次 assistant turn 中可能發送多個 `copilot:message` 事件（每個事件可包含 text + toolRequests）以及多個 tool execution 事件。當前實作在每個 `copilot:message` 時建立獨立的永久訊息，而 tool records 和 reasoning text 僅存於 streaming state 中。當 `copilot:idle` 觸發 `clearStreaming()` 時，所有 tool records 和 reasoning text 被清空，對話歷史中完全看不到 AI 執行了什麼工具及其結果。

2. **Tailwind CSS v4 cascade layer 衝突**：`globals.css` 中的 `* { margin: 0; padding: 0 }` 是 un-layered CSS。Tailwind v4 使用 native CSS cascade layers（`@layer theme, base, components, utilities`），而根據 CSS 規範，un-layered styles 永遠覆蓋 layered styles，導致所有 Tailwind 的 padding/margin utilities 失效。

**Copilot SDK 事件流（已驗證）：**
- SDK 有 37 種事件類型（`session-events.d.ts`）
- 後端 EventRelay 已正確 relay 8 種核心事件
- `assistant.message.data` 包含 `messageId`、`content`、`toolRequests[]`、`reasoningText?`、`reasoningOpaque?`
- `tool.execution_complete.data.result` 是 `{ content: string, detailedContent?: string }`（物件而非字串）
- `session.idle` 為 ephemeral 事件，`data: {}`

## Goals / Non-Goals

**Goals:**
- 在 `copilot:idle` 後保留 tool records 和 reasoning text 於 message metadata 中
- 將同一 assistant turn 的多個 `copilot:message` 合併為單一完整訊息
- 處理 `copilot:reasoning` 完整事件作為 delta 的 fallback
- 修復 Tailwind CSS cascade layer 衝突，使 padding/margin utilities 正確生效
- 在歷史訊息中渲染 tool records 和 reasoning（使用現有元件）

**Non-Goals:**
- 不修改後端 EventRelay 或新增事件 relay
- 不修改後端訊息持久化邏輯（metadata 目前僅前端保留）
- 不改變 streaming 期間的即時顯示邏輯
- 不新增其他未 relay 的 SDK 事件處理

## Decisions

### Decision 1: Turn 合併策略 — 在 `copilot:idle` 時打包為單一訊息

**選擇**：不在每個 `copilot:message` 時建立永久訊息，改為累積所有 content segments，在 `copilot:idle` 時統一建立一筆含 metadata 的 assistant message。

**替代方案**：保持多訊息架構，在 idle 時將 tool records 附加到最後一筆 assistant message 的 metadata。
- **取捨**：多訊息方案較簡單但失去 tool 和 text 的正確時序關係（tools 發生在兩段 text 之間），且需要額外邏輯判斷「哪一筆」是最後一筆。

**理由**：單一訊息方案更乾淨，一個 turn 對應一筆 message，metadata 完整包含該 turn 的所有活動。

### Decision 2: Metadata 結構 — 使用 `Message.metadata` 現有欄位

**選擇**：利用 `Message` 型別中已存在的 `metadata: unknown | null` 欄位，定義 `MessageMetadata` interface 存放 `toolRecords` 和 `reasoning`。

**替代方案**：擴展 `Message` 型別新增 `toolRecords` 和 `reasoning` 欄位。
- **取捨**：新增欄位需修改 API 型別和後端 schema，影響面更大且與後端 SQLite 結構不一致。

**理由**：`metadata` 欄位已存在，後端已支援 JSON 序列化/反序列化，變動最小。

### Decision 3: CSS 修復策略 — 將 reset 移入 `@layer base`

**選擇**：將 `* { box-sizing; margin; padding }` 和其他 base styles 包裹在 `@layer base {}` 中。

**替代方案 A**：完全移除 `margin: 0; padding: 0` reset，依賴 Tailwind preflight。
- **取捨**：Tailwind v4 的 preflight 已包含 `box-sizing: border-box`，但其 margin/padding reset 行為與自訂 reset 可能不同，移除後可能產生非預期的間距。

**替代方案 B**：使用 `!important` 標記 Tailwind utilities。
- **取捨**：破壞 Tailwind 的 utility 優先級機制，不可接受。

**理由**：`@layer base` 是 Tailwind v4 官方推薦的自訂 base styles 寫法，確保 `@layer utilities` 中的 Tailwind classes 可正確覆蓋。

### Decision 4: 共用型別位置 — `ToolRecord` 定義在 `api.ts`

**選擇**：將 `ToolRecord` interface 移至 `frontend/src/lib/api.ts`，store 透過 re-export 使用。

**替代方案**：建立獨立的 `types.ts` 檔案。
- **取捨**：新增檔案增加維護成本，且 `ToolRecord` 與 `Message` 型別緊密相關。

**理由**：`ToolRecord` 是 `MessageMetadata` 的一部分，而 `MessageMetadata` 依附於 `Message`，放在 `api.ts` 最合理。

## Risks / Trade-offs

**[Risk] 後端和前端的 message 不一致** → 後端繼續在每個 `copilot:message` 時存一筆到 SQLite（僅 text content），前端在 idle 時建立一筆含 metadata 的合併訊息。頁面重新整理後載入的歷史訊息將不含 tool records。
- **Mitigation**：此為已知限制，後端 metadata 持久化屬於未來增強。目前 session 內的體驗是完整的。

**[Risk] `copilot:message` 行為變更可能影響串流顯示** → 改為不在 `copilot:message` 時建立永久訊息，但 streaming block 仍依靠 `streamingText` + `toolRecords` 即時顯示。
- **Mitigation**：streaming 邏輯不變，`copilot:delta` 持續更新 `streamingText`，`copilot:tool_start/end` 持續更新 `toolRecords`。只有永久化時機從 `copilot:message` 延後到 `copilot:idle`。

**[Risk] CSS cascade layer 修復可能影響現有佈局** → 將 `margin: 0; padding: 0` 移入 `@layer base` 後，Tailwind utilities 將正確生效，可能改變目前「意外因 reset 覆蓋而看不到的」padding/margin。
- **Mitigation**：這正是預期行為。所有 Tailwind classes 將如設計般運作。如有個別元素需要調整，逐一修正。

## Open Questions

_目前無待決問題。所有技術決策已確認。_
