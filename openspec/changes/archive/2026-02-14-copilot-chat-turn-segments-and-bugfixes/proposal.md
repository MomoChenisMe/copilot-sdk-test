## Why

Copilot Chat UI 存在 5 個影響使用體驗的問題：bash 工具輸出被埋在摺疊區塊中看不到、第二次傳送訊息出現重複內容、失敗的工具點擊後白屏 crash、重新進入聊天室工具記錄消失、模型選擇器無法切換。這些問題讓 AI 對話功能幾乎無法正常使用，需要立即修復。

**目標使用者**：透過手機瀏覽器使用 AI Terminal 的開發者（個人使用）。
**使用情境**：在 Copilot 聊天中執行工具（如 bash 指令）、切換模型、以及跨 session 回顧歷史對話。

## What Changes

- **引入 Turn Segments 模型**：將一個 turn 的事件（文字、工具呼叫、工具結果、reasoning）按實際發生順序記錄為有序段落（`TurnSegment[]`），前端按順序交錯渲染，取代現有的固定順序渲染（所有工具 → 所有文字）
- **Bash 工具結果 inline 顯示**：對 bash/shell 類工具，在 ToolRecord 下方以格式化的 code block 直接顯示輸出結果，不需手動展開
- **修復訊息持久化**：後端改為在 `session.idle` 時才存一筆合併的助手訊息（含 metadata：turnSegments、toolRecords、reasoning），取代現行每個 `copilot:message` 事件各存一行的做法
- **修復重複訊息**：移除 per-message 存儲後自然消除，加上前端 toolCallId 去重防護
- **修復 ToolRecord 白屏 crash**：加入 `safeStringify` 防護和 React Error Boundary
- **修復模型選擇器**：`handleModelChange` 正確將 `modelId` 傳入 `updateConversation`，後端 PATCH route 支援 `model` 欄位更新

## Non-Goals（非目標）

- 不改變 Copilot SDK 事件結構或 EventRelay 的基本架構
- 不遷移舊有對話資料（向後相容，舊訊息 fallback 到現有渲染）
- 不實作對話匯出或分享功能
- 不處理 Terminal UI 的任何問題
- 不新增模型相關的進階功能（如模型比較、自動選擇）

## Capabilities

### New Capabilities

- `turn-segments`: Turn Segments 資料模型與交錯渲染 — 定義 `TurnSegment` 型別、前後端事件累積邏輯、按順序渲染文字/工具/reasoning 段落、bash 結果 inline 顯示

### Modified Capabilities

- `chat-ui`: 訊息渲染從固定順序改為 turnSegments 交錯順序；ToolRecord 加入 Error Boundary 和 safeStringify 防護；streaming block 改用 turnSegments
- `conversation-management`: 後端訊息持久化從 per-message 改為 per-turn（含 metadata）；模型選擇器修復（前後端 PATCH route 支援 model 欄位）
- `websocket-protocol`: 後端 copilot handler 的 wrappedSend 改為 accumulatingSend（累積事件，idle 時存儲）

## Impact

- **Frontend 元件**：MessageBlock、ChatView、ToolRecord、ModelSelector、AppShell
- **Frontend 狀態**：Zustand store 新增 `turnSegments` 狀態和 actions；useCopilot hook 事件處理邏輯重構
- **Frontend 型別**：api.ts 新增 `TurnSegment` 型別，`MessageMetadata` 擴充
- **Backend handler**：`ws/handlers/copilot.ts` 的訊息存儲策略完全重寫
- **Backend API**：conversation PATCH route 新增 `model` 欄位支援
- **資料庫**：messages 表的 metadata 欄位開始實際被使用（之前總是 null）
- **新增檔案**：`ToolRecordErrorBoundary.tsx`、`ToolResultBlock.tsx`
