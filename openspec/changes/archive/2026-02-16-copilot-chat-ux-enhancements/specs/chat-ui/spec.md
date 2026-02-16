## ADDED Requirements

### Requirement: User message 命令 badge 渲染
MessageBlock SHALL 解析 user message content 的 `/command` 前綴，將命令部分以 accent 色 badge 渲染，與一般文字視覺區隔。

#### Scenario: 命令前綴偵測
- **WHEN** user message content 以 `/<非空白字元>` 開頭（如 `/brainstorming 測試文字`）
- **THEN** `brainstorming` SHALL 以 accent 色 badge 渲染（`bg-accent/15 text-accent` 圓角標籤）
- **AND** 其餘文字 ` 測試文字` 以正常顏色顯示

#### Scenario: 無命令前綴
- **WHEN** user message content 不以 `/` 開頭
- **THEN** 整條訊息 SHALL 以正常文字渲染（無 badge）

#### Scenario: 僅有命令無參數
- **WHEN** user message content 為 `/clear`
- **THEN** `/clear` 整體以 accent 色 badge 渲染，無額外文字

### Requirement: 可收合技能描述
當 user message 中的命令名稱匹配已知 skill 時，MessageBlock SHALL 在命令 badge 下方顯示可收合的技能描述區塊。

#### Scenario: Skill 匹配時顯示收合區塊
- **WHEN** user message 以 `/brainstorming` 開頭且 `brainstorming` 為已知 skill
- **THEN** 命令 badge 下方 SHALL 顯示一個 `<details>` 收合元素
- **AND** 預設為收合狀態
- **AND** summary 文字顯示技能名稱或描述

#### Scenario: 展開技能描述
- **WHEN** 使用者點擊收合元素的 summary
- **THEN** 區塊展開顯示 skill 的完整描述內容

#### Scenario: 非 skill 命令不顯示收合區塊
- **WHEN** user message 以 `/unknown-command` 開頭但不匹配任何已知 skill
- **THEN** 僅顯示命令 badge，不顯示收合區塊
