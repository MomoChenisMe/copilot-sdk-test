## ADDED Requirements

### Requirement: Usage 事件轉發
Backend event-relay SHALL 轉發 SDK 的 usage 相關事件到 WebSocket clients。

#### Scenario: Per-call usage
- **WHEN** SDK 發出 `assistant.usage` 事件
- **THEN** 系統 SHALL 轉發為 `copilot:usage` WebSocket 事件（含 inputTokens, outputTokens, cost）

#### Scenario: Context window info
- **WHEN** SDK 發出 `session.usage_info` 事件
- **THEN** 系統 SHALL 轉發為 `copilot:context_window` WebSocket 事件（含 tokenLimit, currentTokens）

### Requirement: Per-tab Usage State
Zustand store SHALL 為每個 tab 維護獨立的 usage 狀態。

#### Scenario: 累計 token 計數
- **WHEN** 收到 `copilot:usage` 事件
- **THEN** 對應 tab 的 usage.totalTokens SHALL 累加

#### Scenario: Context window 更新
- **WHEN** 收到 `copilot:context_window` 事件
- **THEN** 對應 tab 的 contextUsed/contextMax SHALL 更新

### Requirement: UsageBar UI
ChatView SHALL 在訊息區與輸入區之間顯示 UsageBar。

#### Scenario: Context 使用率顯示
- **WHEN** tab 有 usage 資料
- **THEN** UsageBar SHALL 顯示 progress bar（綠 <50%、黃 50-80%、紅 >80%）

#### Scenario: Token 計數顯示
- **WHEN** totalTokens > 0
- **THEN** UsageBar SHALL 顯示 token 數量

#### Scenario: 無 usage 資料時隱藏
- **WHEN** tab 尚未有任何 usage 事件
- **THEN** UsageBar SHALL 不顯示
