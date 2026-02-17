## ADDED Requirements

### Requirement: SDK 內建 Web Search
系統 SHALL 預設啟用 Copilot SDK 內建的 first-party web search tool，無需額外設定。

#### Scenario: 預設 web search 可用
- **WHEN** 使用者建立新 session 且未設定 Brave API key
- **THEN** SDK 內建 web search tool 仍可用於 AI 對話中

### Requirement: Brave Search API 自訂 Tool
系統 SHALL 支援透過 `defineTool()` 整合 Brave Search API 作為自訂 web search tool。

#### Scenario: 設定 Brave API key 後啟用自訂搜尋
- **WHEN** 使用者在設定中輸入有效的 Brave Search API key
- **THEN** 系統建立 session 時 SHALL 加入 Brave Search custom tool

#### Scenario: API key 未設定時不加入 Brave tool
- **WHEN** Brave API key 為空
- **THEN** 系統 SHALL 不加入 Brave Search custom tool，僅依賴 SDK 內建搜尋

#### Scenario: Brave Search API 呼叫失敗
- **WHEN** Brave Search API 回傳錯誤（401、429、500）
- **THEN** tool handler SHALL 回傳包含錯誤訊息的結果，不中斷對話

### Requirement: Web Search API Key 設定 UI
Settings 面板 SHALL 提供 Brave Search API Key 的輸入與儲存介面。

#### Scenario: 儲存 API Key
- **WHEN** 使用者在設定 General tab 輸入 Brave API Key 並儲存
- **THEN** 系統 SHALL 將 key 儲存至 backend config 檔案

#### Scenario: API Key 隱藏顯示
- **WHEN** API Key 已設定
- **THEN** 設定面板 SHALL 以遮罩方式顯示（如 `••••••••last4`）
