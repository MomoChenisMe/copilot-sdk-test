## ADDED Requirements

### Requirement: MCP 設定檔解析
系統 SHALL 讀取專案根目錄的 `.mcp.json` 設定檔，解析 `mcpServers` 物件中的 server 定義。每個 server 定義 MUST 包含 `transport` 欄位（`"stdio"` 或 `"http"`），stdio 類型 MUST 包含 `command` 和 `args`，http 類型 MUST 包含 `url`。設定檔中的 `${VAR}` 語法 SHALL 被展開為對應的環境變數值。

#### Scenario: 解析有效的 stdio server 設定
- **WHEN** `.mcp.json` 包含 `{"mcpServers": {"fs": {"command": "npx", "args": ["-y", "@anthropic/mcp-server-filesystem", "/tmp"], "transport": "stdio"}}}`
- **THEN** 系統解析出名為 `fs` 的 server，transport 為 stdio，command 為 `npx`

#### Scenario: 解析有效的 http server 設定
- **WHEN** `.mcp.json` 包含 `{"mcpServers": {"api": {"url": "http://localhost:3001/mcp", "transport": "http"}}}`
- **THEN** 系統解析出名為 `api` 的 server，transport 為 http，url 為 `http://localhost:3001/mcp`

#### Scenario: 環境變數展開
- **WHEN** 設定檔包含 `"args": ["--token", "${GITHUB_TOKEN}"]` 且環境變數 `GITHUB_TOKEN=abc123`
- **THEN** 展開後的 args 為 `["--token", "abc123"]`

#### Scenario: 設定檔不存在
- **WHEN** 專案根目錄不存在 `.mcp.json`
- **THEN** 系統正常啟動，MCP 功能停用，不產生錯誤

#### Scenario: 設定檔格式錯誤
- **WHEN** `.mcp.json` 內容不是合法 JSON 或缺少必要欄位
- **THEN** 系統記錄錯誤日誌並跳過無效的 server 定義，其他有效 server 正常載入

### Requirement: MCP Client 連線管理
系統 SHALL 為每個設定檔中的 server 建立獨立的 MCP client 連線。stdio transport MUST 透過 `child_process.spawn` 啟動子程序並使用 stdin/stdout 通訊。http transport MUST 透過 HTTP POST 發送 JSON-RPC 請求。系統 SHALL 使用 `@modelcontextprotocol/sdk` 套件處理 MCP 協議。

#### Scenario: stdio server 正常連線
- **WHEN** 系統啟動並載入 stdio 類型的 server 設定
- **THEN** 系統 spawn 子程序、完成 MCP initialize handshake、取得 server 的 tool 列表

#### Scenario: http server 正常連線
- **WHEN** 系統啟動並載入 http 類型的 server 設定
- **THEN** 系統透過 HTTP 完成 MCP initialize handshake、取得 server 的 tool 列表

#### Scenario: server 連線失敗
- **WHEN** stdio server 的 command 不存在或 http server 的 url 無法連線
- **THEN** 系統記錄錯誤日誌，標記該 server 為 `error` 狀態，不影響其他 server

#### Scenario: server 子程序 crash
- **WHEN** stdio server 的子程序意外結束
- **THEN** 系統標記該 server 為 `disconnected`，嘗試自動重啟（最多 3 次，間隔指數遞增）

### Requirement: MCP Tool 轉接為 Copilot SDK Tool
系統 SHALL 將每個 MCP server 暴露的 tools 轉換為 Copilot SDK 的 `Tool` 介面物件。轉換後的 Tool 名稱 MUST 使用 `mcp_<serverName>_<toolName>` 格式以避免命名衝突。Tool 的 `execute` 方法 SHALL 呼叫對應 MCP server 的 `call_tool` 方法並回傳結果。

#### Scenario: MCP tool 成功轉接
- **WHEN** MCP server `fs` 暴露 tool `read_file` 且參數 schema 為 `{path: string}`
- **THEN** 產生 Copilot SDK Tool，名稱為 `mcp_fs_read_file`，description 和 parameters 對應原始 MCP tool 定義

