## ADDED Requirements

### Requirement: MCP 伺服器設定持久化

MCP 伺服器設定 SHALL 持久化到 `.mcp.json` 檔案中，重啟後端服務後自動載入。

#### Scenario: 新增伺服器後持久化

- **WHEN** 使用者透過 `POST /api/mcp/servers` 新增一個 MCP 伺服器
- **AND** 伺服器成功啟動
- **THEN** 系統 MUST 將該伺服器設定寫入 `.mcp.json` 檔案
- **AND** 檔案格式 MUST 為 `{ "mcpServers": { "<name>": { transport, command?, args?, url?, env? } } }`

#### Scenario: 刪除伺服器後更新持久化

- **WHEN** 使用者透過 `DELETE /api/mcp/servers/:name` 刪除一個 MCP 伺服器
- **THEN** 系統 MUST 從 `.mcp.json` 檔案中移除該伺服器的設定
- **AND** 檔案 MUST 立即寫回

#### Scenario: 重啟後自動載入

- **WHEN** 後端服務重啟
- **THEN** 系統 MUST 從 `.mcp.json` 讀取所有伺服器設定
- **AND** MUST 自動啟動所有已設定的伺服器

#### Scenario: 同名伺服器去重

- **WHEN** 新增的伺服器名稱與已存在的設定重複
- **THEN** 系統 MUST 以新設定覆蓋舊設定（去重後寫回）

#### Scenario: 設定檔不存在時

- **WHEN** `.mcp.json` 檔案不存在
- **AND** 使用者新增第一個伺服器
- **THEN** 系統 MUST 建立 `.mcp.json` 檔案並寫入設定

#### Scenario: 設定檔讀取失敗

- **WHEN** `.mcp.json` 檔案格式錯誤（非有效 JSON）
- **THEN** 系統 MUST 記錄警告 log
- **AND** MUST 以空設定繼續運行（不 crash）
