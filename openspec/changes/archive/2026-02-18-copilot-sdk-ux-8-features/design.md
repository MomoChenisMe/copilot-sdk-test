## Context

AI Terminal 是一個運行在 Linux VPS 上的 Web 應用，透過 `@github/copilot-sdk` v0.1.23 提供 AI Agent 能力。目前架構為：前端（React + Zustand）↔ WebSocket ↔ 後端（Express + SDK）↔ GitHub API。

現有痛點：
- 所有工具呼叫自動批准（`autoApprovePermission`），缺乏安全控制
- SDK 的 `onUserInputRequest` handler 未啟用，AI 無法向使用者提問
- 用量只在前端 Zustand store 中暫存，不持久化
- `assistant.usage` 事件的 `quotaSnapshots` 未轉發，無法顯示 premium request 配額
- CWD 選擇器只是文字輸入、設定頁面擠在 drawer 中
- 無 Artifacts 預覽、無 scroll-to-bottom 按鈕

## Goals / Non-Goals

**Goals:**
- 利用 SDK 現有 handler（`onPermissionRequest`、`onUserInputRequest`）實現 plan mode 和 ask-user 功能
- 在不改動 DB schema 的前提下持久化用量資料（利用 metadata JSON）
- 為 8 個功能提供統一的技術設計，確保它們在 store/WS/UI 層面協調一致
- 維持手機優先的 UX 設計原則

**Non-Goals:**
- 不引入新的資料庫表或 migration 系統
- 不實作 Artifacts 的編輯/版本控制功能
- 不實作 MCP Server 或 Custom Agents 整合
- 不改變認證或授權機制

## Decisions

### D1: Plan Mode 使用 closure-based permission handler

**決策**：在 `startStream()` 中建立 closure，讓 `onPermissionRequest` 讀取 `stream.mode`，而非每次送訊息時重建 session。

**原因**：SDK session 是重量級物件，不應頻繁重建。Closure 允許在不重建 session 的情況下動態改變 permission 行為。

**替代方案**：每次模式切換時重建 SDK session。
- 取捨：更簡單但會導致 context 遺失和高延遲。不可接受。

### D2: AskUserQuestion 使用 Promise bridge + Map 追蹤

**決策**：在 `ConversationStream` 中維護 `pendingUserInputRequests: Map<requestId, { resolve, reject, timeoutId }>`。SDK 呼叫 `onUserInputRequest` 時建立 Promise，前端回應時 resolve。

**原因**：SDK 的 `onUserInputRequest` 需要同步回傳 `Promise<UserInputResponse>`。需要一個機制把非同步的 WebSocket 回應橋接回 Promise。

**替代方案**：使用 EventEmitter 模式等待回應。
- 取捨：EventEmitter 不如 Map 精確（需要匹配 requestId），且 Promise 語義更清晰。

**Timeout**: 5 分鐘。超時則 reject Promise，SDK 會收到錯誤。

### D3: Usage 持久化利用現有 metadata JSON

**決策**：在 `AccumulationState` 中累積 usage（token、quota），在 `persistAccumulated` 時寫入 message metadata。

**原因**：現有 `messages.metadata` 欄位已是 JSON TEXT，不需要 schema 變更。前端載入歷史時自然可以讀取。

**替代方案**：新增獨立的 `usage` 表。
- 取捨：新表提供更好的查詢能力，但此專案為單人使用，不需要複雜的用量報表。利用 metadata 最輕量。

### D4: Artifacts 使用 fenced code block 語法偵測