#### Scenario: Tool 執行成功
- **WHEN** AI 呼叫 `mcp_fs_read_file` 並傳入 `{path: "/tmp/test.txt"}`
- **THEN** 系統呼叫 MCP server `fs` 的 `call_tool("read_file", {path: "/tmp/test.txt"})`，回傳結果給 Copilot SDK

#### Scenario: Tool 執行失敗
- **WHEN** MCP tool 呼叫逾時（超過 30 秒）或回傳錯誤
- **THEN** 系統回傳錯誤訊息給 Copilot SDK，不中斷整個串流

#### Scenario: Tool 合併至串流
- **WHEN** 使用者發起新對話串流
- **THEN** 系統將所有已連線 MCP server 的 tools 與 selfControlTools 合併，一起傳入 Copilot SDK session

### Requirement: MCP 熱重載
系統 SHALL 監聽 `.mcp.json` 檔案變更，檔案變更時自動重新載入設定並調整 server 連線（新增、移除、重啟變更的 server），無需重啟整個後端。

#### Scenario: 新增 server
- **WHEN** 使用者在 `.mcp.json` 中新增一個 server 定義並儲存
- **THEN** 系統偵測到變更，為新 server 建立連線，其 tools 在下次串流時可用

#### Scenario: 移除 server
- **WHEN** 使用者從 `.mcp.json` 中移除一個 server 定義
- **THEN** 系統關閉對應 client 連線（含子程序），移除其 tools

#### Scenario: 修改 server 設定
- **WHEN** 使用者修改現有 server 的 args 或 url
- **THEN** 系統關閉舊連線，使用新設定重新建立連線

### Requirement: MCP REST API
系統 SHALL 提供 REST API 管理 MCP servers：
- `GET /api/mcp/servers` — 列出所有 server 及其狀態與 tools
- `POST /api/mcp/servers` — 新增 server（寫入 `.mcp.json`）
- `DELETE /api/mcp/servers/:name` — 移除 server（從 `.mcp.json` 刪除）
- `POST /api/mcp/servers/:name/restart` — 手動重啟 server
- `GET /api/mcp/servers/:name/tools` — 取得特定 server 的 tool 列表

#### Scenario: 列出所有 servers
- **WHEN** 前端發送 `GET /api/mcp/servers`
- **THEN** 回傳 JSON 陣列，每個元素包含 `name`, `transport`, `status`（`connected`/`disconnected`/`error`）, `toolCount`

#### Scenario: 新增 server 透過 API
- **WHEN** 前端發送 `POST /api/mcp/servers` 包含 `{name: "new-server", command: "node", args: ["server.js"], transport: "stdio"}`
- **THEN** 系統更新 `.mcp.json`，啟動新 server 連線，回傳 201

#### Scenario: 刪除 server
- **WHEN** 前端發送 `DELETE /api/mcp/servers/old-server`
- **THEN** 系統關閉該 server 連線，從 `.mcp.json` 移除，回傳 204

### Requirement: MCP Settings UI
前端 SettingsPanel SHALL 新增 MCP Tab，顯示所有已設定的 MCP servers。每個 server 卡片 MUST 顯示名稱、transport 類型、連線狀態、tool 數量。UI SHALL 提供新增、移除、重啟 server 的操作按鈕。

#### Scenario: 顯示 server 列表
- **WHEN** 使用者開啟 Settings 的 MCP tab
- **THEN** 顯示所有 server 的卡片清單，包含狀態指示燈（綠色=connected, 紅色=error, 灰色=disconnected）

#### Scenario: 新增 server
- **WHEN** 使用者點擊 "Add Server" 按鈕並填入表單
- **THEN** 呼叫 `POST /api/mcp/servers`，成功後列表更新

#### Scenario: 展開 tool 列表
- **WHEN** 使用者點擊 server 卡片的展開按鈕
- **THEN** 顯示該 server 提供的所有 tools 名稱與 description

#### Scenario: 重啟 server
- **WHEN** 使用者點擊 server 卡片上的重啟按鈕
- **THEN** 呼叫 `POST /api/mcp/servers/:name/restart`，狀態暫時顯示為重啟中
