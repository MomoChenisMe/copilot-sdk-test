## Why

Copilot Chat 目前存在多項影響使用體驗的問題：IME 輸入法誤觸發送、Markdown 標題不渲染、空對話堆積無法刪除、slash command 在文字後失效等。同時缺乏 Web Search、自動記憶、Usage 追蹤等進階功能，限制了作為個人 AI 開發工具的實用性。

目標使用者為透過手機瀏覽器操控 Linux VPS 的個人開發者，使用情境涵蓋日常 AI 對話、Shell 操作、程式碼撰寫，需要流暢的輸入體驗、豐富的對話功能、以及跨 session 的記憶延續。

## Non-Goals（非目標）

- 多人協作功能（本專案為單人使用）
- 桌面版 Electron 打包
- 自建 LLM 推論服務（依賴 Copilot SDK）
- 完整終端模擬器替換（保持現有 xterm.js PTY 架構）
- 跨裝置同步（單一 VPS 部署）

## What Changes

### Bug 修復
- **IME 組字處理**：修復中文輸入法組字中按 Enter 誤發送訊息
- **Markdown 渲染**：安裝 `@tailwindcss/typography`，修復 H1-H4 標題無樣式問題
- **Slash command 偵測**：改為偵測游標前最近 `/`（前置空格或行首），支援文字後觸發
- **Lazy conversation**：新 tab 不再立即建立 API 對話記錄，改為首次發送時才建立
- **對話刪除**：對話列表加入 hover 刪除按鈕 + inline 確認
- **Tab 切換刷新**：修復切換 tab 後訊息不刷新（loading guard + race condition 防護）

### 新功能
- **Web Search**：整合 SDK 內建 web search + Brave Search API 自訂 tool，使用者可在設定中配置 API Key
- **自動記憶系統**：OpenClaw 風格完整版 — 檔案儲存（MEMORY.md + 每日日誌）、SQLite FTS5/向量索引、自動提取、context 滿前自動刷入、system prompt 注入
- **Usage 追蹤**：轉發 SDK `assistant.usage` / `session.usage_info` 事件，顯示 context window 使用率、token 計數、cost
- **全域快捷鍵**：Tab 管理、模式切換、設定、主題、上傳等全域 keyboard shortcuts + tooltip 提示
- **圖片 Lightbox**：全螢幕圖片預覽、縮放、多圖切換、下載
- **Bash Oh My Posh 風格**：彩色 Powerline 提示符（user@host + cwd + git branch）+ 行號 + 長輸出折疊
- **模型能力限制**：依據模型能力決定附件上傳功能是否可用

## Capabilities

### New Capabilities
- `web-search`: Web 搜尋整合 — SDK 內建 web search + Brave Search API 自訂 tool + Settings API Key 設定
- `auto-memory`: 自動記憶系統 — 檔案儲存、FTS5 索引、向量搜尋、自動提取、compaction flush、system prompt 注入、LLM tools
- `usage-tracking`: Usage 追蹤 — SDK 事件轉發、per-tab token/cost 追蹤、context window 使用率 UI
- `keyboard-shortcuts`: 全域快捷鍵 — document keydown hook、快捷鍵對照表、tooltip hints
- `image-lightbox`: 圖片 Lightbox — 全螢幕預覽、縮放、多圖切換、下載、鍵盤導航
- `bash-prompt-styling`: Bash 提示符美化 — Powerline 分段提示符、行號、長輸出折疊、環境資訊
- `model-capabilities`: 模型能力偵測 — prefix-match 能力表、附件功能 gating

### Modified Capabilities
- `conversation-management`: 新增 lazy creation（draft tab）+ 對話刪除功能
- `chat-ui`: 修復 Markdown H1-H4 渲染、tab 切換訊息刷新
- `slash-commands`: 支援文字後 mid-text slash command 觸發 + IME composition 防護
- `file-attachments`: 依據模型能力 gate 上傳按鈕
- `bash-exec-mode`: `bash:done` 事件擴充環境資訊（user、hostname、gitBranch）

## Impact

### Frontend
- **新增元件**：ImageLightbox、BashPrompt、BashOutput、UsageBar、ShortcutHint、ShortcutsPanel
- **新增 Hooks**：useGlobalShortcuts
- **新增 Utilities**：model-capabilities.ts
- **修改核心元件**：Input.tsx（IME + slash）、Markdown.tsx（heading + lightbox）、MessageBlock.tsx（lightbox + bash）、ChatView.tsx（usage + loading）、AppShell.tsx（lazy + delete + shortcuts）、SettingsPanel.tsx（memory + web search config）
- **新增依賴**：`@tailwindcss/typography`
- **Store 變更**：TabState 擴充 UsageInfo、conversationId nullable、新增 actions

### Backend
- **新增模組**：`memory/`（memory-store、memory-index、memory-extractor、compaction-monitor、memory-routes、memory-config）
- **新增 Tool**：`copilot/tools/web-search.ts`（Brave Search）
- **修改模組**：event-relay.ts（usage/compaction 事件）、stream-manager.ts（memory extraction trigger）、composer.ts（memory injection）、bash-exec.ts（env info）、session-manager.ts（web search tool）
- **新增依賴**：`sqlite-vec`（optional）
- **新增 API Routes**：`/api/memory/*`（6+ endpoints）

### WebSocket Protocol
- 新增事件：`copilot:usage`、`copilot:context_window`、`copilot:compaction_start`、`copilot:compaction_complete`、`copilot:memory_extracted`
- 擴充事件：`bash:done`（新增 user、hostname、gitBranch 欄位）
