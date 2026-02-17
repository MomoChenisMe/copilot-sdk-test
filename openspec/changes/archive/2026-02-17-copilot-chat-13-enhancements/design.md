## Context

AI Terminal 是個人 AI 開發工具（React 19 + Express 5 + @github/copilot-sdk），透過手機瀏覽器操控 Linux VPS。目前累積 6 項影響使用體驗的 bug 與 7 項新功能需求，需要在不改變核心架構的前提下完成增量交付。

**現有架構約束：**
- 前端：React 19 + Zustand 5（per-tab state 隔離）+ Tailwind CSS 4 + react-markdown + lucide-react
- 後端：Express 5 + ws + @github/copilot-sdk v0.1.23 + better-sqlite3 + node-pty
- 狀態管理：Per-tab Zustand store with streaming isolation
- 通訊協定：WebSocket real-time streaming with event dedup
- 資料儲存：SQLite（conversations + messages）+ 磁碟檔案（PROFILE.md、AGENT.md 等）

**問題現況：**
- IME 輸入法（中文/日文）組字中按 Enter 觸發送出
- Markdown heading（H1-H4）在 Tailwind CSS 4 下無樣式
- Slash command 只能在行首觸發，文字後輸入 `/` 無反應
- 新 tab 立即建立空對話記錄，堆積垃圾資料
- 無法刪除對話
- Tab 切換後訊息區顯示前一個 tab 的過時內容

## Goals / Non-Goals

**Goals:**
- 修復 6 項 UX bug：IME composition guard、Markdown typography、mid-text slash command detection、lazy conversation creation、conversation delete、tab switch message loading
- 新增 7 項功能：Web Search 整合、自動記憶系統（Auto Memory）、Usage 追蹤、全域快捷鍵、圖片 Lightbox、Bash prompt 美化、模型能力偵測
- 所有改動維持現有 per-tab 隔離架構，不引入全域副作用

**Non-Goals:**
- 多人協作或多使用者支援（本專案為單人使用）
- Electron 桌面應用打包
- 自建 LLM 推論服務（完全依賴 Copilot SDK）
- 完整終端模擬器替換（保持現有 xterm.js PTY 架構）
- 跨裝置同步（單一 VPS 部署）

## Decisions

### D1: IME Composition Guard — `isComposing` 標準 API 優先

**選擇**：在 `Input.tsx` 的 `handleKeyDown` 頂部加入 `e.nativeEvent.isComposing || e.keyCode === 229` 檢查，若為 true 直接 return。

**替代方案**：
- A) `compositionstart` / `compositionend` event + useRef tracking → 用 ref 手動追蹤 IME 狀態，在 compositionstart 時設 `isComposing.current = true`，compositionend 時設 false。優點是精確控制，缺點是需要額外的 event listener 和 ref，且 compositionend 在不同瀏覽器的觸發時序不一致（Chrome 先 compositionend 再 keydown，Safari 相反），modern browsers 中 `isComposing` 已足夠可靠。

**理由**：`KeyboardEvent.isComposing` 是 W3C 標準 API，所有 modern browsers 皆支援。`keyCode === 229` 是 legacy fallback，覆蓋少數仍回報 229 但不設 `isComposing` 的舊版瀏覽器。此為單行程式碼變更，零風險、零依賴。

### D2: Markdown Typography — Plugin + Explicit Overrides 雙保險

**選擇**：安裝 `@tailwindcss/typography` plugin 並在 `Markdown.tsx` 的 `react-markdown` components prop 中加入 explicit component overrides（h1-h4 font-size/weight、table border-collapse、blockquote border-left 等）。

**替代方案**：
- A) 只安裝 plugin，依賴 `prose-sm` class → 風險是 `prose-sm` 會限制 heading 的 font-size 上限，H1 和 H2 可能看起來一樣大。且 Tailwind CSS 4 的 plugin 載入方式與 v3 不同，可能需要額外配置。
- B) 只加 overrides 不安裝 plugin → 需要手動處理所有 prose styles（paragraph spacing、list markers、code blocks），工作量大且容易遺漏。

