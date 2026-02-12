## ADDED Requirements

### Requirement: 環境變數設定
系統 SHALL 透過 `.env` 檔案管理所有設定，啟動時驗證必要變數並在缺失時 fail-fast。

#### Scenario: 所有必要變數已設定
- **WHEN** `.env` 包含 `TELEGRAM_BOT_TOKEN`、`TELEGRAM_ALLOWED_USER_IDS`、`GITHUB_TOKEN`
- **THEN** 系統 SHALL 成功載入設定並啟動

#### Scenario: 必要變數缺失
- **WHEN** 任一必要環境變數未設定
- **THEN** 系統 SHALL 拋出明確的錯誤訊息指出缺少哪個變數，並終止啟動

#### Scenario: 可選變數預設值
- **WHEN** `COPILOT_DEFAULT_MODEL` 未設定
- **THEN** 系統 SHALL 使用 `"gpt-4.1"` 作為預設值
- **WHEN** `COPILOT_WORKING_DIRECTORY` 未設定
- **THEN** 系統 SHALL 使用 `process.cwd()` 作為預設值
- **WHEN** `LOG_LEVEL` 未設定
- **THEN** 系統 SHALL 使用 `"info"` 作為預設值

### Requirement: .env.example 範本
專案 SHALL 提供 `.env.example` 檔案，列出所有環境變數及說明。

#### Scenario: .env.example 內容
- **WHEN** 開發者查看 `.env.example`
- **THEN** 檔案 SHALL 包含所有環境變數的名稱、說明和範例值

### Requirement: 結構化日誌
系統 SHALL 使用 pino 輸出 JSON 格式日誌，適合 systemd journalctl 解析。

#### Scenario: 日誌輸出
- **WHEN** 系統產生日誌訊息
- **THEN** 日誌 SHALL 以 JSON 格式輸出至 stdout，包含 level、time、msg 欄位

#### Scenario: 日誌等級控制
- **WHEN** `LOG_LEVEL` 設為特定等級（如 `"debug"`）
- **THEN** 系統 SHALL 僅輸出該等級及更高等級的日誌

### Requirement: 優雅關閉
系統 SHALL 在收到終止信號時執行優雅關閉程序。

#### Scenario: 收到 SIGTERM 或 SIGINT
- **WHEN** 程序收到 SIGTERM 或 SIGINT 信號
- **THEN** 系統 SHALL 依序：1) 停止 Bot long polling 2) 銷毀所有 CopilotSession 3) 停止 CopilotClient 4) 以 exit code 0 終止程序

### Requirement: systemd 服務檔
專案 SHALL 提供 systemd service 檔案，支援作為 Linux 服務運行。

#### Scenario: 服務設定
- **WHEN** 管理員部署服務
- **THEN** service 檔 SHALL 設定：`Type=simple`、`Restart=always`、`RestartSec=10`、透過 `EnvironmentFile` 載入 `.env`、使用 `tsx` 執行 TypeScript

#### Scenario: 服務異常重啟
- **WHEN** Bot 程序異常終止
- **THEN** systemd SHALL 在 10 秒後自動重啟服務

#### Scenario: 日誌整合
- **WHEN** 服務運行中
- **THEN** stdout 和 stderr SHALL 導向 journalctl，可透過 `journalctl -u copilot-telegram-agent` 查看

### Requirement: .gitignore 設定
專案 SHALL 設定 `.gitignore` 排除敏感和不必要的檔案。

#### Scenario: 排除項目
- **WHEN** 使用 Git 追蹤檔案
- **THEN** `.gitignore` SHALL 排除：`node_modules/`、`.env`、`dist/`、`.DS_Store`
