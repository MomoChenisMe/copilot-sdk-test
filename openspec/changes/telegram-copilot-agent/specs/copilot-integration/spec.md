## ADDED Requirements

### Requirement: CopilotClient 生命週期管理
系統 SHALL 管理一個 CopilotClient 單例實例，負責與 Copilot CLI 的 JSON-RPC 通訊。

#### Scenario: Client 初始化
- **WHEN** 應用程式啟動且 `GITHUB_TOKEN` 已設定
- **THEN** 系統 SHALL 建立 CopilotClient 並設定 `githubToken`、`autoStart: true`、`autoRestart: true`，然後呼叫 `start()`

#### Scenario: Client 初始化失敗
- **WHEN** CopilotClient `start()` 失敗（例如 token 無效或 CLI 不存在）
- **THEN** 系統 SHALL 記錄 fatal 錯誤並終止程式

#### Scenario: Client 關閉
- **WHEN** 應用程式收到 SIGTERM 或 SIGINT
- **THEN** 系統 SHALL 呼叫 `client.stop()` 進行優雅關閉

### Requirement: Session 管理
系統 SHALL 維護一個 `Map<number, SessionEntry>` 將 Telegram chatId 映射到 CopilotSession。每個 SessionEntry 包含：session 實例、model 名稱、workingDirectory 路徑、建立時間、最後使用時間。

#### Scenario: 首次訊息建立 Session
- **WHEN** 用戶首次發送訊息且無對應 Session
- **THEN** 系統 SHALL 建立新的 CopilotSession，設定模型（預設 `COPILOT_DEFAULT_MODEL`）、systemMessage（append 模式）、權限處理器、用戶輸入處理器

#### Scenario: 後續訊息重用 Session
- **WHEN** 用戶發送訊息且已有對應 Session
- **THEN** 系統 SHALL 重用該 Session（維持多輪對話上下文）並更新 lastUsed 時間

#### Scenario: 銷毀 Session
- **WHEN** 觸發 session reset（如 `/reset` 指令）
- **THEN** 系統 SHALL 呼叫 `session.destroy()`、從 Map 中移除該 entry

#### Scenario: 切換模型
- **WHEN** 用戶透過 `/model <name>` 切換模型
- **THEN** 系統 SHALL 銷毀當前 Session、更新 model 設定。下次訊息時以新模型建立 Session

### Requirement: 權限處理器
系統 SHALL 為每個 Session 註冊 `onPermissionRequest` 處理器，自動批准所有操作。

#### Scenario: 工具執行需要權限
- **WHEN** Copilot Agent 請求執行工具的權限
- **THEN** 處理器 SHALL 回傳 `{ kind: "approved" }`

### Requirement: 用戶輸入處理器
系統 SHALL 為每個 Session 註冊 `onUserInputRequest` 處理器，將 AI 的問題轉發至 Telegram 用戶並等待回覆。

#### Scenario: AI 透過 ask_user 工具提問
- **WHEN** Copilot Agent 觸發 ask_user 工具
- **THEN** 系統 SHALL 將問題文字發送至對應的 Telegram chat，並等待用戶回覆（逾時 2 分鐘）

#### Scenario: 用戶回覆 pending 問題
- **WHEN** 有 pending 問題且用戶發送新訊息
- **THEN** 系統 SHALL 將該訊息作為 pending 問題的答案回傳給 Copilot，而非作為新的 prompt

#### Scenario: 用戶輸入逾時
- **WHEN** pending 問題超過 2 分鐘未收到回覆
- **THEN** 系統 SHALL 以逾時錯誤回傳，並通知用戶操作已逾時

### Requirement: Session 設定
系統 SHALL 在建立 Session 時套用以下設定：

#### Scenario: 預設 Session 設定
- **WHEN** 建立新的 CopilotSession
- **THEN** Session SHALL 設定：指定的 model、`systemMessage` 以 append 模式加入自訂系統提示、`workingDirectory` 為指定的工作目錄
