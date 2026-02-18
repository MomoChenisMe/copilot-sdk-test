## Why

AI Terminal 目前缺少幾項讓開發體驗更完整的關鍵功能：(1) 無法在執行前先規劃——所有工具呼叫都自動批准，缺乏 plan/act 控制；(2) AI 無法向使用者提問——SDK 的 `ask_user` 能力未啟用，導致互動受限；(3) AI 產出的文件、程式碼無法即時預覽——缺少 Artifacts 側邊面板；(4) 長對話中捲動體驗差——沒有快速回到底部的方式；(5) 用量資料未持久化——切換對話後 usage 消失；(6) 只顯示 token 不顯示 premium request 配額——與 Copilot 實際計費方式脫節；(7) 目錄選擇器只是文字輸入框——需要像 Warp 一樣的可瀏覽式選擇器；(8) 設定頁面塞在右側 drawer 中——空間不足，需全頁面重新設計。

**目標使用者**：本應用的單一使用者（開發者本人），透過手機瀏覽器遠端操控 AI 開發工具。

**使用情境**：日常透過手機使用 AI Terminal 進行程式碼撰寫、除錯和伺服器管理。這些功能改善將使操作更安全（plan mode）、更互動（ask user）、更直覺（artifacts、scroll、directory picker）、更透明（usage tracking）。

## What Changes

- **Plan Mode**：新增 plan/act 模式切換，plan 模式下 AI 規劃但不執行工具。基於 SDK 的 `onPermissionRequest` handler 實現。
- **AskUserQuestion**：啟用 SDK 的 `onUserInputRequest` handler，透過 WebSocket 橋接到前端 Modal Dialog，支援選項式和自由輸入式回答。
- **Artifacts 側邊面板**：右側分割面板，可渲染 Markdown、程式碼（語法高亮）、HTML（sandboxed iframe）、SVG、Mermaid 圖表。
- **Scroll-to-Bottom 按鈕**：浮動按鈕，捲動離開底部時出現，帶未讀訊息計數 badge。
- **Usage 持久化**：將 token 用量寫入 assistant message 的 metadata JSON，歷史對話可恢復用量顯示。
- **Premium Request 配額追蹤**：轉發 SDK `assistant.usage` 事件中的 `quotaSnapshots`，顯示 premium request 已用/總額/重置日期。可展開式 UsageBar 同時顯示 token 和配額。
- **Warp 風格目錄選擇器**：取代現有文字輸入式 CWD 選擇器，改為可搜尋、可瀏覽的 popover，新增後端目錄列表 API。
- **全頁面設定重設計**：將現有 7-tab drawer 改為全頁面佈局（左側導航 + 右側內容區），新增 API Keys 分類。

## Non-Goals（非目標）

- 不實作多人協作或權限系統——本應用為單人使用
- 不實作 Artifacts 的編輯功能——僅預覽，不可在面板內直接修改
- 不實作 MCP Server 整合——不在本次範圍
- 不實作 Custom Agents / Sub-agents——不在本次範圍
- 不改變認證機制或 DB schema 結構——利用現有 metadata JSON 欄位
- 不實作設定頁面的搜尋/過濾功能——後續再考慮

## Capabilities

### New Capabilities

- `plan-mode`: Plan/Act 模式切換——後端 permission handler 動態控制 + 前端 toggle UI + WS 協議擴展
- `ask-user-question`: SDK ask_user 工具整合——後端 Promise bridge + 前端 Modal Dialog + WS request-response 協議
- `artifacts-panel`: Artifacts 側邊預覽面板——artifact 解析器 + 多格式渲染器（Markdown/Code/HTML/SVG/Mermaid）+ 分割佈局
- `scroll-to-bottom`: 聊天捲動到底部浮動按鈕——滾動偵測 + 未讀計數 + 動畫
- `directory-picker`: Warp 風格目錄選擇器——後端目錄列表 API + 前端可搜尋瀏覽器 popover
- `settings-full-page`: 全頁面設定重新設計——左側導航 + 右側內容區 + API Keys 分離

### Modified Capabilities

- `usage-tracking`: 新增 usage 持久化到 message metadata + 擴展 UsageBar 為可展開式 + 新增 premium request 配額顯示 + 轉發 `quotaSnapshots` 和 `session.shutdown` 事件
- `websocket-protocol`: 新增 WS 訊息類型——`copilot:set_mode`、`copilot:mode_changed`、`copilot:user_input_request`、`copilot:user_input_response`、`copilot:quota`、`copilot:shutdown`
- `app-layout`: 主內容區新增 Artifacts 分割面板支援

## Impact

### Backend
- `backend/src/copilot/permission.ts` — 新增 mode-aware permission handler factory
- `backend/src/copilot/session-manager.ts` — 支援 `onPermissionRequest` + `onUserInputRequest` 傳入
- `backend/src/copilot/stream-manager.ts` — 最大變動：plan mode 整合、user input Promise bridge、usage 累積、quota 追蹤
- `backend/src/copilot/event-relay.ts` — 擴展 `assistant.usage` 轉發 + 新增 `session.shutdown` 監聽
- `backend/src/ws/handlers/copilot.ts` — 新增 `copilot:set_mode` 和 `copilot:user_input_response` handler
- `backend/src/index.ts` — 掛載新的 `/api/directories` 路由
- 新增 `backend/src/directory/routes.ts` — 目錄列表 REST API

### Frontend
- `frontend/src/store/index.ts` — TabState 擴展（planMode、userInputRequest、artifacts、extended UsageInfo）
- `frontend/src/hooks/useTabCopilot.ts` — 新增 WS 事件監聽（user_input_request、quota、mode_changed）
- `frontend/src/components/copilot/ChatView.tsx` — 整合 scroll-to-bottom、plan mode banner、user input dialog、artifacts 觸發
- `frontend/src/components/copilot/UsageBar.tsx` — 完全重寫為可展開式
- `frontend/src/components/copilot/CwdSelector.tsx` — 整合 DirectoryPicker popover
- `frontend/src/components/settings/SettingsPanel.tsx` — 完全重寫為全頁面佈局
- `frontend/src/components/layout/AppShell.tsx` — 支援 Artifacts 分割面板 + usage 恢復
- 新增 7 個元件檔案 + 1 個工具模組

### Dependencies
- 新增 `mermaid` npm 套件（前端，Mermaid 圖表渲染用）

### i18n
- `frontend/src/locales/en.json` 和 `zh-TW.json` 新增所有 8 個功能的翻譯字串
