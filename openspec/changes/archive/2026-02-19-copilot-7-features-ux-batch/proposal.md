## Why

AI Terminal 目前在日常使用中累積了多項體驗痛點：(1) AI 無法自主規劃和追蹤多步驟任務的進度；(2) 使用者在 Terminal 執行的 bash 指令結果不會進入 AI 對話上下文，導致 AI 缺乏工作環境認知；(3) 多個 UI 元件存在硬編碼字串未套用 i18n；(4) `ask_user` 工具超時後無恢復機制，對話直接中斷；(5) 歡迎頁面無法快速存取歷史對話；(6) 模型選擇器在服務重啟後遺失記憶。這些問題需要一次性批次修復以提升整體 UX 品質。

**目標使用者**：透過手機瀏覽器使用 AI Terminal 的開發者（單人工具）。

**使用情境**：
- 使用者要求 AI 執行複雜的多步驟任務（如重構整個模組），需要任務進度追蹤
- 使用者先在 Terminal 執行 `git status` 等指令，再請 AI 基於結果繼續工作
- 使用者切換中英文介面時，部分 UI 仍顯示英文
- AI 問使用者問題但使用者未及時回應，導致整個對話卡住
- 使用者想快速回到之前的對話，卻必須先新增 tab 再切換

## What Changes

- **新增 Task 管理系統**：後端新增 `tasks` SQLite 表 + 4 個 SDK 自訂工具（task_create、task_list、task_get、task_update），前端新增 TaskPanel 即時顯示任務進度
- **Bash 對話融合**：bash 指令執行結果自動注入下次 copilot prompt 前綴，並儲存為對話訊息；前端支援 `!command` 快捷語法
- **i18n 審查修復**：修復 UserInputDialog、PlanActToggle、CwdSelector、ScrollToBottom 等元件的硬編碼字串，補齊缺失的 i18n key
- **Ask User 失敗處理**：超時前顯示 Skip 按鈕讓 AI 自行決定，超時後顯示提示訊息可 dismiss
- **歷史對話選擇器**：歡迎頁面顯示最近 10 筆對話，Tab bar 新增歷史下拉按鈕（重用 ConversationPopover）
- **模型選擇器持久化**：修復 Zustand store 初始化時未從 localStorage 讀取 lastSelectedModel 的問題

## Capabilities

### New Capabilities

- `task-management`: AI 可透過 SDK 自訂工具建立、列出、查詢、更新任務，任務持久化在 SQLite，前端即時顯示 TaskPanel
- `bash-conversation-fusion`: bash 指令結果自動注入 copilot 對話上下文，支援 `!command` 快捷語法
- `ask-user-recovery`: ask_user 工具超時/失敗時的 Skip 和 Dismiss 恢復機制
- `conversation-history-picker`: 歡迎頁面最近對話列表 + Tab bar 歷史下拉選單

### Modified Capabilities

- `i18n`: 修復多個元件硬編碼字串、補齊缺失的 i18n key（topBar.shortcuts、topBar.settings 等）
- `chat-ui`: 歡迎頁面新增最近對話區塊，UserInputDialog 新增 Skip/Timeout 狀態
- `bash-exec-mode`: bash handler 新增 onBashComplete callback 和輸出累積
- `websocket-protocol`: 新增 `copilot:user_input_timeout` 事件類型
- `copilot-agent`: 新增 task tools 註冊、session-conversation mapping、bash context 注入
- `app-layout`: Tab bar 新增歷史下拉按鈕

## Non-Goals（非目標）

- **Subagent 模式**：Copilot SDK 目前不支援原生 subagent API，不在此次範圍
- **Task 跨對話共享**：Task 僅限當前對話，不支援跨對話或全域任務看板
- **雙向 Bash 融合**：AI 不會主動執行 bash 指令，僅單向注入使用者的 bash 結果
- **多語言擴充**：僅修復現有 en/zh-TW 的缺漏，不新增其他語言
- **Ask User 自動重試**：SDK Promise reject 後無法 retry，僅提供 Skip 和 Dismiss

## Impact

**後端**：
- `backend/src/conversation/db.ts` — 新增 tasks 表 migration
- `backend/src/task/repository.ts` — 新增 TaskRepository
- `backend/src/copilot/tools/task-tools.ts` — 新增 4 個 SDK task tools
- `backend/src/copilot/stream-manager.ts` — sessionConversationMap + user_input_timeout 事件
- `backend/src/ws/handlers/copilot.ts` — bash context 注入、addBashContext 方法
- `backend/src/ws/handlers/bash-exec.ts` — onBashComplete callback、輸出累積
- `backend/src/index.ts` — task tools 註冊、bash-copilot 連結

**前端**：
- `frontend/src/components/copilot/TaskPanel.tsx` — 新增
- `frontend/src/components/copilot/UserInputDialog.tsx` — Skip/Timeout 狀態
- `frontend/src/components/copilot/ChatView.tsx` — 歡迎頁對話列表、TaskPanel 整合
- `frontend/src/components/layout/TabBar.tsx` — 歷史下拉按鈕
- `frontend/src/store/index.ts` — tasks state、UserInputRequest.timedOut、lastSelectedModel init
- `frontend/src/hooks/useTabCopilot.ts` — task event 解析、timeout handler
- `frontend/src/hooks/useModels.ts` — model 驗證
- `frontend/src/locales/en.json` + `zh-TW.json` — 新增/補齊 i18n key
- 4 個元件 i18n 修復：UserInputDialog、PlanActToggle、CwdSelector、ScrollToBottom

**WebSocket Protocol**：新增 `copilot:user_input_timeout` 事件

**Database**：新增 `tasks` 表（id, conversation_id, subject, description, active_form, status, owner, blocks, blocked_by, metadata, timestamps）