**理由**：Belt-and-suspenders 方案確保不管 plugin 是否正確載入，heading 都有正確樣式。Plugin 提供基線 typography，overrides 補上特定需求。`@tailwindcss/typography` 是 Tailwind 官方維護的 first-party plugin，長期維護有保障。

### D3: Mid-text Slash Command Detection — 向後搜尋演算法

**選擇**：新建 `findLastSlashCommand()` 函式，從 `selectionStart`（游標位置）向前搜尋第一個 `/`，驗證其前方為空格、換行、或位於位置 0（行首）。

**替代方案**：
- A) Regex 全文掃描（如 `/(^|\s)\/(\S+)/g`）→ 需要遍歷所有 matches 找到最靠近游標的一個，複雜度高。且 URL 如 `https://example.com` 中的 `//` 容易造成 false positive，需要額外的 negative lookbehind。

**理由**：向後搜尋從游標位置開始，最壞情況 O(n)，但 textarea input 長度通常 < 1000 字，效能足夠。重點邏輯是前置字元檢查——只有空格、換行、行首前的 `/` 才觸發選單，避免 URL（`https://`）和檔案路徑（`/usr/bin`）的誤觸。

### D4: Lazy Conversation Creation — Null ConversationId Draft Tab

**選擇**：`TabState.conversationId` 型別改為 `string | null`，新增 `materializeTabConversation()` Zustand action。新建 tab 時 `conversationId = null`（draft 狀態），首次 `sendMessage()` 時才呼叫 `POST /api/conversations` 建立實際對話記錄，並將回傳的 ID 填入 store。

**替代方案**：
- A) 使用 temporary UUID 作為 conversationId → 前端和後端都需要處理「temp ID → real ID」的替換邏輯（localStorage、WebSocket event routing、message 歸屬），複雜度高。
- B) 後端新增 `draft` status column → 需要 DB schema migration，且需要定期清理 draft 記錄。

**理由**：Null 是語意上最正確的表達——「這個 tab 尚未有對話」。Draft tabs 不需要 persist（瀏覽器 reload 時自然消失，因為沒有內容可恢復）。所有需要 `conversationId` 的操作（sendMessage、loadMessages、deleteConversation）都在使用前做 null check，邏輯清晰。

### D5: Conversation Delete — Hover Icon + Inline Confirm

**選擇**：在 ConversationPopover 的每個對話項目中，hover 時顯示 `Trash2` icon（lucide-react）。點擊後 icon 變為紅色確認狀態（「再點一次刪除」），2 秒後自動恢復。確認後呼叫 `DELETE /api/conversations/:id` + 前端移除 tab/store 資料。

**替代方案**：
- A) Right-click context menu → 手機無 right-click，需要長按模擬，觸控體驗差。
- B) Modal 確認對話框 → 對於頻繁操作（清理多個空對話）過重，打斷操作流。

**理由**：Hover icon + inline confirm 是最輕量的 destructive action 防護。手機觸控可透過 tap 觸發（不需要 hover），2 秒自動恢復避免誤刪。此模式與 VS Code 的 tab close button 一致，開發者熟悉。

### D6: Tab Switch Message Loading — Lazy Loading + Race Condition Guard

**選擇**：在 `ChatView` 中加入 `!messagesLoaded` loading guard，tab 切換時先顯示 loading indicator，待 `GET /api/conversations/:id/messages` 回應後再渲染訊息。在 `handleSelectTab` 中加 race condition guard：若在 API 回應前再次切換 tab，丟棄過時的回應。

**替代方案**：
- A) App mount 時 pre-fetch 所有 tab 的 messages → 大量不必要的 API calls，尤其在 tab 數量多時（≤15 tabs × N messages），延長初始載入時間。

**理由**：Lazy loading + guard 是現有架構的自然增強——per-tab store 已有獨立 state，只需確保 loading 狀態正確管理。Race condition guard 使用 tab ID 作為 stale check（比較發起請求時的 tab ID 與當前 active tab ID），零額外依賴。

### D7: Image Lightbox — React Context 架構

