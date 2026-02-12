## ADDED Requirements

### Requirement: Bot 初始化與設定
系統 SHALL 建立 grammY Bot 實例，使用 `TELEGRAM_BOT_TOKEN` 環境變數進行認證，並設定 HTML 為預設 parse mode。

#### Scenario: Bot 成功啟動
- **WHEN** 應用程式啟動且 `TELEGRAM_BOT_TOKEN` 已設定
- **THEN** Bot SHALL 以 Long Polling 模式連線 Telegram Bot API 並開始接收更新

#### Scenario: Bot Token 未設定
- **WHEN** 應用程式啟動但 `TELEGRAM_BOT_TOKEN` 未設定
- **THEN** 系統 SHALL 拋出錯誤並終止啟動

### Requirement: 白名單認證
系統 SHALL 實作 middleware 檢查每個訊息的發送者 Telegram user ID 是否在允許清單中。允許清單透過 `TELEGRAM_ALLOWED_USER_IDS` 環境變數設定（逗號分隔的數字）。

#### Scenario: 授權用戶發送訊息
- **WHEN** 白名單中的用戶發送訊息
- **THEN** 系統 SHALL 將訊息傳遞至後續處理器

#### Scenario: 未授權用戶發送訊息
- **WHEN** 非白名單中的用戶發送訊息
- **THEN** 系統 SHALL 靜默忽略該訊息，不回傳任何內容

#### Scenario: 群組訊息
- **WHEN** 訊息來源為群組聊天（非私訊）
- **THEN** 系統 SHALL 忽略該訊息

### Requirement: /start 指令
系統 SHALL 回應 `/start` 指令，顯示歡迎訊息和所有可用指令的說明。

#### Scenario: 用戶發送 /start
- **WHEN** 授權用戶發送 `/start`
- **THEN** Bot SHALL 回傳包含歡迎文字和指令列表的 HTML 格式訊息

### Requirement: /help 指令
系統 SHALL 回應 `/help` 指令，顯示所有可用指令及其說明。

#### Scenario: 用戶發送 /help
- **WHEN** 授權用戶發送 `/help`
- **THEN** Bot SHALL 回傳所有可用指令的格式化說明

### Requirement: /reset 指令
系統 SHALL 回應 `/reset` 指令，銷毀當前 Copilot Session 並確認。

#### Scenario: 用戶重置有效 Session
- **WHEN** 授權用戶發送 `/reset` 且存在活躍 Session
- **THEN** 系統 SHALL 銷毀該 Session 並回覆確認訊息

#### Scenario: 用戶重置無 Session
- **WHEN** 授權用戶發送 `/reset` 但無活躍 Session
- **THEN** 系統 SHALL 回覆確認訊息（表示已重置）

### Requirement: /model 指令
系統 SHALL 回應 `/model` 指令。無參數時顯示當前模型；有參數時切換至指定模型。

#### Scenario: 查看當前模型
- **WHEN** 授權用戶發送 `/model`（無參數）
- **THEN** Bot SHALL 顯示當前使用的 AI 模型名稱

#### Scenario: 切換模型
- **WHEN** 授權用戶發送 `/model <name>`
- **THEN** 系統 SHALL 銷毀當前 Session、更新模型設定、並回覆確認訊息

### Requirement: /cwd 指令
系統 SHALL 回應 `/cwd` 指令。無參數時顯示當前工作目錄；有參數時切換至指定路徑。

#### Scenario: 查看當前工作目錄
- **WHEN** 授權用戶發送 `/cwd`（無參數）
- **THEN** Bot SHALL 顯示當前工作目錄路徑

#### Scenario: 切換工作目錄
- **WHEN** 授權用戶發送 `/cwd <path>` 且路徑存在
- **THEN** 系統 SHALL 更新工作目錄設定並回覆確認訊息

#### Scenario: 切換至不存在的路徑
- **WHEN** 授權用戶發送 `/cwd <path>` 但路徑不存在
- **THEN** 系統 SHALL 回覆錯誤訊息

### Requirement: /status 指令
系統 SHALL 回應 `/status` 指令，顯示系統狀態資訊。

#### Scenario: 查看狀態
- **WHEN** 授權用戶發送 `/status`
- **THEN** Bot SHALL 顯示：當前模型、工作目錄、Session 是否存在、Session 建立時間、Copilot Client 連線狀態

### Requirement: /cancel 指令
系統 SHALL 回應 `/cancel` 指令，取消當前進行中的 AI 操作。

#### Scenario: 取消進行中的操作
- **WHEN** 授權用戶發送 `/cancel` 且有操作正在進行
- **THEN** 系統 SHALL 呼叫 `session.abort()` 並回覆確認訊息

#### Scenario: 無操作進行中
- **WHEN** 授權用戶發送 `/cancel` 但無操作進行中
- **THEN** 系統 SHALL 回覆「目前沒有進行中的操作」

### Requirement: Bot 錯誤處理
系統 SHALL 透過 grammY 的 `bot.catch()` 攔截未處理的錯誤，記錄錯誤日誌並嘗試通知用戶。

#### Scenario: 未預期錯誤發生
- **WHEN** 處理訊息時發生未捕獲的錯誤
- **THEN** 系統 SHALL 記錄錯誤至日誌，並嘗試向用戶發送錯誤提示訊息
