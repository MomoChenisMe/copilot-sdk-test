## Why

Copilot 聊天存在四個影響使用體驗的 Bug：(1) 助手回覆出現 N 份重複內容（N = 對話輪次數），(2) 思考/reasoning 區塊顯示在訊息底部而非頂部，(3) 離開聊天室再回來後思考內容消失，(4) 重複訊息數量與輪次正相關。根本原因是 Copilot SDK 的 `infiniteSessions` 模式在 `session.send()` 時重播歷史 `assistant.message` 事件，而目前後端與前端都沒有基於 `messageId` 的去重機制；同時 reasoning 從未被加入 `turnSegments` 資料結構，導致渲染和持久化都遺漏思考內容。

## 目標使用者與情境

個人開發者透過手機瀏覽器使用 Copilot Agent 聊天，在多輪對話中頻繁切換聊天室。

## What Changes

- 後端 `accumulatingSend` 加入基於 `messageId` 的去重邏輯，阻止 SDK 重播的歷史事件被累積和轉發
- 後端將 reasoning 完成事件的內容寫入 `accumulation.turnSegments`，確保持久化到 SQLite 的 metadata 包含 reasoning segment
- 前端 `useCopilot` hook 加入 `messageId` 去重（belt-and-suspenders 防護）
- 前端 `copilot:reasoning` handler 始終將 reasoning 加入 `turnSegments`
- `MessageBlock` 元件加入 legacy 降級：當 `turnSegments` 無 reasoning segment 但 `metadata.reasoning` 存在時，在頂部補上 ReasoningBlock
- `ChatView` 串流區塊加入中間態處理：reasoning deltas 累積中但 reasoning complete 尚未到達時仍顯示 ReasoningBlock

## 非目標 (Non-Goals)

- 不修改 Copilot SDK 本身的行為或 EventRelay 事件訂閱邏輯
- 不遷移或修改現有 SQLite 中已儲存的歷史訊息資料
- 不重構 turnSegments 資料模型（僅在現有結構上補充 reasoning）
- 不處理 `copilot:delta` 事件的內容去重（delta 為增量文字，不受 message 重播影響）

## Capabilities

### New Capabilities

（無新增能力）

### Modified Capabilities

- `copilot-agent`: 後端累積層加入 `messageId` 去重邏輯，並將 reasoning 寫入 `turnSegments` 持久化
- `chat-ui`: 前端 `useCopilot` 加入 `messageId` 去重，reasoning 加入 `turnSegments`；`MessageBlock` 和 `ChatView` 加入 reasoning 降級渲染

## Impact

- **後端**: `backend/src/ws/handlers/copilot.ts` — AccumulationState 新增 `seenMessageIds` 欄位，`accumulatingSend` 新增去重和 reasoning turnSegment 邏輯
- **前端 hooks**: `frontend/src/hooks/useCopilot.ts` — 新增 `seenMessageIdsRef`，修改 `copilot:message` 和 `copilot:reasoning` handlers
- **前端元件**: `frontend/src/components/copilot/MessageBlock.tsx`、`ChatView.tsx` — 新增 reasoning 降級渲染邏輯
- **測試**: 4 個測試檔案需要新增測試案例和更新既有斷言
- **API/資料庫**: 無 schema 變更，僅 metadata JSON 中新增 reasoning type 的 turnSegment
