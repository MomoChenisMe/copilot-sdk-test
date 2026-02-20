## MODIFIED Requirements

### Requirement: /context Slash Command

使用者輸入 `/context` SHALL 在聊天中顯示一個可視化卡片（ContextCard），以 Claude Code CLI 風格呈現系統上下文資訊，取代目前的純 markdown 文字。

#### Scenario: 卡片基本結構

- **WHEN** 使用者執行 `/context` slash command
- **THEN** 系統 MUST 呼叫 `GET /api/copilot/context` 取得上下文資料
- **AND** MUST 在聊天訊息流中插入一個 system message
- **AND** message 的 `metadata` MUST 包含 `{ type: 'context', contextData: <API回傳> }`

#### Scenario: ContextCard 渲染

- **WHEN** MessageBlock 偵測到 `message.role === 'system'` 且 `metadata.type === 'context'`
- **THEN** MUST 渲染 `ContextCard` 組件取代預設 Markdown 渲染
- **AND** 卡片 MUST 使用 `bg-bg-secondary border border-border rounded-xl p-4` 樣式

#### Scenario: Header 區域

- **WHEN** ContextCard 渲染
- **THEN** Header MUST 顯示當前模型名稱
- **AND** MUST 顯示 System Prompt 總字元數佔比（totalChars / maxChars）
- **AND** MUST 顯示一個全局進度條，顏色依使用量百分比變化（綠/黃/紅）

#### Scenario: System Prompt 分類

- **WHEN** ContextCard 渲染 System Prompt 區域
- **THEN** MUST 顯示帶有色圓點的 "System Prompt" 分類標題
- **AND** MUST 以樹狀縮排列出每個 layer（名稱 + char count + active/inactive 狀態）
- **AND** token 估算值 MUST 使用 `Math.ceil(charCount / 4)` 計算
- **AND** MUST 標註 "Estimated" 表明為近似值

#### Scenario: Skills 分類

- **WHEN** ContextCard 渲染 Skills 區域
- **THEN** MUST 顯示 "Skills" 分類標題和總數
- **AND** MUST 以樹狀縮排分別顯示 built-in 和 user 技能數量

#### Scenario: MCP Servers 分類

- **WHEN** ContextCard 渲染 MCP Servers 區域
- **THEN** MUST 顯示 "MCP Servers" 分類標題和總數
- **AND** MUST 以樹狀縮排列出每個 server（名稱 + transport + tool 數量）

#### Scenario: Footer 資訊

- **WHEN** ContextCard 渲染 Footer 區域
- **THEN** MUST 顯示 SDK Version

#### Scenario: API 呼叫失敗

- **WHEN** `GET /api/copilot/context` 回傳錯誤
- **THEN** MUST 插入一個 system message 顯示錯誤訊息
- **AND** MUST NOT 渲染 ContextCard
