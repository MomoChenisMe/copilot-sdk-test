## ADDED Requirements

### Requirement: Context API Endpoint
系統 SHALL 提供 `GET /api/copilot/context` endpoint，回傳當前系統上下文資訊。

#### Scenario: 成功回傳 System Prompt 資訊
- **WHEN** 前端呼叫 `GET /api/copilot/context`
- **THEN** 回應 SHALL 包含 `systemPromptLayers` 陣列，每筆包含 `name`（string）、`active`（boolean）、`charCount`（number）

#### Scenario: System Prompt 總量資訊
- **WHEN** 前端呼叫 `GET /api/copilot/context`
- **THEN** 回應 SHALL 包含 `systemPromptTotal`（目前總字元數）和 `systemPromptMax`（上限字元數）

#### Scenario: Skills 列表
- **WHEN** 前端呼叫 `GET /api/copilot/context`
- **THEN** 回應 SHALL 包含 `skills` 陣列，每筆包含 `name`（string）、`type`（`"builtin"` | `"user"`）、`enabled`（boolean）

#### Scenario: MCP Servers 資訊
- **WHEN** 前端呼叫 `GET /api/copilot/context`
- **THEN** 回應 SHALL 包含 `mcpServers` 陣列，每筆包含 `name`（string）、`transportType`（string）、`toolCount`（number）

#### Scenario: 運行時狀態
- **WHEN** 前端呼叫 `GET /api/copilot/context`
- **THEN** 回應 SHALL 包含 `currentModel`（string）、`sdkVersion`（string）、`planMode`（boolean）

#### Scenario: SDK 未連線
- **WHEN** 前端呼叫 `GET /api/copilot/context` 但 Copilot SDK 尚未建立連線
- **THEN** API SHALL 回傳 HTTP 503 `{ error: "SDK not connected" }`

### Requirement: /context Slash Command
前端 SHALL 提供 `/context` slash command，在聊天中顯示當前系統上下文。

#### Scenario: 使用者輸入 /context
- **WHEN** 使用者在聊天輸入框中輸入 `/context` 並送出
- **THEN** 前端 SHALL 呼叫 `GET /api/copilot/context` 並將結果格式化為 markdown 系統訊息插入聊天

#### Scenario: Markdown 格式化 — System Prompt 區段
- **WHEN** context 資料成功取得
- **THEN** 系統訊息 SHALL 包含 "System Prompt Layers" 區段，以表格顯示每層的名稱、啟用狀態、字元數，並在底部顯示 `total / max`

#### Scenario: Markdown 格式化 — Skills 區段
- **WHEN** context 資料成功取得
- **THEN** 系統訊息 SHALL 包含 "Skills" 區段，分別列出 builtin 和 user skills，標示啟用/停用狀態

#### Scenario: Markdown 格式化 — MCP Servers 區段
- **WHEN** context 資料成功取得
- **THEN** 系統訊息 SHALL 包含 "MCP Servers" 區段，列出每個 server 的名稱、transport type、tool 數量

#### Scenario: Markdown 格式化 — Runtime 區段
- **WHEN** context 資料成功取得
- **THEN** 系統訊息 SHALL 包含 "Runtime" 區段，顯示 current model、SDK version、plan mode 狀態

#### Scenario: API 呼叫失敗
- **WHEN** `GET /api/copilot/context` 回傳錯誤（如 503）
- **THEN** 前端 SHALL 插入一條錯誤系統訊息，顯示 "Unable to retrieve context information"

#### Scenario: 不發送至 LLM
- **WHEN** `/context` 指令被處理
- **THEN** 前端 SHALL 僅在本地插入系統訊息，MUST NOT 將訊息發送至 Copilot SDK 串流
