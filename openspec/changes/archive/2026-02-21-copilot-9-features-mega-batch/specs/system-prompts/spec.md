## MODIFIED Requirements

### Requirement: Prompt Composer 組合順序

PromptComposer MUST 按以下順序組合系統提示詞（從原本 7 段縮減為 5 段）：
1. SYSTEM_PROMPT.md — 系統指令
2. PROFILE.md — 統一個人檔案（含身份、Agent 規則、偏好設定）
3. OPENSPEC_SDD.md — 條件注入（依 CONFIG.json 開關）
4. MEMORY.md — 自動記憶
5. .codeforge.md — 專案提示詞（從 cwd 讀取，fallback .ai-terminal.md）
6. Language directive — 語言指令（locale !== 'en' 時注入）

Composer MUST 不再讀取 AGENT.md 和 memory/preferences.md。

#### Scenario: 正常組合

- **WHEN** SYSTEM_PROMPT.md 和 PROFILE.md 皆有內容
- **THEN** 輸出只包含上述 5 段（加 locale 為 6 段），不含 AGENT.md 和 preferences.md 段落

#### Scenario: PROFILE.md 包含合併內容

- **WHEN** PROFILE.md 內容為 "# 個人檔案\n## 基本資訊\n...\n## Agent 規則\n...\n## 偏好設定\n..."
- **THEN** 整段作為 section 2 注入，與 SYSTEM_PROMPT 以 `---` 分隔

### Requirement: Agent API 降級為相容 Shim

`GET /api/prompts/agent` MUST 回傳空字串。
`PUT /api/prompts/agent` MUST 將 body 內容附加到 PROFILE.md 末尾（加上 `\n\n## Agent 規則\n` 前綴）。

#### Scenario: GET agent 回傳空

- **WHEN** 發送 `GET /api/prompts/agent`
- **THEN** 回傳 200 和空字串

#### Scenario: PUT agent 附加到 Profile

- **WHEN** 發送 `PUT /api/prompts/agent` body 為 "你叫做MomoCopilot"
- **THEN** 將 "\n\n## Agent 規則\n你叫做MomoCopilot" 附加到 PROFILE.md 末尾

### Requirement: Memory Preferences API 降級為相容 Shim

`GET /api/memory/preferences` MUST 回傳空字串。
`PUT /api/memory/preferences` MUST 將 body 內容附加到 PROFILE.md 末尾（加上 `\n\n## 偏好設定\n` 前綴）。

#### Scenario: GET preferences 回傳空

- **WHEN** 發送 `GET /api/memory/preferences`
- **THEN** 回傳 200 和空字串

## ADDED Requirements

### Requirement: 啟動時自動遷移 AGENT.md 和 Preferences

後端啟動時 MUST 執行一次性遷移邏輯：
1. 檢查 AGENT.md 是否存在且有內容 → 附加到 PROFILE.md 的 `## Agent 規則` 區段
2. 檢查 memory/preferences.md 是否存在且有內容 → 附加到 PROFILE.md 的 `## 偏好設定` 區段
3. 將已遷移的原檔重新命名為 `.bak`（例如 AGENT.md → AGENT.md.bak）

遷移 MUST 為冪等：若 .bak 檔案已存在，跳過該檔案的遷移。

#### Scenario: 首次遷移

- **WHEN** AGENT.md 含 "你叫做MomoCopilot" 且 AGENT.md.bak 不存在
- **THEN** 將 "\n\n## Agent 規則\n你叫做MomoCopilot" 附加到 PROFILE.md，AGENT.md 重命名為 AGENT.md.bak

#### Scenario: 冪等重跑

- **WHEN** AGENT.md.bak 已存在
- **THEN** 跳過 AGENT.md 的遷移，不重複附加

#### Scenario: 原檔為空

- **WHEN** AGENT.md 存在但內容為空
- **THEN** 跳過遷移，不附加空內容到 PROFILE.md
