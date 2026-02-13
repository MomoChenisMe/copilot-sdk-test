## ADDED Requirements

### Requirement: Production 建置

系統 SHALL 支援 production 建置，輸出可部署的靜態前端和編譯後的後端。

#### Scenario: 前端建置

- **WHEN** 執行 `npm run build` 在 frontend workspace
- **THEN** Vite MUST 產生最小化的靜態檔案到 `frontend/dist/`

#### Scenario: 後端建置

- **WHEN** 執行 `npm run build` 在 backend workspace
- **THEN** TypeScript MUST 編譯為 JavaScript 到 `backend/dist/`

### Requirement: 靜態檔案伺服

後端 SHALL 在 production 模式下直接伺服前端的靜態檔案。

#### Scenario: 伺服前端資產

- **WHEN** 瀏覽器請求 `/` 或 `/assets/*`
- **THEN** Express MUST 從 `frontend/dist/` 伺服靜態檔案

#### Scenario: SPA fallback

- **WHEN** 瀏覽器請求不匹配任何 API 或靜態檔案的路徑
- **THEN** Express MUST 回傳 `frontend/dist/index.html`（SPA routing）

### Requirement: systemd Service

系統 SHALL 提供 systemd service 設定檔，管理應用程式的生命週期。

#### Scenario: 服務啟動

- **WHEN** 執行 `systemctl start ai-terminal`
- **THEN** 服務 MUST 啟動 Node.js 後端，設定 `NODE_ENV=production`

#### Scenario: 服務自動重啟

- **WHEN** 後端 process 異常退出
- **THEN** systemd MUST 自動重啟服務（`Restart=on-failure`）

### Requirement: Nginx 反向代理

系統 SHALL 提供 Nginx 設定檔，處理 SSL 終止和反向代理。

#### Scenario: HTTPS 請求代理

- **WHEN** 瀏覽器發出 HTTPS 請求
- **THEN** Nginx MUST 終止 SSL，將請求代理到後端 HTTP port

#### Scenario: WebSocket upgrade 代理

- **WHEN** 瀏覽器發出 WebSocket upgrade 請求
- **THEN** Nginx MUST 正確代理 WebSocket 連線，設定 `proxy_set_header Upgrade` 和 `Connection`

### Requirement: 環境變數設定

系統 SHALL 提供 `.env.example` 範本檔案，列出所有必要的環境變數。

#### Scenario: 環境變數範本

- **WHEN** 查看 `.env.example`
- **THEN** 檔案 MUST 包含：`PORT`、`WEB_PASSWORD`、`SESSION_SECRET`、`DEFAULT_CWD`、`DB_PATH`、`NODE_ENV`
