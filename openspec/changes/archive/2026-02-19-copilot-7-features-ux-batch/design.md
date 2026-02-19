## Context

AI Terminal 是基於 `@github/copilot-sdk` 的 Web 應用，架構為：前端（React + Zustand + i18next）↔ WebSocket ↔ 後端（Express + SDK + SQLite）↔ GitHub API。後端以 `StreamManager` 管理 SDK session lifecycle，`EventRelay` 轉發 SDK 事件至 WebSocket，前端透過 `useTabCopilot` hook 訂閱事件並更新 Zustand store。

目前有 6 個 UX 痛點需要修正：

1. AI 缺乏任務規劃與追蹤能力——執行多步驟工作時無法向使用者報告進度
2. 使用者在 Terminal 執行的 bash 指令結果不進入 AI 對話上下文，AI 對工作環境缺乏認知
3. 多個 UI 元件硬編碼英文字串，切換語言後仍顯示英文
4. `ask_user` 工具超時後對話直接中斷，無恢復機制
5. 歡迎頁面與 Tab bar 無法快速存取歷史對話
6. 模型選擇器在頁面重新載入後遺失記憶（`lastSelectedModel` 未從 localStorage 初始化）

## Goals / Non-Goals

**Goals:**

- 新增 Task 管理系統，讓 AI 透過 SDK 自訂工具追蹤多步驟任務進度
- 實現 bash 結果單向注入 copilot 對話上下文的融合機制
- 修復所有已知 i18n 硬編碼問題（4 個元件 + 2 個缺失 key）
- 為 `ask_user` 超時提供 Skip 和 Dismiss 恢復路徑
- 在歡迎頁面和 Tab bar 提供歷史對話快速存取
- 修復模型選擇器持久化
- 所有變更向後相容，不需要 data migration

**Non-Goals:**

- 不實作 Task 跨對話共享或全域任務看板
- 不實作雙向 Bash 融合（AI 不會主動在 Terminal 執行指令）
- 不實作 `ask_user` 自動重試（SDK Promise reject 後技術上無法 retry）
- 不新增 en/zh-TW 以外的語言
- 不引入新的 migration 系統或 ORM

## Decisions

### D1: Task tools 作為 SDK custom tools，而非獨立 REST API

**決策**：將 4 個 task 操作（create/list/get/update）實作為 SDK `Tool` 物件，註冊到 `selfControlTools` 陣列中，遵循現有 `self-control-tools.ts` 和 `web-search.ts` 的 pattern。

**原因**：Task 操作的主要呼叫者是 AI agent 自身——AI 在執行多步驟任務時需要自主建立、更新任務狀態。SDK custom tools 讓 AI 可以直接呼叫這些操作，不需要前端或使用者介入。前端只需被動接收 `copilot:tool_end` 事件來更新 UI。

**替代方案 A**：獨立 REST API（`POST /api/tasks` 等）+ 前端主動呼叫。
- 取捨：REST API 適合使用者驅動的 CRUD 操作，但 Task 的主要消費者是 AI，不是使用者。如果用 REST API，AI 需要透過 `fetch` tool 呼叫自己的後端，增加不必要的間接層。且前端需要獨立的 polling 或 WebSocket channel 來取得即時更新。

**替代方案 B**：純前端 Zustand store 管理 tasks，不經後端。
- 取捨：無法持久化，頁面重載後任務遺失。且 AI 無法透過 SDK tool 存取前端 state。

### D2: Bash context 注入使用 prompt prefix，而非 SDK message injection

**決策**：在後端 `copilot:send` handler 中，將 `pendingBashContext` Map 中累積的 bash 結果作為 prompt 前綴注入。格式為 `[Bash executed by user]\n$ {command}\n{output}\n[exit code: {exitCode}]`。注入後清除 Map entry。

**原因**：SDK session 有自己的內部 message history，我們無法直接插入 message 到 SDK 的 context window 中。SDK 沒有暴露 `addMessage()` 或類似 API 來注入外部 context。唯一可控的注入點是下一次 `sendMessage()` 的 prompt 參數。

