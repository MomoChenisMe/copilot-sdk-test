## Why

目前 AI Terminal 僅支援單一對話視圖，使用者必須在 Sidebar 反覆切換才能管理多個 AI Agent 對話。這在實際使用中造成效率瓶頸：無法同時讓多個 Agent 並行工作。此外，串流事件在對話切換時存在洩漏 Bug（舊對話的串流內容會出現在新對話中），模型選擇不記憶、以及缺乏內建系統技能等問題，都影響了日常使用體驗。本次改進旨在將 AI Terminal 從「單對話工具」升級為「多 Agent 並行工作站」。

**目標使用者**：個人開發者（本專案的唯一使用者），透過手機瀏覽器遠端操控多個 AI Agent 同時處理不同任務。

**使用情境**：
- 在 Tab A 讓 Agent 實作功能，同時在 Tab B 讓另一個 Agent 寫測試
- 快速切換不同專案的對話而不打斷正在執行的 Agent
- 使用內建技能（如 conventional-commit、tdd-workflow）無需手動建立

## What Changes

### 批次 1：Bug 修復 — 串流事件洩漏
- 後端 `StreamManager.processEvent()` 注入 `conversationId` 到所有廣播事件
- 前端 `useCopilot` hook 根據 `conversationId` 過濾事件，僅處理當前對話的事件

### 批次 2：模型選擇記憶
- Zustand Store 新增 `lastSelectedModel` 狀態，持久化到 localStorage
- 新對話自動使用上次選擇的模型而非列表第一個

### 批次 3：內建系統技能
- 新增 `BuiltinSkillStore` 從原始碼目錄讀取 8 個預載技能
- 內建技能為唯讀（不可編輯/刪除）但可停用
- API 回應增加 `builtin` 欄位，前端 SkillsTab 分「系統」和「使用者」兩區
- 寫入/刪除 API 拒絕操作內建技能（403）

### 批次 4：Tab 頁籤多對話 UI
- Store 重構為 per-tab 狀態管理（`TabState` + `tabs` + `activeTabId`）
- 新 `useTabCopilot` hook 按 `conversationId` 路由 WebSocket 事件到對應 Tab
- TabBar 完全重寫為對話頁籤（標題、串流指示器、關閉按鈕、「+」建立）
- AppShell 重構為 Tab 管理中心（懶載入訊息、訂閱管理）
- Sidebar 精簡為歷史對話瀏覽器
- Terminal 功能本次不處理

## Non-Goals（非目標）

- Terminal 終端機整合到 Tab 系統（後續再做）
- Tab 分割視圖（同時顯示多個對話畫面）
- 內建技能的自動更新機制
- 多人協作或帳號系統
- Tab 拖拽到新視窗

## Capabilities

### New Capabilities
- `tab-multi-chat`: Tab 頁籤式多對話並行 UI 系統，包含 TabState 狀態管理、事件路由、TabBar 元件、懶載入、Tab 持久化
- `builtin-skills`: 內建系統技能架構，包含 BuiltinSkillStore、唯讀保護、API 區分、前端分區 UI

### Modified Capabilities
- `background-streaming`: 廣播事件現在必須包含 `conversationId`，前端根據 `conversationId` 過濾事件（修復串流洩漏 Bug）
- `skills-management`: 技能系統新增 builtin/user 區分，API 增加 `builtin` 欄位，路由增加寫入保護
- `app-layout`: 新增 `lastSelectedModel` 持久化、TopBar/Sidebar 配合 Tab 系統調整
- `chat-ui`: ChatView 改為從 Tab 特定狀態讀取，Props 新增 `tabId`

## Impact

### 後端
- `backend/src/copilot/stream-manager.ts` — 事件注入 conversationId
- `backend/src/skills/builtin-store.ts` — 新建 BuiltinSkillStore
- `backend/src/skills/builtin/` — 8 個內建技能目錄
- `backend/src/skills/routes.ts` — 支援 builtin + user 合併、寫入保護
- `backend/src/index.ts` — 初始化接線
- 對應測試檔案

### 前端
- `frontend/src/store/index.ts` — 重大重構（TabState、per-tab actions、lastSelectedModel）
- `frontend/src/hooks/useTabCopilot.ts` — 新建，取代 useCopilot
- `frontend/src/components/layout/TabBar.tsx` — 完全重寫
- `frontend/src/components/layout/AppShell.tsx` — 重大重構
- `frontend/src/components/copilot/ChatView.tsx` — 適配 Tab 狀態
- `frontend/src/components/layout/Sidebar.tsx` — 精簡為歷史瀏覽器
- `frontend/src/components/settings/SettingsPanel.tsx` — SkillsTab 分區
- `frontend/src/lib/prompts-api.ts` — SkillItem 新增 builtin 欄位
- `frontend/src/locales/en.json` + `zh-TW.json` — i18n 新增
- 對應測試檔案

### API 變更
- `GET /api/skills` — 回應新增 `builtin: boolean` 欄位
- `PUT /api/skills/:name` — 內建技能回傳 403
- `DELETE /api/skills/:name` — 內建技能回傳 403
- WebSocket 事件 — 所有 copilot:* 事件的 data 新增 `conversationId` 欄位

### Build
- 需確保 `backend/src/skills/builtin/*.md` 在編譯時複製到 dist/
