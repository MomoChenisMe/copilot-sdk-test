## 1. 專案骨架

- [x] 1.1 初始化 npm workspaces monorepo（root package.json + backend/package.json + frontend/package.json）
- [x] 1.2 設定 TypeScript（tsconfig.base.json + backend/tsconfig.json + frontend/tsconfig.json）
- [x] 1.3 設定 Vitest（backend/vitest.config.ts）
- [x] 1.4 設定 Vite + React（frontend/vite.config.ts + index.html + main.tsx）
- [x] 1.5 設定 Tailwind CSS 4（frontend/src/styles/globals.css）
- [x] 1.6 設定 ESLint + Prettier
- [x] 1.7 建立 .env.example（PORT, WEB_PASSWORD, SESSION_SECRET, DEFAULT_CWD, DB_PATH, NODE_ENV）
- [x] 1.8 撰寫 config.ts 測試（zod 驗證環境變數：必填欄位、預設值、型別檢查）
- [x] 1.9 實作 config.ts（使用 zod 驗證並匯出 config 物件）
- [x] 1.10 撰寫 logger.ts 測試
- [x] 1.11 實作 logger.ts（pino 結構化日誌）
- [x] 1.12 驗證：`npm test` 通過、`npm run build` 無錯誤

## 2. Web 認證

- [x] 2.1 撰寫 session store 測試（建立 session token、驗證 token、失效 token、清除過期 session）
- [x] 2.2 實作 session.ts（in-memory session store）
- [x] 2.3 撰寫 auth middleware 測試（有效 cookie 通過、無效 cookie 返回 401、缺少 cookie 返回 401）
- [x] 2.4 實作 auth middleware
- [x] 2.5 撰寫 auth routes 測試（POST /api/auth/login 成功/失敗、DELETE /api/auth/logout、GET /api/auth/status）
- [x] 2.6 實作 auth routes
- [x] 2.7 實作前端 LoginPage 元件
- [x] 2.8 實作 useAuth hook（login/logout/checkStatus）
- [x] 2.9 驗證：`npm test` 通過、手動測試登入/登出流程

## 3. WebSocket 基礎設施

- [x] 3.1 撰寫 WS server 測試（upgrade 成功/失敗、auth cookie 驗證、連線管理）
- [x] 3.2 實作 ws/server.ts（WebSocket server + auth 驗證）
- [x] 3.3 撰寫 WS router 測試（copilot: 前綴分派、terminal: 前綴分派、未知類型錯誤回應）
- [x] 3.4 實作 ws/router.ts
- [x] 3.5 撰寫心跳機制測試（ping→pong、超時斷線）
- [x] 3.6 實作心跳機制
- [x] 3.7 實作前端 ws-client.ts（WebSocket 客戶端類別）
- [x] 3.8 實作 useWebSocket hook（連線、自動重連指數退避、心跳）
- [x] 3.9 實作 ConnectionBadge 元件（綠/黃/紅 狀態指示）
- [x] 3.10 驗證：`npm test` 通過、前後端 WebSocket 連線成功

## 4. SQLite + 對話管理

- [x] 4.1 撰寫 db.ts 測試（初始化、migration 建表、重複執行冪等）
- [x] 4.2 實作 db.ts（better-sqlite3 初始化 + migration runner）
- [x] 4.3 撰寫 conversation repository 測試（create、getById、list、update、delete、pin、search FTS5）
- [x] 4.4 實作 conversation repository
- [x] 4.5 撰寫 conversation REST routes 測試（POST/GET/PATCH/DELETE /api/conversations、GET search）
- [x] 4.6 實作 conversation routes
- [x] 4.7 實作前端 api.ts（REST client fetch wrapper）
- [x] 4.8 實作 useConversations hook（CRUD + search）
- [x] 4.9 實作 Zustand store 基礎結構（conversations、activeConversationId、messages）
- [x] 4.10 實作 Sidebar 元件（對話列表、新增/切換/搜尋/釘選/刪除）
- [x] 4.11 驗證：`npm test` 通過、Sidebar 對話管理功能正常

## 5. Terminal（PTY）

- [x] 5.1 撰寫 pty-manager 測試（spawn、data relay、resize、exit/respawn、環境變數 TERM=xterm-256color）
- [x] 5.2 實作 pty-manager.ts（node-pty spawn/resize/data relay/exit respawn）
- [x] 5.3 撰寫 terminal WS handler 測試（terminal:input 轉發、terminal:resize 處理、terminal:spawn 請求）
- [x] 5.4 實作 ws/handlers/terminal.ts
- [x] 5.5 實作前端 TerminalView 元件（xterm.js + @xterm/addon-fit 初始化、深色主題）
- [x] 5.6 實作 useTerminal hook（WebSocket 資料雙向傳輸、auto-resize、exit 處理）
- [x] 5.7 驗證：`npm test` 通過、手動測試 Terminal 輸入/輸出/resize

