## MODIFIED Requirements

### Requirement: PromptComposer 組裝邏輯

系統 SHALL 提供 `PromptComposer` 模組，負責按優先序組裝最終的 system prompt。

#### Scenario: 組裝順序

- **WHEN** PromptComposer 組裝 system prompt
- **THEN** 最終 prompt MUST 按以下順序串接各區段（以 `\n\n---\n\n` 分隔）：
  1. SYSTEM_PROMPT.md 內容（預設系統提示詞模板）
  2. PROFILE.md 內容（全域使用者設定）
  3. AGENT.md 內容（agent 規則）
  4. OPENSPEC_SDD.md 內容（OpenSpec SDD 工作流程規則，僅在 CONFIG.json 中 `openspecSddEnabled` 為 `true` 時注入）
  5. 已啟用的 presets 內容（按字母序）
  6. memory/preferences.md 內容（使用者偏好記憶）
  7. `.codeforge.md` 或 `.ai-terminal.md` 內容（專案層級提示，新版優先）

#### Scenario: OpenSpec SDD 啟用時注入

- **WHEN** PromptComposer 組裝 system prompt
- **AND** `CONFIG.json` 中 `openspecSddEnabled` 為 `true`
- **AND** `OPENSPEC_SDD.md` 檔案存在且內容非空
- **THEN** PromptComposer MUST 將 `OPENSPEC_SDD.md` 的內容注入至 AGENT.md 之後、Active presets 之前

#### Scenario: OpenSpec SDD 停用時不注入

- **WHEN** PromptComposer 組裝 system prompt
- **AND** `CONFIG.json` 中 `openspecSddEnabled` 為 `false` 或欄位不存在
- **THEN** PromptComposer MUST NOT 注入 `OPENSPEC_SDD.md` 的內容

#### Scenario: CONFIG.json 不存在或格式錯誤時不注入

- **WHEN** PromptComposer 組裝 system prompt
- **AND** `CONFIG.json` 檔案不存在或內容無法解析為 JSON
- **THEN** PromptComposer MUST NOT 注入 `OPENSPEC_SDD.md` 的內容
- **AND** MUST NOT 拋出錯誤，繼續組裝其餘區段

#### Scenario: OPENSPEC_SDD.md 為空時跳過

- **WHEN** PromptComposer 組裝 system prompt
- **AND** `CONFIG.json` 中 `openspecSddEnabled` 為 `true`
- **AND** `OPENSPEC_SDD.md` 檔案不存在或內容為空
- **THEN** PromptComposer MUST 跳過該區段，不產生多餘的分隔線

#### Scenario: 區段為空時跳過

- **WHEN** 任一區段的檔案內容為空字串或僅含空白
- **THEN** PromptComposer MUST 跳過該區段，不產生多餘的分隔線

#### Scenario: SDK 整合方式

- **WHEN** PromptComposer 組裝完成的 system prompt 傳遞給 Copilot SDK
- **THEN** 系統 MUST 使用 `systemMessage` 參數搭配 `mode: 'append'`，將組裝後的 prompt 附加到 SDK 預設的 system prompt 後方，MUST NOT 使用 `mode: 'replace'` 覆蓋 SDK 預設內容

#### Scenario: 所有區段為空

- **WHEN** 所有 prompt 區段檔案皆為空或不存在
- **THEN** PromptComposer MUST 回傳空字串，系統 MUST NOT 傳遞 `systemMessage` 參數給 SDK
