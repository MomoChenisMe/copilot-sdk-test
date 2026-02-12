## ADDED Requirements

### Requirement: 工具以 Session 為單位建立
系統 SHALL 為每個 CopilotSession 建立獨立的自訂工具實例，透過閉包傳入 Bot 實例和 chatId。

#### Scenario: Session 建立時註冊工具
- **WHEN** 建立新的 CopilotSession
- **THEN** 系統 SHALL 呼叫 `createSessionTools(bot, chatId)` 建立工具陣列，並在 session config 的 `tools` 中傳入

### Requirement: send_file_to_user 工具
系統 SHALL 提供 `send_file_to_user` 工具，讓 Agent 能透過 Telegram 傳送檔案給用戶。

#### Scenario: 傳送存在的檔案
- **WHEN** Agent 呼叫 `send_file_to_user` 並指定存在的 `filePath`
- **THEN** 系統 SHALL 使用 `bot.api.sendDocument()` 將檔案傳送至用戶，並回傳成功訊息

#### Scenario: 傳送不存在的檔案
- **WHEN** Agent 呼叫 `send_file_to_user` 但 `filePath` 不存在
- **THEN** 工具 SHALL 回傳錯誤訊息指出檔案不存在

#### Scenario: 附加 caption
- **WHEN** Agent 呼叫 `send_file_to_user` 並提供可選的 `caption` 參數
- **THEN** 系統 SHALL 在傳送檔案時附加該 caption

### Requirement: notify_user 工具
系統 SHALL 提供 `notify_user` 工具，讓 Agent 在長時間操作中發送獨立的通知訊息。

#### Scenario: 發送通知
- **WHEN** Agent 呼叫 `notify_user` 並提供 `message` 參數
- **THEN** 系統 SHALL 透過 `bot.api.sendMessage()` 發送獨立訊息至用戶

### Requirement: get_system_info 工具
系統 SHALL 提供 `get_system_info` 工具，回傳目前系統資訊。

#### Scenario: 查詢系統資訊
- **WHEN** Agent 呼叫 `get_system_info`（無參數）
- **THEN** 工具 SHALL 回傳 JSON 物件包含：hostname、platform、uptime、總記憶體、可用記憶體、磁碟使用狀況

### Requirement: get_current_datetime 工具
系統 SHALL 提供 `get_current_datetime` 工具，回傳目前日期時間。

#### Scenario: 查詢當前時間
- **WHEN** Agent 呼叫 `get_current_datetime`
- **THEN** 工具 SHALL 回傳 ISO 格式日期時間字串和人類可讀格式

#### Scenario: 指定時區
- **WHEN** Agent 呼叫 `get_current_datetime` 並提供 `timezone` 參數
- **THEN** 工具 SHALL 回傳該時區的日期時間
