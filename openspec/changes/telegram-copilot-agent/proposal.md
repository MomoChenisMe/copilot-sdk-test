## Why

需要一個可透過 Telegram 操控的私人 AI Agent，結合 GitHub Copilot SDK 的 Agent 引擎能力，同時支援通用聊天與程式開發任務（檔案操作、Git、終端指令等），並部署在 Linux 上作為持續運行的服務。

## What Changes

- 建立基於 `@github/copilot-sdk` 的 AI Agent 後端，透過 JSON-RPC 與 Copilot CLI 通訊
- 建立 grammY Telegram Bot 作為用戶介面，使用 Long Polling 模式接收訊息
- 實作 Session 管理系統，將每個 Telegram chat 映射到獨立的 CopilotSession
- 實作白名單認證 middleware，僅允許指定 Telegram user ID 存取
- 實作 Markdown → Telegram HTML 格式轉換與訊息分段發送（4096 字元限制）
- 定義自訂工具（傳檔、通知、系統資訊、取得時間）讓 Agent 能與 Telegram 互動
- 實作 Bot 指令系統（/start, /help, /reset, /model, /cwd, /status, /cancel）
- 建立 systemd service 設定檔，支援自動重啟與 journalctl 日誌

## Capabilities

### New Capabilities
- `telegram-bot`: Telegram Bot 介面層 — grammY 設定、Long Polling、白名單認證 middleware、指令系統、訊息路由
- `copilot-integration`: Copilot SDK 整合層 — CopilotClient 生命週期管理、Session 管理（chatId ↔ CopilotSession 映射）、權限/用戶輸入處理器
- `message-pipeline`: 訊息處理管線 — 核心訊息生命週期（佔位訊息 → AI 回應 → 格式化 → 分段發送）、Markdown 到 Telegram HTML 轉換
- `custom-tools`: Agent 自訂工具 — send_file_to_user、notify_user、get_system_info、get_current_datetime
- `deployment`: Linux 部署設定 — systemd service 檔、環境變數管理、優雅關閉處理

### Modified Capabilities
（無既有 capabilities，此為全新專案）

## Impact

- **新增依賴**: `@github/copilot-sdk`, `grammy`, `@grammyjs/parse-mode`, `dotenv`, `pino`, `zod`, `tsx`, `typescript`
- **系統需求**: Node.js v24+、GitHub Copilot CLI、GitHub Copilot 訂閱
- **外部服務**: Telegram Bot API、GitHub Copilot 服務
- **檔案系統**: Agent 擁有完整系統存取權限（依 service 執行帳號的權限）
- **安全邊界**: 所有密鑰透過 `.env` 管理，Telegram 白名單限制存取，無公開網路端點