**決策**：使用自定義 fenced code block 語法：`` ```artifact type="markdown" title="..." ``。在前端用 regex 解析。

**原因**：不需要後端參與，純前端解析。與現有 Markdown 渲染流程相容。

**替代方案 A**：使用特殊 HTML 標籤（如 `<artifact>`）。
- 取捨：需要 Markdown renderer 支援自定義 HTML，可能被 sanitizer 過濾。

**替代方案 B**：後端偵測 artifact 並作為獨立 WS 事件發送。
- 取捨：需要後端改動，且 artifact 定義應由 AI 回應驅動而非後端邏輯。

### D5: 全頁面設定使用 fixed overlay

**決策**：設定頁面使用 `fixed inset-0 z-50` 覆蓋整個畫面，內部左側導航 + 右側捲動內容。

**原因**：符合桌面應用設定頁面的標準模式（VS Code、Figma），空間充足。在手機上左側導航改為頂部水平 tabs。

**替代方案**：使用 React Router 導航到獨立 /settings 頁面。
- 取捨：需要引入路由庫，增加複雜度。Overlay 模式不需要路由，按 Escape 即可返回。

### D6: Directory Picker 使用後端 API + 前端 Popover

**決策**：新增 `GET /api/directories?path=...` REST 端點，前端用 popover 顯示結果。

**原因**：前端無法直接存取伺服器檔案系統，必須透過後端。REST API 比 WebSocket 更適合這種 request-response 模式。

**替代方案**：透過 WebSocket 發送目錄列表請求。
- 取捨：WS 適合串流事件，不適合 CRUD 式查詢。REST 語義更明確。

### D7: `copilot:quota` 作為獨立 WS 事件

**決策**：將 `quotaSnapshots` 從 `copilot:usage` 分離為獨立的 `copilot:quota` 事件。

**原因**：`quotaSnapshots` 不是每次 `assistant.usage` 都存在。分離後，前端可以獨立處理 quota 邏輯，不影響現有 token 追蹤。

**替代方案**：擴展現有 `copilot:usage` 事件包含所有欄位。
- 取捨：會破壞現有前端 `copilot:usage` handler 的假設。分離更安全。

## Risks / Trade-offs

### R1: SDK Technical Preview 不穩定性
`@github/copilot-sdk` 仍是 Technical Preview，`onUserInputRequest` 和 `quotaSnapshots` 的 API 可能變更。
→ **緩解**：將 SDK 互動封裝在 `session-manager.ts` 和 `event-relay.ts` 中，變更只需修改這兩個檔案。

### R2: Plan mode 的 closure 可能在 session resume 時失效
SDK session resume 會重建 internal state，`onPermissionRequest` handler 需要重新附加。
→ **緩解**：在 `resumeSession()` 中同樣傳入 `onPermissionRequest`，確保 resume 時 handler 生效。

### R3: AskUserQuestion timeout 可能讓 SDK session 進入異常狀態
5 分鐘 timeout reject 後，SDK 可能不知道如何處理錯誤。
→ **緩解**：測試 SDK 在 `onUserInputRequest` reject 時的行為。若 SDK 會自動 retry，需要在 reject 時同步 abort stream。

### R4: Artifacts iframe 的安全風險
HTML artifact 使用 `<iframe sandbox="allow-scripts" srcDoc={...}>`，可能存在 XSS 風險。
→ **緩解**：使用 `sandbox` 屬性限制 iframe 能力（禁止 `allow-same-origin`、`allow-top-navigation`）。只允許 `allow-scripts`。

### R5: Mermaid 套件體積較大
`mermaid` 是一個重量級 npm 套件，可能影響前端 bundle 大小。
→ **緩解**：使用動態 `import()` 延遲載入 mermaid，只在需要渲染 Mermaid diagram 時才載入。

### R6: Directory traversal 攻擊
目錄列表 API 可能被利用瀏覽敏感路徑。
→ **緩解**：使用 `path.resolve()` 防止 `..` 攻擊。由於此應用為單人使用且需要認證，且使用者本身就有完整 terminal 存取權限，風險可接受。額外加上 null byte 檢查。

### R7: 8 個功能同時開發可能互相衝突
多個功能共同修改 `store/index.ts`、`ChatView.tsx`、`stream-manager.ts`。
→ **緩解**：依照建議的 Phase 順序實作。每個 Phase 完成後執行完整測試套件。

## Open Questions

1. `quotaSnapshots` 在 `assistant.usage` 事件中的確切結構——需要在真實環境中驗證（SDK 文件可能不完整）。
2. SDK 的 `onUserInputRequest` handler 在 reject 時的確切行為——需要實際測試。
3. Mermaid 在手機瀏覽器上的渲染效能——可能需要設定最大圖表複雜度限制。
