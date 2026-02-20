## ADDED Requirements

### Requirement: BackgroundSessionRunner 獨立執行 AI 任務

系統 SHALL 提供 `BackgroundSessionRunner` 元件，使用 `SessionManager.createSession()` 建立獨立的 SDK session 執行 AI 任務，不經過 StreamManager，不建立 conversation。

執行流程：
1. 根據配置建立 SDK session（model、cwd、tools、systemMessage、skillDirectories、disabledSkills）
2. 附加 `EventRelay` 收集 SDK 事件到本地 accumulator
3. 發送 prompt 給 session
4. 等待 `session.idle` 事件表示完成
5. 回傳 `BackgroundExecutionResult`

`BackgroundExecutionResult` MUST 包含：
- `turnSegments: TurnSegment[]` — 完整的執行段落（text、tool、reasoning）
- `toolRecords: ToolRecord[]` — 工具呼叫紀錄（toolCallId、toolName、arguments、status、result/error）
- `contentSegments: string[]` — AI 回覆文字片段
- `reasoningText: string` — 推理/思考文字
- `usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }` — token 用量
- `error?: string` — 錯誤訊息（僅在失敗時）

#### Scenario: 成功執行 AI 任務
- **WHEN** BackgroundSessionRunner.run() 被呼叫，傳入 prompt、model、cwd
- **THEN** 系統建立 SDK session、發送 prompt、收集完整 events、在 session.idle 後回傳 BackgroundExecutionResult，contentSegments 包含 AI 回覆

#### Scenario: 執行過程中有 tool calls
- **WHEN** SDK session 在執行過程中觸發 tool execution
- **THEN** toolRecords 記錄每個 tool call 的 toolCallId、toolName、arguments、status（success/error）和 result/error

#### Scenario: 執行超時
- **WHEN** SDK session 在指定 timeout（預設 5 分鐘）內未完成
- **THEN** 系統 abort session、回傳 BackgroundExecutionResult 且 error 欄位包含 timeout 訊息

#### Scenario: SDK session 建立失敗
- **WHEN** SessionManager.createSession() 拋出錯誤
- **THEN** BackgroundSessionRunner.run() 回傳包含 error 的 BackgroundExecutionResult

#### Scenario: 背景 session 不支援 user input
- **WHEN** SDK session 在執行過程中請求 user input（onUserInputRequest）
- **THEN** 系統不設定 onUserInputRequest handler，SDK 自然 timeout 該請求

---

### Requirement: Per-Job Tool 配置組裝

系統 SHALL 提供 `assembleCronTools()` 函數，根據 `CronToolConfig` 組裝 tools 陣列。

`CronToolConfig` MUST 支援以下開關：
- `skills?: boolean`（預設 true）— 是否載入 skill directories
- `selfControlTools?: boolean`（預設 false）— read_profile、update_profile 等
- `memoryTools?: boolean`（預設 false）— read_memory、append_memory 等
- `webSearchTool?: boolean`（預設 false）— web_search tool
- `taskTools?: boolean`（預設 false）— task_create、task_list 等
- `mcpTools?: boolean`（預設 false）— 所有 MCP server tools
- `disabledSkills?: string[]` — 要停用的 skill 名稱列表
- `mcpServers?: Record<string, boolean>` — 個別 MCP server 開關（僅在 mcpTools=true 時生效）

#### Scenario: 全部 tools 關閉
- **WHEN** CronToolConfig 所有欄位皆為 false 或未設定
- **THEN** assembleCronTools() 回傳空 tools 陣列、不設定 skillDirectories

#### Scenario: 選擇性啟用 tools
- **WHEN** CronToolConfig 設定 `memoryTools: true, webSearchTool: true`，其餘為 false
- **THEN** assembleCronTools() 只回傳 memory tools 和 web search tool

#### Scenario: MCP tools 帶 server 過濾
- **WHEN** CronToolConfig 設定 `mcpTools: true, mcpServers: { "server-a": true, "server-b": false }`
- **THEN** assembleCronTools() 只包含 server-a 的 tools，排除 server-b 的 tools

#### Scenario: Skills 啟用帶 disabled 列表
- **WHEN** CronToolConfig 設定 `skills: true, disabledSkills: ["skill-x"]`
- **THEN** assembleCronTools() 回傳 skillDirectories 且 disabledSkills 包含 "skill-x"

---

### Requirement: AI Executor 重寫

`createAiTaskExecutor` MUST 接收 `BackgroundSessionRunner` 和 `CronToolAssemblerDeps` 作為依賴，不再接收 `repo`（ConversationRepository）和 `streamManager`（StreamManager）。

執行流程：
1. 從 job config 提取 prompt、model、cwd、toolConfig
2. 呼叫 `assembleCronTools()` 組裝 tools
3. 呼叫 `BackgroundSessionRunner.run()` 執行
4. 回傳 `{ output: string, executionData: BackgroundExecutionResult }`

#### Scenario: AI executor 不再建立 conversation
- **WHEN** AI cron job 被觸發執行
- **THEN** 系統不呼叫 repo.create()、不建立任何 conversation 紀錄

#### Scenario: AI executor 回傳完整執行資料
- **WHEN** BackgroundSessionRunner 成功完成執行
- **THEN** executor 回傳 output（contentSegments 拼接）和完整 executionData

---

### Requirement: Permission 自動核准

BackgroundSessionRunner MUST 使用 `autoApprovePermission` 作為 onPermissionRequest handler，自動核准所有 tool permission 請求。

#### Scenario: 背景 session 自動核准 permission
- **WHEN** SDK session 在背景執行時請求 tool permission
- **THEN** 系統自動核准該請求，不等待用戶確認

---

### Requirement: Graceful Shutdown 支援

BackgroundSessionRunner MUST 在系統 graceful shutdown 時清理所有活躍的背景 session。

#### Scenario: 系統關閉時清理背景 session
- **WHEN** 系統執行 graceful shutdown
- **THEN** 所有正在執行的背景 session 被 abort，資源被釋放