**替代方案 A**：使用 SDK 的 message history API 直接注入。
- 取捨：`@github/copilot-sdk` Technical Preview 不提供此 API。即使未來提供，直接操作 SDK 內部 history 可能導致 token 計算不一致或 context window overflow。

**替代方案 B**：透過 system prompt 注入 bash context。
- 取捨：System prompt 由 `PromptComposer` 在 session 建立時設定，修改需要重建 session（重量級操作）。且 system prompt 應保持穩定，不適合放入頻繁變化的 bash 輸出。

**設計細節**：

- `pendingBashContext: Map<conversationId, string[]>` 由 copilot handler 持有
- bash handler 透過 `onBashComplete` callback 將結果傳遞給 copilot handler 的 `addBashContext()` 方法
- 輸出超過 10KB 時截斷，避免超出 token 限制
- 同時將 bash context 儲存至 SQLite（`repo.addMessage`），確保歷史可追溯
- 前端 `!command` 語法在 `AppShell.handleSend` 中偵測並路由至 bash handler

### D3: Ask User 超時處理——Skip only，不支援 Retry

**決策**：在超時前提供 Skip 按鈕（送出預設回答讓 AI 自行決定），超時後顯示黃色提示訊息讓使用者 dismiss。不提供 Retry 按鈕。

**原因**：SDK 的 `onUserInputRequest` 回傳 `Promise<UserInputResponse>`。一旦 5 分鐘超時觸發 `reject()`，這個 Promise 已經 settled，無法再被 resolve。SDK 不支援對同一個 user input request 重新發起 Promise。因此技術上無法在 reject 後 retry。

**替代方案 A**：Retry + Skip 按鈕，retry 時重新發起整個 turn。
- 取捨：需要 abort 當前 stream 並重送最後一條訊息，使用者體驗差（重複回應）且實作複雜。AI 的 internal state 已經更新，重送可能產生不一致行為。

**替代方案 B**：不設超時，永遠等待使用者回應。
- 取捨：SDK session 會無限期占用資源。若使用者關閉瀏覽器或失去連線，session 永遠掛起。5 分鐘超時是合理的平衡點。

**事件流程**：

1. SDK 呼叫 `onUserInputRequest` → 建立 Promise + 5 分鐘 timeout
2. 前端收到 `copilot:user_input` → 顯示對話框（含 Skip 按鈕）
3. 使用者點擊 Skip → 送出「使用者選擇跳過，請自行決定並繼續」→ resolve Promise
4. 若超時 → 後端 broadcast `copilot:user_input_timeout` → reject Promise → 前端顯示超時提示
5. 使用者 dismiss 超時提示 → 清除 UI state

### D4: 歷史對話選擇器——歡迎頁面 inline + Tab bar 下拉

**決策**：在兩個位置提供歷史對話存取：(1) 歡迎頁面（空對話頁）直接顯示最近 10 筆對話列表；(2) Tab bar 的「+」按鈕旁新增歷史下拉按鈕，使用現有 `ConversationPopover` 元件。

**原因**：歡迎頁面是使用者最常看到的起始畫面，直接顯示歷史對話能減少操作步驟。Tab bar 下拉則提供在任何時刻快速切換的能力。兩者互補。

**替代方案 A**：僅使用 Sidebar 全螢幕歷史面板。
- 取捨：需要設計獨立的 sidebar toggle 和 responsive layout。對單人工具來說 overhead 過大。且目前架構沒有 sidebar 概念，引入會大幅改動 `AppShell` layout。

**替代方案 B**：僅在歡迎頁面顯示，不加 Tab bar 下拉。
- 取捨：使用者在對話中途想切換歷史對話時，必須先新增空 tab 才能看到歡迎頁面的歷史列表。Tab bar 下拉解決了這個問題。

**替代方案 C**：使用 React Router 導航至獨立 `/history` 頁面。
- 取捨：需要引入 routing 庫（目前專案不使用 React Router），增加架構複雜度。Inline 方案足以滿足單人工具的需求。

**實作細節**：