## 6. Copilot SDK 整合

- [x] 6.1 撰寫 client-manager 測試（getClient 首次建立/後續取得、stop、listModels）— mock CopilotClient
- [x] 6.2 實作 copilot/client-manager.ts
- [x] 6.3 撰寫 permission handler 測試（自動批准所有操作）
- [x] 6.4 實作 copilot/permission.ts
- [x] 6.5 撰寫 session-manager 測試（createSession、resumeSession、sendMessage、abortMessage、事件掛載）— mock SDK
- [x] 6.6 實作 copilot/session-manager.ts
- [x] 6.7 撰寫 event-relay 測試（每種 SDK 事件 → 對應 WS 訊息格式）
- [x] 6.8 實作 copilot/event-relay.ts
- [x] 6.9 撰寫 copilot WS handler 測試（copilot:send 路由、copilot:abort 路由）
- [x] 6.10 實作 ws/handlers/copilot.ts
- [x] 6.11 撰寫 models REST route 測試（GET /api/copilot/models）
- [x] 6.12 實作 models route
- [x] 6.13 驗證：`npm test` 通過、整合測試：發送訊息→收到串流事件→idle

## 7. 前端 Chat UI

- [x] 7.1 實作 useCopilot hook（連接 WS 事件到 Zustand store：delta、message、tool_start、tool_end、reasoning、idle、error）
- [x] 7.2 實作 ChatView 元件（block 式訊息列表 + 自動捲動）
- [x] 7.3 實作 MessageBlock 元件（user/assistant 變體）
- [x] 7.4 實作 StreamingText 元件（即時文字 + 閃爍游標）
- [x] 7.5 實作 Markdown 元件（react-markdown + rehype-highlight + remark-gfm）
- [x] 7.6 實作 ToolRecord 元件（可展開卡片：工具名稱、spinner/✓/✗、args + result）
- [x] 7.7 實作 ReasoningBlock 元件（可折疊推理過程）
- [x] 7.8 實作 ModelSelector 元件（模型切換下拉選單）
- [x] 7.9 實作 Input 元件（自動增長 textarea、發送/中止按鈕、Enter 發送）
- [x] 7.10 驗證：手動測試完整 Chat 流程（發送→串流→工具呼叫→完成→Markdown 渲染）

## 8. 佈局 + 收尾

- [x] 8.1 實作 AppShell 佈局元件（mobile-first flexbox：TopBar + 主內容 + BottomBar）
- [x] 8.2 實作 TopBar 元件（漢堡選單、對話標題、工作目錄顯示、ConnectionBadge）
- [x] 8.3 實作 BottomBar 元件（Copilot/Terminal tab 切換 + 輸入區）
- [x] 8.4 實作 Sidebar 滑入/滑出動畫（CSS transform + 點擊外部關閉）
- [x] 8.5 實作工作目錄切換功能（TopBar 點擊 → cwd:change WS 訊息 → 更新 copilot + terminal）
- [x] 8.6 實作深色主題 CSS variables（Warp 風格配色）
- [x] 8.7 實作 App.tsx 整合（auth gate → LoginPage 或 AppShell）
- [x] 8.8 實作 graceful-shutdown.ts（SIGTERM/SIGINT 處理：停止 CopilotClient、關閉 PTY、關閉 DB）
- [x] 8.9 實作 index.ts 入口（Express app + WS server + 靜態檔案伺服 + 啟動日誌）
- [x] 8.10 驗證：`npm test` 全部通過、`npm run build` 無錯誤、手動 E2E 測試

## 9. 部署配置

- [x] 9.1 撰寫 Nginx 設定檔（SSL 終止、HTTP→HTTPS 重導、反向代理 HTTP + WebSocket）
- [x] 9.2 撰寫 systemd service 設定檔（ExecStart、Restart=on-failure、環境變數檔案）
- [x] 9.3 撰寫部署腳本（rsync 上傳、npm install --production、npm run build、systemctl restart）
- [x] 9.4 撰寫 Let's Encrypt SSL 設定步驟
- [x] 9.5 VPS 上 E2E 煙霧測試（登入 → 開對話 → AI 串流回應 → 工具呼叫 → Terminal 操作）
