## Context

目前系統是一個跑在 Linux VPS 上的 AI Terminal Web 應用，前端 React 19 + Tailwind CSS 4 + Zustand 5，後端 Express 5 + SQLite (better-sqlite3) + WebSocket。手機瀏覽器為主要操作介面。

現有問題：
- **@ 檔案選擇器**只有 `GET /api/directories` 逐層列出目錄，AtFileMenu 只能一層一層瀏覽
- **Code block** 的 `.prose pre { padding: 0 }` CSS 規則在 unlayered 層級，覆蓋 Tailwind utilities
- **Cron jobs** 是獨立系統（cron_jobs/cron_history 表 + CronPage + CronScheduler），與對話完全分離
- **MCP** REST API 的 POST/DELETE 只影響 in-memory 狀態，不寫回 `.mcp.json`
- **設定頁** 8 個平行 tab 無分類邏輯
- **手機版** TabBar 水平捲動空間不足，底部工具列佔太多螢幕空間
- **Auto-focus** 只在空對話的 tab 切換時觸發

## Goals / Non-Goals

**Goals:**
- 提供全專案模糊檔案搜尋，類似 Claude Code CLI 的 @ 體驗
- 修正 code block 視覺缺陷
- 將 cron 從獨立系統轉為對話內建功能，降低認知負擔
- MCP 設定持久化，重啟後保留
- 設定頁按邏輯分組，提升可尋性
- 手機端 RWD 改善：drawer 側邊欄 + 工具列彈出選單
- 統一 auto-focus 行為

**Non-Goals:**
- 不實作 cron 的 shell 類型執行（移除 shell 類型，只保留 AI prompt）
- 不移除舊 cron DB 表（保留向後相容）
- 不新增桌面版 drawer
- 不重寫 copilot agent 核心

## Decisions

### D1: 模糊搜尋實作方式

**選擇：** 後端 `fs.readdirSync` 遞迴 walk + 簡易評分

**替代方案：** 使用 `glob` 或 `fast-glob` 套件
- 取捨：glob 套件功能強大但需新增 dependency，且我們只需要簡單的檔名子字串匹配+排序，不需要完整的 glob pattern 語法。自行實作控制更精確（深度限制、檔案上限、ignore 列表），且程式碼量小（~60 行）。

**設計：**
- endpoint: `GET /api/directories/search?root=<cwd>&q=<query>&limit=30`
- 忽略：`.git`, `node_modules`, `dist`, `build`, `.next`, `__pycache__`, `.cache`, `.DS_Store`
- 限制：深度 8 層、最多掃 10000 項
- 評分：檔名完全匹配(100) > 檔名包含(80) > 路徑包含(60)，case-insensitive
- 前端 debounce 200ms

### D2: AtFileMenu 雙模式切換

**選擇：** 根據 filter 內容自動切換模式

**替代方案：** 新增明確的 toggle 按鈕讓使用者手動切換
- 取捨：自動切換更無縫，使用者不需要學習新的 UI 操作。規則簡單：filter 含 `/` 走目錄瀏覽，否則走模糊搜尋。空 filter 預設顯示根目錄內容。

### D3: MCP 持久化策略

**選擇：** 讀寫 `.mcp.json` JSON 檔案

**替代方案：** 新增 SQLite `mcp_servers` 表
- 取捨：JSON 檔案與 Claude Code 的 MCP config 格式一致，支援手動編輯。SQLite 適合大量資料但 MCP server 設定通常只有幾筆。JSON 檔案更簡單、更容易 debug，也不需要 migration。

**實作：**
- `addToMcpConfig(filePath, config)`: 讀取 → 去重 → 加入 → 寫回
- `removeFromMcpConfig(filePath, name)`: 讀取 → 過濾 → 寫回
- 路由在 POST/DELETE 成功後同步寫回

### D4: Cron 從獨立系統轉為對話內建

**選擇：** conversations 表新增 cron 欄位 + 新 `ConversationCronScheduler`