**選擇**：建立 `LightboxContext`（React Context），Provider 放在 `ChatView` level。`MessageBlock` 和 `Markdown.tsx` 內的 `<img>` 元件都可透過 `useLightbox()` hook 觸發全螢幕預覽。Lightbox component 支援縮放（pinch + wheel）、多圖切換（同一對話所有圖片）、下載、鍵盤導航（←→、Esc）。

**替代方案**：
- A) Global Zustand slice → Lightbox 是純 UI 狀態（當前圖片 URL、是否開啟），不需要跨 tab 或 persist，放 Zustand 過重。
- B) Per-message local state → Markdown 渲染的圖片（如 AI 回應中的圖片 URL）位於 react-markdown 的 component override 中，無法向上傳遞 state 到 MessageBlock level。

**理由**：React Context 是此場景的慣用模式——scope 限制在 ChatView（不污染全域 state），Provider/Consumer 關係清晰，支援任意深度的子元件觸發。

### D8: Global Keyboard Shortcuts — 自建 Hook 零依賴

**選擇**：建立 `useGlobalShortcuts()` hook，內部在 `document` 上掛載單一 `keydown` listener。快捷鍵使用 `Cmd/Ctrl + key` 組合（新 tab、關閉 tab、切換模式、開啟設定等）。瀏覽器可能攔截 `Cmd+T`/`Cmd+W`，備用 `Alt+T`/`Alt+W`。

**替代方案**：
- A) 每個 component 獨立監聽 keydown → 分散在多個元件中，難以管理衝突、難以全覽。
- B) 使用 `react-hotkeys-hook` 或 `tinykeys` 等第三方庫 → 增加依賴，且這些庫的 API 對簡單需求來說過度抽象。

**理由**：自建 hook 零新依賴、完全掌控 event 處理邏輯。單一 listener 集中管理所有快捷鍵，便於除錯和擴充。Hook 內部需處理：(1) input/textarea focus 時忽略大部分快捷鍵、(2) 偵測平台（Mac vs others）決定 modifier key、(3) 備用 Alt-based shortcuts for 瀏覽器攔截情境。

### D9: Bash Prompt Oh My Posh Style — 後端 Event 擴充

**選擇**：前端新建 `BashPrompt` component 渲染 Powerline 風格提示符（user@host + cwd + git branch）。後端在 `bash:done` 事件中擴充 env info 欄位：`user`（`os.userInfo().username`）、`hostname`（`os.hostname()`）、`gitBranch`（`child_process.execSync('git branch --show-current')`）。

**替代方案**：
- A) 前端自行呼叫 API 取 env info → 每次命令結束都多一個 HTTP round-trip，在手機網路下 latency 明顯。
- B) 一次性取 env 然後 cache → `git branch` 在使用者切換分支或 cwd 後會改變，cache 會過時。

**理由**：每次 `bash:done` 帶 env info 是最即時的方案。`os.userInfo()` 和 `os.hostname()` 是 Node.js sync call，開銷可忽略。`git branch --show-current` 需要 spawn process，但只在命令完成後才呼叫，不影響命令執行效能。前端 Powerline 渲染純 CSS（Unicode segment separators + background color），無需額外字型依賴。

### D10: Web Search — SDK 內建 + Brave Search 雙軌

**選擇**：雙軌方案——(1) Copilot SDK 內建 web search 預設啟用（零設定即用），(2) Brave Search API 作為 `defineTool()` 自訂 tool 註冊到 SDK session（需使用者提供 API key）。前端 SettingsPanel 新增 Brave API Key 輸入欄位。

**替代方案**：
- A) 只用 SDK 內建 web search → 搜尋結果格式和品質不可控，無法自訂搜尋參數（如 region、freshness）。
- B) 只用 Brave Search → 必須有 API key 才能搜尋，沒 key 的使用者完全失去搜尋能力。
- C) 使用 Google Custom Search API → 需要 Google Cloud 帳號設定，設定門檻高。Brave Search API 免費方案提供每月 2000 次查詢，更適合個人開發者。

**理由**：雙軌方案最大化可用性。SDK 內建搜尋零設定門檻，Brave Search 提供更精確的搜尋控制。Brave tool 定義為獨立模組（`copilot/tools/web-search.ts`），session 建立時依據是否有 API key 決定是否註冊。

