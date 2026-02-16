## Why

目前 AI Terminal 的聊天介面在多個面向尚未完善：圖片上傳後無法在對話中顯示、slash commands 僅支援少量內建命令、側邊欄佔用寶貴的手機畫面空間、對話命名需手動操作、且缺乏直接執行 shell 命令的快速模式。這些問題導致使用者需要在多個介面間切換、操作效率低落。本次變更整合 9 項 UX 改進，全面提升聊天介面的完整度與操作流暢度。

**目標使用者與使用情境**：個人開發者透過手機瀏覽器遠端操控 AI Terminal，需要高效地在 AI 對話與 shell 命令間切換，同時能直觀地分享圖片給 Agent 分析、快速選用 SDK 提供的 slash commands。

## What Changes

1. **圖片顯示於聊天氣泡** — 上傳的圖片在 user message 中顯示為可點擊的縮圖，附件 metadata 同步儲存至資料庫以支援歷史重載
2. **圖片傳送至 SDK 驗證** — 確保 file attachment 完整送達 Copilot SDK，修正可能的格式不匹配問題
3. **移除側邊欄與漢堡選單** — 完全移除 Sidebar 元件，ConversationPopover（TabBar 下拉）成為唯一的對話切換入口；語言切換與登出按鈕搬至 SettingsPanel
4. **SDK 動態 slash commands** — 從 Copilot SDK 動態載入可用的 slash commands，新增 `sdk` 類型與獨立區段顯示
5. **Tab 鍵選取 slash command** — 在 slash command menu 中新增 Tab 鍵支援，與 Enter 行為一致
6. **命令顏色區分** — user message 中的 `/command` 前綴以 accent 色 badge 渲染，與一般文字視覺區隔
7. **可收合技能描述** — 送出的命令若匹配 skill，顯示可收合的技能描述區塊（預設收合）
8. **Bash 直接執行模式** — CwdSelector 新增 AI/Bash 模式切換，Bash 模式下輸入的命令透過 `child_process.spawn` 直接在伺服器執行，結果即時串流回前端
9. **對話自動命名** — 第一條訊息發送後自動截取前 50 字元作為對話標題

## Non-Goals (非目標)

- 不實作完整的 xterm.js 終端機於聊天視窗中（Bash 模式僅提供簡化的命令執行 + 文字輸出）
- 不實作圖片編輯或裁切功能
- 不實作 AI 自動生成對話標題（僅截取第一條訊息文字）
- 不修改既有的 Terminal PTY 功能（TabBar 的終端分頁維持不變）
- 不新增新的語言支援（維持 en + zh-TW 雙語）

## Capabilities

### New Capabilities
- `chat-image-display`: 聊天氣泡中顯示圖片附件縮圖，包含 metadata 持久化與歷史重載
- `sdk-dynamic-commands`: 從 Copilot SDK 動態載入 slash commands，前後端完整管線
- `bash-exec-mode`: CWD 選擇器整合 AI/Bash 模式切換，Bash 模式直接執行 shell 命令並串流輸出
- `conversation-auto-title`: 對話自動命名，以第一條使用者訊息內容作為標題

### Modified Capabilities
- `app-layout`: 移除 Sidebar 與漢堡選單按鈕，語言切換與登出搬至 SettingsPanel 的新 General tab
- `slash-commands`: 新增 Tab 鍵選取支援、新增 `sdk` 命令類型分類
- `chat-ui`: MessageBlock 中的 `/command` 前綴改為 accent 色 badge 渲染，送出的 skill 命令顯示可收合描述
- `file-attachments`: 驗證並修正 upload → SDK 的完整 file 傳送管線

## Impact

### Frontend
- `MessageBlock.tsx` — 圖片渲染、命令 badge、可收合技能描述（三項功能合流）
- `Input.tsx` — Tab 鍵選取 slash command
- `CwdSelector.tsx` — 新增模式切換 UI
- `ChatView.tsx` — 整合 SDK commands、Bash 模式切換邏輯
- `AppShell.tsx` — 移除 Sidebar、傳遞新 props 至 SettingsPanel
- `TopBar.tsx` — 移除漢堡按鈕
- `SettingsPanel.tsx` — 新增 General tab（語言、登出）
- `SlashCommandMenu.tsx` — 新增 SDK commands 區段
- `store/index.ts` — 新增 TabState.mode、sdkCommands
- `useTabCopilot.ts` — 附件 metadata、自動命名
- `api.ts` — AttachmentMeta 型別、SDK commands API
- 新建 `useBashMode.ts` — Bash 模式 hook

### Backend
- `session-manager.ts` — 驗證 SDK file 格式
- `copilot.ts` (WS handler) — 儲存 attachment metadata
- `upload/routes.ts` — 新增 GET 端點 serve 圖片
- `index.ts` — 註冊新 routes/handlers
- 新建 `bash-exec.ts` — WebSocket bash 執行 handler
- 可能新增 `GET /api/copilot/commands` — SDK commands 列表

### i18n
- `en.json` / `zh-TW.json` — 新增 settings.general.*、terminal.* 等翻譯鍵

### 無破壞性變更
- 所有改動為新增功能或 UI 重組，不影響既有 API contract 或資料格式