**替代方案 A：** 保留 cron_jobs 表，但加上 conversation_id 外鍵關聯
- 取捨：新增外鍵關聯使 schema 更複雜，且需要同時維護兩張表的一致性。直接在 conversations 加欄位更簡單，一張表管一切。

**替代方案 B：** 用 message metadata 儲存 cron 設定
- 取捨：metadata 是 JSON 字串，查詢效率差，且 cron 設定是對話級別的不是訊息級別的。

**設計：**
- 新增欄位：`cron_enabled`, `cron_schedule_type`, `cron_schedule_value`, `cron_prompt`
- `ConversationCronScheduler` 使用 croner (已有 dependency) 處理 cron expression
- 觸發時：新增 user message → 呼叫 copilot session → 回應寫入對話 → WebSocket 廣播
- 只支援 AI prompt 類型（不支援 shell），因為 shell 執行在對話中顯示無意義

### D5: 設定頁分組結構

**選擇：** 4 組分類 + sidebar 群組標題

**替代方案：** Accordion 折疊面板
- 取捨：Accordion 在手機上體驗好但桌面上浪費空間。分組標題 + 子項目清單在兩端都表現良好，且改動量小（只需重組 TABS 陣列為巢狀結構）。

**分組：**
| 群組 | 項目 |
|------|------|
| 一般 | general |
| 提示詞 | system-prompt, profile, openspec |
| 記憶 | memory |
| 工具 | skills, WebSearch (原 api-keys), mcp |

### D6: 手機 Tab 側邊抽屜

**選擇：** 自建 MobileDrawer 元件（CSS transition + fixed overlay）

**替代方案：** 使用第三方 drawer 套件如 vaul
- 取捨：專案不使用任何 UI 套件庫（只有 Tailwind），加入 vaul 不符合慣例。自建 drawer 約 60 行，用 `transform: translateX()` + `transition` 實作，足夠簡單。

**設計：**
- `md:` breakpoint 以上：正常顯示 TabBar
- `md:` breakpoint 以下：隱藏 TabBar，TopBar 左側加 hamburger 按鈕
- Drawer 從左側滑入，`w-72`，含 tab 列表 + 新 tab 按鈕 + 對話搜尋

### D7: 手機工具列彈出選單

**選擇：** MobileToolbarPopup 元件，absolute positioning 彈出

**替代方案：** Bottom sheet（從螢幕底部滑出的半屏面板）
- 取捨：Bottom sheet 需要更多手勢處理和動畫邏輯。參考 Claude Web 的設計（截圖 6），一個簡單的向上彈出選單更合適，也與現有 SlashCommandMenu 的定位方式一致。

**設計：**
- 觸發按鈕使用 SlidersHorizontal icon
- 彈出面板包含：ModelSelector、CwdSelector（含 AI/Bash toggle）、PlanActToggle
- `md:` 以上正常顯示 inline toolbar，以下顯示彈出按鈕

## Risks / Trade-offs

**[Risk] 模糊搜尋在大型 repo 上可能慢** → 設定上限 10000 檔案 + 深度 8 層，超過上限立即截斷返回。前端 debounce 200ms 防止過度請求。

**[Risk] Cron 遷移：舊 cron_jobs 資料不遷移** → 明確為非目標。舊資料保留在 DB 中不刪除，但不再使用。使用者需要重新在對話中設定 cron。

**[Risk] ConversationCronScheduler 記憶體佔用** → 每個 cron 只是一個 croner 實例或 setInterval，佔用極小。單人使用場景不會有大量排程。

**[Risk] CSS layer 修改可能影響其他 prose 元素** → 只搬移 `.prose pre` 這一條規則，不影響其他 prose 樣式。Tailwind utilities 本來就應該能覆蓋 base layer。

**[Risk] MobileDrawer 觸控體驗** → 初始版只支援 backdrop 點擊關閉，後續可追加觸控滑動關閉（touchstart/touchend）。

**[Trade-off] MCP 寫入 JSON 檔案是同步阻塞操作** → 可接受，因為 MCP 設定操作極少（使用者手動新增/刪除），且檔案極小（幾 KB）。不需要非同步 I/O。
