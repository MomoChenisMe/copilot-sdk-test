## Context

Copilot Chat UI 目前存在 5 個影響核心使用體驗的問題。經過根因分析，問題主要集中在兩個架構層面：

1. **訊息渲染模型**：一個 AI turn 中的事件（文字、工具呼叫、工具結果、reasoning）在前端以固定順序渲染（reasoning → 所有工具 → 所有文字），而非按事件實際發生順序交錯顯示。這導致 bash 工具的輸出結果（如巴斯卡三角形）被埋在可摺疊的 ToolRecord 元件中。

2. **訊息持久化策略**：後端 `wrappedSend` 攔截每個 `copilot:message` 事件各存一行到 DB，且不存 metadata（toolRecords、reasoning）。這導致重新進入聊天室時工具記錄消失，以及重複訊息問題。

此外還有兩個獨立 bug：ToolRecord 對異常資料的 `JSON.stringify` 未做防護（crash），以及模型選擇器的 `handleModelChange` 未將 `modelId` 傳入更新呼叫。

**現有架構**：
- 前端：React 19 + Zustand 5 + WebSocket
- 後端：Express 5 + better-sqlite3 + EventRelay（SDK 事件轉譯層）
- 事件流：`Copilot SDK → EventRelay → WS → useCopilot hook → Zustand store → React UI`

## Goals / Non-Goals

**Goals:**
- 引入 Turn Segments 資料模型，按事件實際順序交錯渲染文字、工具和 reasoning
- 修復後端訊息持久化，確保 metadata（turnSegments、toolRecords、reasoning）被正確保存和載入
- 修復 ToolRecord crash、重複訊息、模型選擇器等 bug
- 向後相容舊有訊息（無 turnSegments 時 fallback 到現有渲染）

**Non-Goals:**
- 不遷移舊有 DB 資料
- 不改動 EventRelay 的基本架構（它仍負責 SDK → WS 的事件轉譯）
- 不處理 Terminal UI 問題

## Decisions

### Decision 1: Turn Segments 作為核心資料模型

**選擇**：引入 `TurnSegment` discriminated union 型別，每個 turn 記錄為有序的 segment 陣列。

```typescript
type TurnSegment =
  | { type: 'text'; content: string }
  | { type: 'tool'; toolCallId: string; toolName: string; arguments?: unknown; status: 'running' | 'success' | 'error'; result?: unknown; error?: string }
  | { type: 'reasoning'; content: string }
```

**替代方案**：只對 bash 工具特殊處理（自動展開結果）
- 優點：改動最小
- 缺點：不解決事件順序問題，未來加入更多工具類型需要不斷加特殊邏輯

**理由**：Turn Segments 是更通用的模型，一次解決順序問題和結果顯示問題，且與 SDK 的事件驅動架構自然對齊。

### Decision 2: 後端累積存儲（Accumulating Send）

**選擇**：後端 copilot handler 在 turn 期間累積所有事件，只在 `session.idle` 時存一筆合併的 assistant message 到 DB。

**替代方案**：前端在 idle 時發送 `copilot:save_message` WS 訊息回後端
- 優點：前端是 source of truth，可完全控制 metadata 結構
- 缺點：增加一次網路往返；若前端 crash 或斷線，訊息不會被保存

**理由**：後端累積方案更可靠（不依賴前端穩定性），且邏輯集中在一處（copilot handler）。DB 的 `addMessage` 已支援 `metadata?: unknown`，無需 schema 變更。

### Decision 3: 前後端各自獨立建立 turnSegments

**選擇**：前端和後端各自獨立累積 turnSegments — 前端用於即時渲染，後端用於持久化。

**替代方案**：只在後端累積，前端只用於顯示
- 優點：single source of truth
- 缺點：前端 streaming 期間需要即時的 segment 順序，無法等後端

**理由**：兩端接收相同的 WS 事件序列，產出的 segments 應該一致。前端需要即時渲染，後端需要可靠持久化，兩者關注點不同但資料一致。

### Decision 4: ToolResultBlock 作為獨立元件

**選擇**：為 bash/shell 類工具建立獨立的 `ToolResultBlock` 元件，以格式化的 code block 顯示工具輸出。

**替代方案**：在 ToolRecord 元件內部增加 `showResultInline` prop
- 優點：不增加新元件
- 缺點：ToolRecord 職責膨脹，需處理兩種完全不同的渲染模式

**理由**：分離關注點 — ToolRecord 負責顯示工具 metadata（名稱、參數、狀態），ToolResultBlock 負責顯示工具輸出。判斷邏輯：`INLINE_RESULT_TOOLS = ['bash', 'shell', 'execute', 'run']`。

### Decision 5: Error Boundary + safeStringify 雙重防護

**選擇**：ToolRecord 內部加 `safeStringify` 防護，外部加 React Error Boundary。

**替代方案**：只加 Error Boundary
- 優點：更簡單
- 缺點：Error Boundary 觸發後只能顯示 fallback UI，無法恢復

**理由**：`safeStringify` 處理大部分異常資料（circular references、非序列化物件），Error Boundary 作為最後一道防線捕捉未預期的渲染錯誤。

## Risks / Trade-offs

**[前後端 turnSegments 不一致]** → 由於兩端獨立累積，理論上可能出現不一致。**緩解**：兩端接收完全相同的 WS 事件序列，累積邏輯相同，不一致的機率極低。若發生，後端的持久化版本為準。

**[Abort 時資料遺失]** → 使用者中止操作時 `session.idle` 可能不會觸發。**緩解**：在 `copilot:abort` handler 中也執行保存邏輯，保存已累積的內容。

**[舊訊息格式混雜]** → DB 中同時存在舊格式（多行 per-message、無 metadata）和新格式（單行 per-turn、有 turnSegments）。**緩解**：MessageBlock fallback 邏輯 — 有 turnSegments 用新渲染，否則用舊渲染。不遷移舊資料。

**[Streaming UX 改變]** → 從固定順序改為交錯順序，使用者可能需要適應。**緩解**：新的順序更自然（與實際事件發生順序一致），是更好的 UX。

**[模型切換不重建 Session]** → 切換模型只更新 DB 記錄，不主動銷毀現有 SDK session。**緩解**：下次 `copilot:send` 時 `getOrCreateSession` 會根據新的 model 參數建立新 session。若需立即生效，可在 `handleModelChange` 中同時清除 `sdkSessionId`。

## Open Questions

- 中止操作後，SDK 是否仍會發送 `session.idle` 事件？需要實際測試確認。若不發送，`copilot:abort` handler 中的保存邏輯變得更加重要。
