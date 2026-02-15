## Why

AI Terminal 目前缺少幾個核心能力，嚴重限制了實際使用體驗：

1. **工具輸出可讀性差** — Bash 執行結果的 `<pre>` 區塊是裸文字，沒有視覺結構，難以區分命令狀態和結果內容
2. **中文字體不一致** — 系統使用預設 system fonts，中文繁體字元渲染品質不穩定
3. **無法自訂 AI 行為** — 沒有系統提示詞或記憶機制，每次對話 AI 都從零開始，無法累積偏好和知識
4. **手機背景斷線** — WebSocket heartbeat timeout 設定過短，手機鎖屏或切 App 後頻繁斷線重連
5. **離開聊天室 Agent 中斷** — Copilot handler 是全域單例，WS 斷線後累積的回應遺失，使用者必須盯著螢幕等 Agent 完成

**目標使用者**：在手機上透過瀏覽器遠端操控 VPS 的個人開發者。

**使用情境**：使用者在手機上發送指令給 AI Agent，可能隨時切換 App、鎖屏或切換對話，期望回來後看到完整結果；並希望 AI 能記住個人偏好和專案慣例。

## What Changes

### UI 改善
- **ToolResultBlock 卡片化重設計** — 將裸 `<pre>` 改為帶 header（status icon + 工具名稱 + 複製按鈕）的卡片元件
- **全系統字體切換至 Noto Sans TC** — 加入 Google Fonts 引用，更新 CSS 和 Tailwind 配置

### 核心功能新增
- **系統提示詞系統** — 檔案式管理 PROFILE.md、AGENT.md、presets/、.ai-terminal.md，自動組合後透過 SDK `systemMessage` API 注入
- **跨對話記憶** — memory/preferences.md（自動帶入）+ memory/projects/ + memory/solutions/（按需讀取），REST API 管理
- **前端設定面板** — Slide-over panel 編輯提示詞和記憶檔案，情境模式切換

### 架構重構
- **StreamManager 背景串流管理** — 將 copilot handler 從全域單例重構為 per-conversation stream，支援多對話平行串流（可配置上限）
- **串流與 WS 解耦** — 事件累積和 DB 持久化不依賴 WS 連線，支援 subscribe/unsubscribe catch-up 機制
- **copilot:abort 加入 conversationId** — **BREAKING**：abort 指令改為指定對話，支援多串流並存

### Bug 修復
- **WebSocket heartbeat timeout** — 後端 timeout 60s→180s，所有訊息重置 heartbeat，前端加 Page Visibility API 即時重連

## Capabilities

### New Capabilities
- `tool-result-ui`: ToolResultBlock 卡片化重設計，包含 header（status icon、工具名稱、複製按鈕）和 body 的視覺結構
- `system-prompts`: 檔案式系統提示詞管理（PROFILE.md、AGENT.md、presets/、.ai-terminal.md），自動組合並注入 SDK session
- `cross-conversation-memory`: 跨對話記憶機制（preferences.md 自動帶入、projects/ 和 solutions/ 按需讀取），REST API 管理
- `background-streaming`: StreamManager 架構，per-conversation 串流狀態管理、subscribe/unsubscribe 機制、catch-up 重播、並行上限控制

### Modified Capabilities
- `chat-ui`: ToolResultBlock 樣式變更、串流指示器新增、設定面板入口
- `copilot-agent`: handler 從閉包狀態改為委派 StreamManager，新增 subscribe/unsubscribe/status 訊息類型
- `websocket-protocol`: 新增 5 個訊息類型（subscribe/unsubscribe/status/stream-status/active-streams），abort 加 conversationId（**BREAKING**），heartbeat timeout 變更
- `design-system`: 全系統字體改為 Noto Sans TC

## Non-Goals

- **多人協作** — 仍為單人使用，不處理多用戶併發
- **訊息編輯/重新生成** — 不在此變更範圍
- **語音輸入/輸出** — 不處理
- **自動 memory 更新** — Phase 1 不實作 AI 主動更新記憶，僅提供手動 REST API
- **Rich Markdown Editor** — 設定面板使用基本 textarea，不引入第三方 Markdown 編輯器
- **模型切換帶上下文** — 雖在產品規格中提及，但不在此變更範圍
- **工作目錄切換** — 不在此變更範圍

## Impact

### Backend
- `backend/src/copilot/stream-manager.ts` — 全新模組，核心架構變更
- `backend/src/ws/handlers/copilot.ts` — 完全重構
- `backend/src/ws/server.ts` — disconnect 通知 + heartbeat 調整
- `backend/src/ws/router.ts` + `types.ts` — WsHandler 介面擴展
- `backend/src/copilot/session-manager.ts` — systemMessage 整合
- `backend/src/prompts/` — 全新模組（file-store、composer、routes）
- `backend/src/config.ts` + `index.ts` — 新模組注冊

### Frontend
- `frontend/src/components/copilot/ToolResultBlock.tsx` — 元件重構
- `frontend/src/hooks/useCopilot.ts` — subscribe/unsubscribe 邏輯
- `frontend/src/store/index.ts` — activeStreams + presets state
- `frontend/src/lib/ws-client.ts` — Page Visibility API
- `frontend/src/components/settings/SettingsPanel.tsx` — 全新元件
- `frontend/index.html` + `globals.css` — 字體配置

### Dependencies
- Google Fonts CDN（Noto Sans TC）— 外部依賴
- 無新 npm 套件需求

### Breaking Changes
- `copilot:abort` WS 訊息現在需要 `conversationId` 欄位
