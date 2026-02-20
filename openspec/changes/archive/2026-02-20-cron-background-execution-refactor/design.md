## Context

目前的 Cron AI 執行架構將 AI cron job 視為一般對話流程的一部分：`createAiTaskExecutor` 透過 `repo.create()` 建立 conversation，再呼叫 `streamManager.startStream()` 執行。這個設計導致背景任務與互動式對話共享 StreamManager 的 maxConcurrency 限額、每次執行都產生無用的 conversation 紀錄、且 `cron_history` 只能存純文字 output。

前端方面，CronTab 作為 SettingsPanel 內的一個 tab 頁，功能受限於 modal 空間，無法提供完整的管理和監控體驗。整個系統缺乏從 cron 執行結果到用戶互動的閉環。

**現有依賴：**
- `SessionManager`（`copilot/session-manager.ts`）— SDK session 建立/恢復
- `EventRelay`（`copilot/event-relay.ts`）— SDK 事件轉 WsMessage
- `CronStore`（`cron/cron-store.ts`）— SQLite CRUD
- `CronScheduler`（`cron/cron-scheduler.ts`）— croner 定時排程
- WS Router（`ws/router.ts`）— prefix-based 訊息路由

## Goals / Non-Goals

**Goals:**
- Cron AI job 在完全獨立的 SDK session 中背景執行，不佔用 StreamManager 資源
- 每個 job 可獨立配置 model 和 tools（skills、MCP、memory、web search 等）
- 完整紀錄執行過程（turn segments、tool records、reasoning、usage）
- 專屬的前端管理頁面取代 Settings 內的 tab
- WebSocket + Toast + Badge 即時通知
- 從歷史紀錄一鍵開啟新對話（摘要 + 續談）

**Non-Goals:**
- 不實作背景 session 的即時串流顯示
- 不支援 cron job 的 user input 互動
- 不實作歷史紀錄自動過期清理
- 不修改 Shell 類型 cron job 的行為
- 不新增背景 session 的 concurrency 限制（未來可加）

## Decisions

### Decision 1: BackgroundSessionRunner 使用 SessionManager 而非 StreamManager

**選擇：** 新建 `BackgroundSessionRunner` 直接使用 `SessionManager.createSession()` + `EventRelay`。

**替代方案：** 擴充 StreamManager 支援「無 conversation」模式。
- 取捨：需要大幅修改 StreamManager 的核心邏輯（subscriber 管理、event buffer、accumulation persistence），改動風險高，且違背 StreamManager 作為互動式串流管理器的單一職責。

**理由：** SessionManager 是純粹的 SDK session 工廠，無狀態、無副作用，完美契合背景執行的需求。EventRelay 已經實作了完整的 SDK event → WsMessage 轉換，可以直接複用為本地 accumulator 的事件來源。

### Decision 2: Per-Job Tool 配置使用 CronToolAssembler 模組

**選擇：** 獨立的 `CronToolAssembler` 模組，從 `index.ts` 注入共享的 tool 依賴。

**替代方案：** 在 BackgroundSessionRunner 內部組裝 tools。
- 取捨：耦合 tool 建立邏輯與 session 執行邏輯，難以測試和擴充。

**理由：** 分離關注點。tool 組裝是配置問題，session 執行是運行時問題。獨立模組便於單獨測試各種配置組合。

### Decision 3: cron_history schema 使用 ALTER TABLE 遷移

**選擇：** 在 `db.ts` 的 `migrate()` 函數中用 `ALTER TABLE ADD COLUMN`（try/catch 包裝）。

**替代方案 A：** 使用正式的 migration 框架（如 umzug）。
- 取捨：引入新依賴，對單人工具過於 heavyweight。

**替代方案 B：** 建立新 table 並 migrate 資料。
- 取捨：需要資料搬遷邏輯，增加複雜度，且舊資料量很小。

**理由：** 新欄位全部為 nullable TEXT，`ALTER TABLE ADD COLUMN` 在 SQLite 中是安全且快速的。try/catch 確保冪等性。

### Decision 4: 前端 Cron 頁面使用 TabState.mode 擴充

**選擇：** 在現有 `TabState.mode` 上擴充 `'cron'` mode，AppShell 根據 mode 條件渲染。

**替代方案：** 引入 React Router 做頁面路由。
- 取捨：改變整個 app 的導航架構，影響範圍太大，且 tab 模式已是確立的 UX pattern。

**理由：** 與 `'copilot' | 'terminal'` 的 mode 切換一致，最小改動實現獨立頁面。Cron tab 在 TabBar 上有永駐入口。

### Decision 5: Toast 通知使用 Zustand store

**選擇：** 在全域 Zustand store 新增 `toasts: ToastItem[]`，搭配 `ToastContainer` 元件。

**替代方案：** 使用第三方 toast library（如 react-hot-toast、sonner）。
- 取捨：引入外部依賴，可能與現有 Tailwind 樣式衝突，且需求簡單。

**理由：** 需求簡單（3 種類型、自動消失、可點擊），用 Zustand + 自建元件足夠，保持零外部 UI 依賴的一致性。

### Decision 6: WebSocket 通知使用獨立 cron handler

**選擇：** 在 WS router 註冊 `cron` prefix handler，管理獨立的 subscribers set。

**替代方案：** 復用現有的 copilot handler 廣播通道。
- 取捨：cron 事件與 copilot 事件語義不同，混在一起增加前端解析複雜度，且 copilot handler 是 per-connection 狀態管理。

**理由：** 遵循現有的 prefix-based routing 架構（copilot、terminal、cwd、bash），cron 作為獨立 prefix 最乾淨。

## Risks / Trade-offs

**[Risk] 背景 session 無 concurrency 限制** → 多個 cron job 同時觸發時可能產生大量 SDK session。
- Mitigation: 初版不限制，未來可在 BackgroundSessionRunner 加 semaphore。croner 的 `protect: true` 已防止同一 job 重疊執行。

**[Risk] cron_history 資料膨脹** → turn_segments 和 tool_records 可能很大（特別是有大量 tool calls 時）。
- Mitigation: output 已有 10000 字元截斷。可考慮對 turn_segments 也設上限，或未來加 retention policy。

**[Risk] BackgroundSessionRunner timeout 後 SDK session 洩漏** → 如果 session.abort() 失敗，session 可能掛在 SDK 端。
- Mitigation: graceful shutdown 時清理所有活躍的背景 session。timeout 後強制呼叫 abort。

**[Risk] 遷移期間的 cron_history 相容性** → 舊紀錄新增欄位為 NULL。
- Mitigation: 前端和後端的 mapHistory 都將新欄位視為 nullable，null 值不會導致錯誤。

**[Trade-off] 「開啟為對話」建立的 conversation 沒有 SDK session** → 用戶第一次發送訊息時會建立全新的 session，無法延續 cron 的 context。
- Accepted: 這是預期行為。摘要訊息提供了足夠的 context，用戶是在此基礎上開始新的互動。

## Migration Plan

1. 先部署 schema 遷移（additive, zero downtime）
2. 部署 backend 改動（BackgroundSessionRunner + 新 executor + 新 routes + WS handler）
3. 部署 frontend（CronPage + Toast + Badge + Hook）
4. 驗證現有 shell cron jobs 不受影響
5. Rollback: revert commit 即可，schema 遷移的新欄位會被忽略

## Open Questions

（已在 brainstorming 階段確認，無待決問題）