### D11: Auto Memory — 檔案 + FTS5 + LLM Extraction

**選擇**：採用 OpenClaw 風格架構：
- **儲存層**：MEMORY.md（核心記憶）+ `memory/daily/YYYY-MM-DD.md`（每日日誌）為 source of truth
- **索引層**：SQLite FTS5 full-text search 為主搜尋（BM25 ranking），sqlite-vec 向量搜尋為 optional enhancement
- **提取層**：LLM 自動提取——在對話串流結束後，使用 ephemeral SDK session 分析近期訊息，提取值得記憶的事實
- **注入層**：PromptComposer 在 system prompt 中注入相關記憶（FTS5 搜尋 user prompt → top-K results）
- **壓縮層**：context window 使用率超過閾值時，將對話摘要 flush 到每日日誌

**替代方案**：
- A) 純 in-memory 儲存 → session 結束即消失，無法跨對話延續記憶。
- B) Mem0 cloud service → 引入外部依賴和網路延遲，不符合 self-hosted 理念。
- C) ChatGPT 風格（每條訊息 pre-computed summary）→ 每條訊息都需要額外 LLM call，成本和延遲過高。
- D) 純 SQLite 結構化儲存 → 失去人可讀性和手動編輯能力。

**理由**：檔案為 source of truth 確保人可讀、可 `cat`、可手動編輯（重要 for VPS 使用情境）。FTS5 是 SQLite 內建 extension，better-sqlite3 已支援，零新依賴。sqlite-vec 為 optional 是因為 native extension 在某些平台可能編譯失敗。Memory extraction 使用 ephemeral SDK session 隔離於主對話，不干擾 streaming 和 context window。節流策略：60 秒間隔 + 至少 4 條新訊息才觸發 extraction。

### D12: Usage Tracking — Event-driven Per-tab State

**選擇**：後端轉發 Copilot SDK 的 `assistant.usage`（token counts）和 `session.usage_info`（context window 使用率）事件到前端。前端 per-tab Zustand state 儲存 `UsageInfo`（prompt tokens、completion tokens、total tokens、context usage percentage）。新建 `UsageBar` component 在 ChatView 底部顯示使用率。

**替代方案**：
- A) Polling REST endpoint → 需要額外 endpoint、有 latency、不即時、與現有 streaming 架構不一致。

**理由**：Event-driven 方式與現有 WebSocket streaming 架構完全一致——SDK event → backend relay → frontend store update → UI re-render。Per-tab isolation 防止不同 tab 的 usage 資料 cross-talk。`UsageBar` 為輕量 UI（一行文字 + progress bar），不影響 ChatView 效能。

### D13: Model Capabilities — 前端 Prefix-match Map

**選擇**：在前端建立 `model-capabilities.ts`，定義 prefix-match capability map。例如 `gpt-4o` prefix 支援 `vision`、`gpt-4o-mini` 不支援 `file-attachment`。`Input.tsx` 的附檔按鈕根據當前模型的 capabilities 決定是否顯示/啟用。

**替代方案**：
- A) Backend API 回傳 capabilities → 需要新增 endpoint，且 Copilot SDK (Technical Preview) 未必提供此 metadata。每次切換模型都需要 API call。

**理由**：前端 hardcoded map 最簡單直接，無 API dependency。Prefix matching（`gpt-4o` 匹配 `gpt-4o-2024-05-13`）覆蓋大部分情境。新模型出現時只需更新 map 檔案。未來若 SDK 提供 capabilities API，可無縫切換為 backend-driven，因為 consumer interface（`getModelCapabilities(modelId)`）保持不變。

## Risks / Trade-offs

### [R1] Memory Extraction LLM Calls 增加 SDK Usage Quota
**風險**：自動記憶提取使用 ephemeral SDK session 呼叫 LLM，會消耗 Copilot SDK 的 usage quota。高頻對話下可能快速消耗配額。
**緩解**：節流策略——60 秒最小間隔 + 至少 4 條新訊息才觸發 extraction。SettingsPanel 提供 toggle 可完全關閉 auto-extract。Extraction prompt 設計為簡短（< 500 tokens input），降低單次消耗。

