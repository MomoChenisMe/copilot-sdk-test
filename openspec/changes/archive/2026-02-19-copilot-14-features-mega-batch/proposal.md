## Why

AI Terminal 經過多輪迭代已具備核心功能，但在日常手機使用中暴露了多項 UX 缺陷和功能缺口：前端斷線後無法恢復 AskUser 對話狀態、底部工具列在行動裝置上擁擠、思考動畫過於簡陋、Toggle 按鈕全紫色違和、AskUser 缺乏多選與 inline 體驗。此外，專案缺少 MCP 工具擴展機制、定時任務排程、SDK 版本管理等進階基礎設施。現在是補齊這些短板的時機，讓 AI Terminal 從堪用提升到好用。

**目標使用者：** 開發者本人，透過手機瀏覽器遠端操控 AI 編程助手。
**使用情境：** 在外出通勤時透過手機發送 AI 任務、瀏覽器不小心關閉後重新開啟能恢復狀態、透過 MCP 擴充 AI 工具能力、排程定時任務自動執行。

## What Changes

### 後端韌性
- 新增 `copilot:query_state` WebSocket 協議，前端重連後可查詢活躍 stream 狀態與 pending user input
- AskUser 中斷恢復：後端持久化 pending user input request 資料，前端重連後自動重新顯示對話框
- 延長 AskUser timeout 從 5 分鐘到 30 分鐘（無訂閱者時暫停計時）

### AskUser 全面升級
- 支援 `multiSelect` 多選模式（checkbox UI + 批次提交）
- 從全螢幕 modal overlay 改為 inline chat card（嵌入訊息流中）
- 支援 radio button（單選）和 checkbox（多選）兩種模式

### UI/UX 優化
- 抽取可複用 `ToggleSwitch` 元件，改用綠色 track 取代全紫色
- 思考動畫改為 Claude Code 風格：Unicode 字元脈動 + 隨機狀態短語 + 已用時間
- 全面 RWD 修正：底部工具列在 mobile 換行堆疊、CWD 選擇器路徑截斷、各元件在 320px~1920px 均可用

### SDK 管理
- Model 列表加入 TTL cache 與定期刷新機制
- Premium Request 改為即時查詢（僅 Copilot 訂閱者顯示），與 token 用量分開展示
- SDK 版本檢查 + 一鍵更新：從 npm registry 查詢最新版、提供更新按鈕觸發 `npm update` 並重啟後端
- 預設模板增加匯入/匯出 JSON 功能

### 新基礎設施
- MCP (Model Context Protocol) 完整實作：`.mcp.json` 設定檔、stdio + HTTP 傳輸、熱重載、Settings UI 管理介面
- Cron 定時任務：支援 AI 對話任務和 Shell 命令、cron 表達式 / 間隔 / 一次性排程

## Non-Goals（非目標）

- 不做多用戶權限系統（維持單人使用設計）
- 不做 MCP server 的開發框架（只做 client 端消費）
- 不做 Cron 任務的分散式排程（單一後端 process 執行）
- 不做完整的 CI/CD pipeline 整合
- 不做 Premium Request 的 GitHub REST API 查詢（僅依賴 SDK 事件回報）

## Capabilities

### New Capabilities
- `mcp-integration`: MCP (Model Context Protocol) 伺服器管理 — `.mcp.json` 設定檔解析、stdio/HTTP 傳輸層、工具轉接為 Copilot SDK Tool、Settings UI、熱重載
- `cron-scheduler`: 定時任務排程 — cron 表達式/間隔/一次性排程、AI 對話任務與 Shell 命令執行、SQLite 儲存、管理 UI
- `sdk-auto-update`: Copilot SDK 版本管理 — npm registry 版本檢查、一鍵更新、後端 graceful restart、前端通知 banner

### Modified Capabilities
- `ask-user-question`: 新增 multiSelect 多選支援、改為 inline chat card UI、中斷恢復機制
- `websocket-protocol`: 新增 `copilot:query_state` / `copilot:state_response` 訊息類型，支援前端重連狀態恢復
- `background-streaming`: 前端斷線恢復 — 重連後自動 re-subscribe、pending user input 持久化與重發
- `usage-tracking`: Premium Request 即時查詢（非記憶）、僅 Copilot 訂閱者顯示、與 token 用量分離顯示
- `design-system`: 新增 ToggleSwitch 共用元件（綠色 track）、PlanActToggle 改用 outline 風格
- `app-layout`: 全面 RWD 修正 — 底部工具列 mobile 換行、CWD 截斷、各斷點適配
- `chat-ui`: 思考動畫升級為 Claude Code 風格（Unicode 脈動 + 隨機短語 + 計時）
- `model-capabilities`: Model 列表 TTL cache（5 分鐘）+ 定期刷新（30 分鐘）
- `system-prompts`: 預設模板匯入/匯出 JSON 功能

## Impact

**後端程式碼：**
- `backend/src/copilot/stream-manager.ts` — 核心修改（#14, #12, #13, #3, #8）
- `backend/src/ws/handlers/copilot.ts` — 新增 WS 訊息類型（#14, #12）
- `backend/src/index.ts` — 掛載新路由（#2/#4, #5, #8）
- 新模組：`backend/src/mcp/`（4 個檔案）、`backend/src/cron/`（3 個檔案）、`backend/src/copilot/sdk-update.ts`

**前端程式碼：**
- `frontend/src/components/copilot/ChatView.tsx` — UI 整合（#1, #10, #11）
- `frontend/src/hooks/useTabCopilot.ts` — 事件處理（#14, #12, #13）
- `frontend/src/components/settings/SettingsPanel.tsx` — 新增 MCP/Cron tab + 各項設定
- 新元件：`InlineUserInput.tsx`、`ThinkingIndicator.tsx`、`ToggleSwitch.tsx`、`SdkUpdateBanner.tsx`、`McpTab.tsx`、`CronTab.tsx`

**新依賴：**
- `croner`（cron 排程）
- `@modelcontextprotocol/sdk`（MCP client，可選）

**資料庫：**
- conversations 表新增 `last_quota_snapshot` JSON 欄位
- 新增 `cron_jobs` + `cron_history` 表

**API 變更：**
- 新增 6 組 REST endpoint（SDK version、MCP servers、Cron jobs）
- 新增 2 個 WebSocket 訊息類型（query_state、state_response）
