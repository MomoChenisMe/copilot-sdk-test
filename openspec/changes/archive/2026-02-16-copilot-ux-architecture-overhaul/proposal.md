## Why

目前的 AI Terminal 在以下幾個方面落後於 Claude Code / Warp / OpenClaw 等同類工具的使用體驗：

1. **操作效率低**：沒有 slash command 快速呼叫技能，必須手動切換到設定面板啟用技能
2. **Tab 模型不直覺**：兩處重複的 "+" 按鈕造成混淆；Tab 與對話 1:1 綁定無法靈活切換對話；左側抽屜的對話恢復方式笨重
3. **缺乏附檔能力**：無法在對話中傳送截圖或文件，限制了 AI 協助的場景
4. **Copilot SDK 無法自我進化**：使用者必須手動到設定面板修改 Profile/Agent/Skills，SDK 無法根據對話上下文自動調整自身行為
5. **缺少專案目錄感知**：無法像 Warp 一樣快速切換工作目錄，每次都需要靠 SDK 自行偵測

**目標使用者**：在手機瀏覽器上使用 AI Terminal 進行開發的個人開發者。

**使用情境**：透過手機瀏覽器遠端操控 VPS 上的 AI 開發工具，需要高效的互動體驗和豐富的 context 支援（附檔、目錄切換、技能快捷呼叫）。

## Non-Goals（非目標）

- 不重新設計整體 UI 視覺風格或 design system
- 不支援多使用者協作或權限管理
- 不實作即時檔案系統瀏覽器或檔案管理功能
- 不實作 voice input 或其他非文字輸入方式
- 不改變 WebSocket 通訊協定的底層架構
- SDK 自控功能不暴露 SYSTEM_PROMPT.md（核心系統指令只能透過 SettingsPanel 修改）

## What Changes

### 新功能
- **Slash Command 選單**：聊天輸入 "/" 時彈出可過濾的命令選單，包含內建命令（`/clear`、`/settings`、`/new`）和已啟用的技能
- **技能快捷呼叫**：每個啟用的技能自動註冊為 slash command，選取後插入 `/skill-name ` 到輸入框
- **附檔功能**：輸入框新增 📎 按鈕和剪貼簿貼上支援，支援圖片（PNG/JPG/GIF/WebP）和文件（PDF/TXT/MD/CSV/JSON），最大 10MB
- **SDK 自控設定（Tool-based）**：Copilot SDK 可透過內建工具（`update_profile`、`update_agent_rules`、`create_skill` 等）修改自身設定，下一輪對話自動生效（per-turn prompt reassembly，類似 OpenClaw）
- **工作目錄選擇器**：模型選擇器旁新增 CwdSelector，顯示當前路徑，點擊可編輯切換專案目錄（類似 Warp）

### 重構
- **統一 Tab "+" 按鈕**：移除 Header 的 "+"，只保留 Tab Bar 的 "+"
- **Tab = Copilot 實例**：Tab ID 與 Conversation ID 解耦；Tab 標題點擊開啟 Conversation Popover 切換對話；Sidebar 簡化為對話管理器

## Capabilities

### New Capabilities
- `slash-commands`: 聊天輸入框的 slash command 選單系統，包含內建命令和技能快捷呼叫
- `file-attachments`: 聊天訊息的附檔功能，涵蓋前端 UI（上傳、預覽、貼上、拖放）和後端上傳 API
- `sdk-self-control`: Copilot SDK 透過 Tool-based 機制自我控制 Profile、Agent Rules、Skills 設定

### Modified Capabilities
- `app-layout`: 統一 Tab "+" 按鈕；Tab 模型重構為獨立實例，支援 Conversation Popover 切換對話
- `chat-ui`: 新增 CwdSelector、附件預覽區、slash command 浮動選單
- `conversation-management`: 新增 Conversation Popover 對話選擇器；PATCH API 支援更新 `cwd` 欄位；Sidebar 簡化為管理器
- `skills-management`: 前端快取 skills 列表供 slash command 使用；技能作為 slash command 可呼叫

## Impact

### Frontend
- **核心元件修改**：`Input.tsx`（slash command + 附檔 + 貼上）、`ChatView.tsx`（CwdSelector + 命令列表 + 附件）、`AppShell.tsx`（Tab 重構 + cwd + upload flow）、`TabBar.tsx`（Popover 整合）、`Sidebar.tsx`（簡化）、`TopBar.tsx`（移除 "+"）
- **新增元件**：`SlashCommandMenu.tsx`、`AttachmentPreview.tsx`、`CwdSelector.tsx`、`ConversationPopover.tsx`
- **Store 變更**：`store/index.ts` — TabState 解耦、skills 快取、switchTabConversation action
- **新增 Hooks**：`useSkills.ts`（skills 快取）
- **新增 API Client**：`upload-api.ts`

### Backend
- **新增模組**：`upload/routes.ts`（multer 上傳）、`copilot/self-control-tools.ts`（SDK 自控工具）
- **修改模組**：`session-manager.ts`（tools 參數傳遞）、`stream-manager.ts`（self-control tools + files 支援）、`conversation/routes.ts`（cwd 更新）、`conversation/repository.ts`（cwd 欄位）、`ws/handlers/copilot.ts`（files 欄位）、`index.ts`（upload routes + self-control tools 注入）

### Dependencies
- 新增 `multer` npm 套件（後端 multipart 上傳處理）

### i18n
- 兩個 locale 檔案（en.json / zh-TW.json）需新增 `slashCommand.*`、`cwd.*`、`input.attach*` 等鍵值