- 歡迎頁面從 Zustand store 的 `conversations` 讀取資料，無需額外 API 呼叫
- 重用現有的時間格式化 i18n key（`sidebar.justNow`、`sidebar.minutesAgo` 等）
- Tab bar 下拉重用 `ConversationPopover` 元件，避免重複實作

### D5: 模型選擇器持久化——localStorage 初始化，而非後端 config

**決策**：在 Zustand store 建立時，使用 IIFE 從 `localStorage.getItem('ai-terminal:lastSelectedModel')` 讀取初始值。Model list 載入後驗證已儲存的 model ID 是否仍然有效，無效則 fallback 至第一個可用 model。

**原因**：模型選擇是純前端 preference，不影響後端邏輯。`localStorage` 是最輕量的持久化方式，且已經有寫入邏輯（`setLastSelectedModel` action 已寫入 localStorage），只缺少讀回邏輯。

**替代方案 A**：後端 config API（`GET/PUT /api/config/model`）。
- 取捨：需要新增 API endpoint 和 DB 欄位。對單一偏好設定來說 overhead 過大。且在多裝置場景下也不需要同步（單人工具）。

**替代方案 B**：使用 Zustand `persist` middleware。
- 取捨：需要重構整個 store 的 initialization 邏輯。`persist` middleware 會序列化整個 store slice 到 localStorage，可能包含不需要持久化的 transient state（如 WebSocket 連線狀態、pending requests 等）。IIFE 方式精確控制只讀取需要的值。

**驗證邏輯**：在 `useModels` hook 中，model list fetch 完成後檢查 `lastSelectedModel` 是否存在於列表中。若 model 已被移除（例如 API 端配置變更），自動 fallback 至第一個可用 model。

### D6: Task 資料範圍——SQLite 持久化，而非 per-conversation in-memory

**決策**：新增 `tasks` SQLite 表，以 `conversation_id` 為 foreign key 關聯對話。Task 資料持久化在 DB 中，前端透過 `copilot:tool_end` 事件即時更新 Zustand store。

**原因**：Task 可能跨越多個 AI turn 甚至瀏覽器 session。In-memory 方案會在頁面重載或服務重啟後遺失所有任務進度，使 TaskPanel 與 AI 的認知不一致（AI 的 SDK session context 仍記得任務，但前端 UI 為空）。

**替代方案 A**：Per-conversation in-memory Map。
- 取捨：實作最簡單，不需要 schema 變更。但頁面重載後任務消失，且 AI 可能引用使用者看不到的任務。對 UX 影響嚴重。

**替代方案 B**：將任務存入 conversation message metadata。
- 取捨：需要在每次任務變更時更新 message record，查詢不便。且 metadata 設計為 append-only（每條訊息一份），不適合頻繁更新的任務狀態。

**Schema 設計要點**：

- `status` 使用 CHECK constraint 限制為 `pending`/`in_progress`/`completed`/`deleted`
- `blocks` 和 `blocked_by` 為 JSON array（TEXT），支援任務依賴關係
- `metadata` 為 JSON object（TEXT），支援 AI 附加任意結構化資料
- 使用 `ON DELETE CASCADE` 確保對話刪除時自動清理關聯任務
- 建立 `idx_tasks_conversation_id` 複合索引（conversation_id + status），加速按對話查詢

**Session → Conversation 映射**：Task tools 在 SDK handler context 中只能取得 `sessionId`，需要映射回 `conversationId` 才能正確關聯任務。`StreamManager` 維護 static `sessionConversationMap: Map<string, string>`，在 session 建立時寫入映射。

## Risks / Trade-offs

### R1: Bash context 注入的 token 預算風險

Bash 輸出可能非常大（例如 `cat` 大檔案或 `find /`），注入 prompt 前綴會消耗大量 token，擠壓 AI 的有效 context window。

**緩解**：硬限制 10KB 截斷。超過時保留前 10KB 並附加 `\n...[truncated]` 標記。未來可考慮更智慧的截斷策略（保留頭尾、按 stderr/stdout 分離），但目前 10KB 上限足以涵蓋常見 bash 輸出。