### [R2] sqlite-vec Native Extension 平台相容性
**風險**：sqlite-vec 是 native C extension，在某些 Linux 發行版、ARM 架構或缺乏 build tools 的環境下可能編譯失敗。
**緩解**：sqlite-vec 定位為 optional enhancement——FTS5 BM25 為 primary search（零新依賴，better-sqlite3 內建支援）。程式碼中以 try/catch 載入 sqlite-vec，失敗時 gracefully fallback 到 FTS5-only 模式。

### [R3] 瀏覽器攔截全域快捷鍵
**風險**：`Cmd+T`（新 tab）、`Cmd+W`（關閉 tab）等快捷鍵會被瀏覽器攔截，前端 `e.preventDefault()` 無法覆蓋。
**緩解**：使用 `Alt+T`/`Alt+W` 作為備用快捷鍵。`useGlobalShortcuts` 在嘗試 `e.preventDefault()` 後檢測是否生效，若否則使用 Alt-based fallback。未來若打包為 Electron 應用，可完全接管系統快捷鍵。ShortcutsPanel 顯示實際可用的快捷鍵（根據平台偵測結果）。

### [R4] IME `isComposing` 極少數瀏覽器不支援
**風險**：極少數舊版瀏覽器可能不設 `isComposing` property 但仍在 IME 組字中。
**緩解**：`keyCode === 229` 作為 fallback 覆蓋 legacy browsers（keyCode 229 是瀏覽器在 IME composition 時回報的標準 virtual keyCode）。雙重檢查（`||` 連接）確保兩者任一為 true 即攔截。

### [R5] Draft Tab 的 localStorage Persistence
**風險**：`conversationId = null` 的 draft tab 若被 persist 到 localStorage，reload 後會產生無法恢復內容的 ghost tabs。
**緩解**：Tab persistence 邏輯排除 `conversationId === null` 的 tabs。reload 後 draft tabs 自然消失——這是可接受的，因為 draft tab 定義上沒有任何已發送的訊息（還沒有 materialized conversation）。

### [R6] Brave Search API Key 安全
**風險**：API key 若透過 WebSocket 傳到前端，可被 DevTools 攔截。
**緩解**：API key 只存在後端 config 檔案和環境變數中。前端 SettingsPanel 的 API key 輸入透過 REST API `POST /api/settings` 送到後端儲存，response 中不回傳完整 key（僅回傳 masked value 如 `sk-...xxxx`）。Brave Search tool 在後端執行，API key 永不出現在 WebSocket 訊息或前端 state 中。

### [R7] Memory 檔案膨脹
**風險**：大量 LLM writes 可能使 MEMORY.md 和 daily logs 持續增長，影響 system prompt 注入的 token 消耗。
**緩解**：`MemoryConfig.maxMemoryFileSize`（default 50KB）限制 MEMORY.md 大小，超過時觸發 compaction（LLM 摘要壓縮）。Daily logs 按日切割，舊日誌只透過 FTS5 索引存取而非直接注入 prompt。system prompt 注入的記憶內容也有 token 上限（default 2000 tokens）。

## Open Questions

1. **sqlite-vec 作為 Phase 1 需求？** 建議先以 FTS5-only 實作記憶搜尋，後續 PR 再加向量搜尋。FTS5 BM25 ranking 對關鍵字搜尋已足夠，向量搜尋的增益需要實測驗證。
2. **Brave Search API 在手機網路下的表現？** Brave Search API 的 latency（官方 P50 ~200ms）在 4G/LTE 下可能疊加 100-300ms 網路延遲。需要實測是否影響 UX，以及是否需要加 timeout + fallback 到 SDK 內建搜尋。
3. **SDK `assistant.usage` 事件欄位結構？** Copilot SDK Technical Preview 的 usage event `data` 確切欄位名稱需驗證（如 `prompt_tokens` vs `promptTokens`、是否包含 `cost` 欄位）。需在實作時參照 SDK source code 或實際事件 log。
