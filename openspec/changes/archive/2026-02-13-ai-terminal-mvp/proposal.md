## Why

目前想用手機進行開發工作時，缺乏順暢的方式操作 AI 編程助手和終端。現有的 Copilot CLI 僅限桌面終端使用，無法透過手機瀏覽器存取。需要一個跑在 VPS 上的 Web 應用，讓開發者隨時隨地用手機瀏覽器即可使用 Copilot Agent 寫程式、操作 Shell。

**目標使用者：** 個人開發者（單人使用）
**使用情境：** 透過手機瀏覽器連線到自己的 Linux VPS，進行 AI 輔助開發和終端操作

## What Changes

- 新增 Web 後端：Express 5 HTTP server + WebSocket server，整合 Copilot SDK 和 node-pty
- 新增 React SPA 前端：手機優先、深色主題、block 式 AI 對話 + xterm.js 終端
- 新增 Web 認證機制：密碼登入頁 + HttpOnly session cookie
- 新增 Copilot SDK 整合：串流對話、工具呼叫（讀寫檔案、執行指令、搜尋、Git）、模型切換、無限對話
- 新增 PTY 終端：真實 Shell 存取，支援互動式程式（vim、htop 等）
- 新增對話管理：SQLite 儲存、多對話支援、搜尋、釘選
- 新增 WebSocket 即時通訊協議：AI 串流事件 + Terminal 雙向資料傳輸
- 新增部署配置：systemd service + Nginx 反向代理 + Let's Encrypt SSL

## Non-Goals（非目標）

- **不做多人支援**：僅個人使用，不需要帳號系統或權限管理
- **不做自訂提示詞系統**：MVP 不含 PROFILE.md、AGENT.md 等提示詞管理功能
- **不做情境模式（Presets）**：MVP 不含 Code Review、DevOps 等預設模式切換
- **不做跨對話記憶**：MVP 不含 memory/ 目錄的長期記憶機制
- **不做模型切換時的上下文壓縮**：MVP 依賴 SDK 原生的 infinite sessions 管理
- **不做 Copilot Extensions**：不建立 GitHub Copilot Extension，僅直接使用 SDK

## Capabilities

### New Capabilities

- `web-auth`: Web 應用認證——密碼登入頁、session cookie 管理、auth middleware
- `copilot-agent`: Copilot SDK 整合——CopilotClient 管理、session 生命週期、串流事件轉譯、工具呼叫、模型切換、權限自動批准
- `terminal-pty`: PTY 終端——node-pty spawn/resize/data relay、互動式程式支援、exit respawn
- `conversation-management`: 對話管理——SQLite 儲存、CRUD、全文搜尋、釘選、REST API
- `websocket-protocol`: WebSocket 通訊協議——server 建立、auth 驗證、訊息路由、copilot/terminal handler、心跳機制
- `chat-ui`: 前端 Chat 介面——block 式訊息列表、串流文字、Markdown 渲染、工具記錄、推理過程、模型選擇器、輸入元件
- `terminal-ui`: 前端 Terminal 介面——xterm.js 容器、auto-resize、資料雙向傳輸
- `app-layout`: 應用佈局——AppShell、TopBar、Sidebar、BottomBar、深色主題、手機優先
- `deployment`: 部署配置——systemd service、Nginx 反向代理、Let's Encrypt SSL、部署腳本

### Modified Capabilities

（無——綠地專案，無既有 spec）

## Impact

- **新增依賴（Backend）：** @github/copilot-sdk, express, ws, node-pty, better-sqlite3, bcrypt, zod, pino, cookie, uuid
- **新增依賴（Frontend）：** react, react-dom, @xterm/xterm, @xterm/addon-fit, zustand, react-markdown, rehype-highlight, remark-gfm, lucide-react, tailwindcss
- **基礎設施：** 需要 Linux VPS、域名、SSL 憑證、GitHub Copilot 訂閱
- **專案結構：** 從零建立 npm workspaces monorepo（backend/ + frontend/）
