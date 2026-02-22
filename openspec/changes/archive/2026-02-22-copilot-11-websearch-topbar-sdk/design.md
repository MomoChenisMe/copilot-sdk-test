## Context

目前系統的 Web Search 功能由 Brave API Key 控制啟停——設定 key 後 tool 即可用，由 LLM 自行判斷是否呼叫。使用者希望能像 Claude Desktop 一樣主動強制每次對話都先搜尋。

TopBar 在手機版（<768px）上顯示對話標題時，因缺少 overflow 控制導致文字溢出覆蓋右側按鈕。

設定頁「一般」分頁的 SDK 版本區塊因後端 `getInstalledVersion()` 的路徑解析錯誤（npm hoisting 導致套件不在預期的 `backend/node_modules/` 下），API 回傳 `currentVersion: null`，前端 `{sdkVersion && (` 條件渲染使整個區塊消失。

## Goals / Non-Goals

**Goals:**
- 提供聊天工具列的 Web Search 強制開關（桌面 + 手機）
- 修復手機版 TopBar 標題溢出問題
- 修復 SDK 版本偵測路徑，確保設定頁正確顯示版本

**Non-Goals:**
- 不持久化 web search 偏好至 DB（僅 runtime tab state）
- 不修改 Brave Search Tool 的搜尋邏輯
- 不重新設計 TopBar layout

## Decisions

### Decision 1: Web Search 強制搜尋的實作方式

**選擇：Prompt Injection（在 `finalPrompt` 前方注入指令）**

在後端 WebSocket handler 收到 `webSearchForced: true` 時，於 `finalPrompt` 前方加入強制搜尋的指令文字。

- 替代方案 A：修改 SDK session 的 tool 配置，動態增減 tool — 但 SDK session 建立後不易修改 tool 集，且我們的目標是「強制使用」而非「啟停」。
- 替代方案 B：在 system prompt 層級注入 — 但 system prompt 由 promptStore 管理，動態修改會引入狀態同步問題。

Prompt injection 最簡單直接，不需修改 SDK 層或 system prompt 管理流程。

### Decision 2: Toggle 狀態的作用域

**選擇：Per-tab runtime state（Zustand TabState）**

每個 tab 獨立維護 `webSearchForced` 狀態，不持久化。

- 替代方案：Global setting（持久化至 SETTINGS.json）— 但使用者可能只在特定對話需要強制搜尋，全域設定缺乏彈性。
- 替代方案：Per-conversation DB 欄位 — 過度工程，個人工具不需此複雜度。

### Decision 3: SDK 版本路徑解析

**選擇：`createRequire` + 候選路徑 fallback**

使用 Node.js `createRequire(import.meta.url)` 讓 module resolution 自動處理 npm hoisting。若 `createRequire` 在 tsx 環境下有問題，fallback 到嘗試 2 層（`backend/`）和 3 層（project root）的 `node_modules` 路徑。

- 替代方案：硬編碼 project root 路徑 — 脆弱，依賴目錄結構不變。
- 替代方案：用 `npm ls` 子程序查詢 — 效能差、不必要的複雜度。

### Decision 4: Toggle UI 形式

**選擇：桌面版用單按鈕 icon toggle，手機版用 segmented Auto/Always 切換**

桌面版空間有限，用 `Search` icon 的單按鈕（active 時高亮）。手機版的 MobileToolbarPopup 有充足空間，用 segmented control（與 Mode、Plan/Act 風格一致）。

- 替代方案：桌面版也用 segmented — 工具列空間不夠，會導致換行。

## Risks / Trade-offs

- **[Prompt injection 不可靠]** → LLM 可能忽略注入的指令。緩解：使用強烈措辭（`MUST`、`IMPORTANT`）和結構化標記 `[...]`，實際測試中 Claude/GPT 對此類指令遵從度很高。
- **[createRequire 在 tsx 下的相容性]** → 某些 tsx 版本可能不完全支援 `createRequire`。緩解：保留硬編碼路徑 fallback。
- **[webSearchAvailable 啟動時偵測的時序]** → AppShell mount 時 API 呼叫可能尚未完成，toggle 短暫不可見。緩解：這是可接受的 UX，toggle 會在 API 回傳後出現。

## Open Questions

（無）
