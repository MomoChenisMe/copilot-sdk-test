## 1. 專案初始化

- [ ] 1.1 建立 `package.json`（type: module, engines: node >=24），安裝所有 dependencies 和 devDependencies
- [ ] 1.2 建立 `tsconfig.json`（ESM 配置、strict 模式、NodeNext module resolution）
- [ ] 1.3 建立 `.gitignore`（排除 node_modules、.env、dist、.DS_Store）
- [ ] 1.4 建立 `.env.example` 範本檔案，列出所有環境變數及說明

## 2. 設定與工具模組

- [ ] 2.1 實作 `src/config.ts` — 載入 dotenv、驗證必要環境變數（fail-fast）、匯出 typed config 物件
- [ ] 2.2 實作 `src/utils/logger.ts` — 建立 pino logger，日誌等級由 config 控制

## 3. Telegram Bot 骨架

- [ ] 3.1 實作 `src/bot/bot.ts` — 建立 grammY Bot 實例、安裝 parse-mode plugin（HTML 預設）、設定 bot.catch 錯誤處理
- [ ] 3.2 實作 `src/bot/middleware.ts` — 白名單認證 middleware（比對 user ID、忽略群組訊息、靜默拒絕未授權用戶）
- [ ] 3.3 實作 `src/bot/commands.ts` — 所有 Bot 指令處理器（/start, /help, /reset, /model, /cwd, /status, /cancel）

## 4. Copilot SDK 整合

- [ ] 4.1 實作 `src/copilot/client.ts` — CopilotClient 單例包裝（initCopilotClient、getCopilotClient、stopCopilotClient）
- [ ] 4.2 實作 `src/copilot/handlers.ts` — 權限處理器（自動批准）和用戶輸入處理器（轉發至 Telegram + pending question 機制 + 2 分鐘逾時）
- [ ] 4.3 實作 `src/copilot/session-manager.ts` — SessionManager 類別（getOrCreateSession、resetSession、setModel、setWorkingDirectory、destroyAll），整合 handlers 和 tools

## 5. 訊息處理管線

- [ ] 5.1 實作 `src/telegram/formatter.ts` — Markdown 到 Telegram HTML 轉換（粗體、行內程式碼、程式碼區塊、連結、特殊字元跳脫）
- [ ] 5.2 實作 `src/telegram/sender.ts` — 訊息分段發送（4096 字元限制、段落邊界分割、HTML 感知分割、佔位訊息編輯）
- [ ] 5.3 實作 `src/bot/message-handler.ts` — 核心訊息處理流程（pending 問題檢查 → 佔位訊息 → sendAndWait → 格式化 → 發送，含錯誤處理和逾時處理）

## 6. 自訂工具

- [ ] 6.1 實作 `src/copilot/tools.ts` — createSessionTools 工廠函式，建立 send_file_to_user、notify_user、get_system_info、get_current_datetime 工具（透過閉包傳入 bot 和 chatId）

## 7. 進入點與優雅關閉

- [ ] 7.1 實作 `src/utils/graceful-shutdown.ts` — SIGTERM/SIGINT 處理（停止 bot → 銷毀 sessions → 停止 client → exit）
- [ ] 7.2 實作 `src/index.ts` — 串接所有元件（initCopilotClient → SessionManager → createBot → registerCommands → registerMessageHandler → setupGracefulShutdown → bot.start）

## 8. 部署設定

- [ ] 8.1 建立 `systemd/copilot-telegram-agent.service` — systemd 服務檔（Type=simple、Restart=always、RestartSec=10、EnvironmentFile、journal 日誌）