### R2: Task tools 的 sessionId → conversationId 映射可能失效

Static Map 在服務重啟後清空。若 SDK session resume 時 sessionId 改變（Technical Preview 行為未文件化），映射會找不到 conversationId，導致 task tool 無法關聯任務。

**緩解**：在 `StreamManager.resumeSession()` 中同步更新映射。Task tool handler 中加入 guard：若映射不存在，回傳明確錯誤訊息（`"Cannot determine conversation context. Please try again."`），而非靜默失敗。

### R3: `copilot:user_input_timeout` 事件的 race condition

前端可能在收到 `copilot:user_input_timeout` 之前送出使用者回應，但後端 Promise 已經 reject。此時 `pendingUserInputRequests.get(requestId)` 回傳 undefined，使用者回應被忽略但前端不知情。

**緩解**：後端在 reject 前先 `delete` Map entry。前端送出回應時，後端若找不到 requestId 則回傳 `copilot:user_input_error` 事件，前端據此顯示「回應已逾時」提示。

### R4: SDK Technical Preview 不穩定性

`@github/copilot-sdk` 仍是 Technical Preview，custom tools 的 handler 簽名、session lifecycle、event 格式都可能在小版本更新中變更。

**緩解**：所有 SDK 互動封裝在 `session-manager.ts`、`event-relay.ts`、`stream-manager.ts` 三個檔案中。Task tools 遵循現有 tool pattern（與 `self-control-tools.ts`、`web-search.ts` 一致），確保 SDK 變更時影響範圍可控。

### R5: 歡迎頁面歷史列表的效能

`conversations` 從 Zustand store 讀取，store 在初始化時 fetch 所有對話。若對話數量極多（數百筆），渲染最近 10 筆不會有問題，但 store 的初始 fetch 可能較慢。

**緩解**：目前為單人工具，對話數量通常在 50-100 筆以內。若未來需要，可加入 pagination API（`GET /api/conversations?limit=10&offset=0`），但目前不在範圍內。

### R6: Tasks 表的 schema 未來擴展性

目前 schema 為第一版，fields（如 `active_form`、`blocks`、`blocked_by`）可能在實際使用中發現不足。

**緩解**：`metadata` JSON 欄位提供彈性擴展空間。Schema 變更可透過 `CREATE TABLE IF NOT EXISTS` 的冪等性安全處理（新增欄位需要 `ALTER TABLE`，但 SQLite 支援）。`blocks`/`blocked_by` 使用 JSON array 而非 join table，犧牲查詢效能換取 schema 簡潔性——對單人工具可接受。

### R7: i18n 修復可能遺漏

手動審查可能遺漏其他硬編碼字串。

**緩解**：本次修復以已知的 4 個元件為範圍（UserInputDialog、PlanActToggle、CwdSelector、ScrollToBottom）。可在後續 PR 中使用 `grep -r` 掃描 JSX 中的純文字字串進行更全面的審查。

## Migration Plan

所有 7 個功能均向後相容，不需要 data migration：

- **Tasks 表**：使用 `CREATE TABLE IF NOT EXISTS`，在 `migrate()` 函式末尾新增，對現有資料庫無影響。Index 同樣使用 `IF NOT EXISTS`。
- **i18n keys**：新增 key 不影響現有 key。缺失 key 的 fallback 行為不變（i18next 會顯示 key name）。
- **Store 變更**：新增 `tasks` 欄位初始值為空陣列。`lastSelectedModel` 的 localStorage 讀取若失敗（key 不存在）fallback 為 null，與現有行為一致。
- **WebSocket protocol**：新增 `copilot:user_input_timeout` 事件類型。舊版前端不認識此事件會靜默忽略（現有 switch-case 有 default 分支）。
- **Bash handler**：`onBashComplete` callback 為 optional 參數，不傳則行為與現有一致。
- **UI 變更**：歡迎頁面歷史列表在 `conversations` 為空時不渲染。TaskPanel 在 `tasks` 為空時不渲染。Tab bar 歷史按鈕為純新增，不影響現有按鈕佈局。
