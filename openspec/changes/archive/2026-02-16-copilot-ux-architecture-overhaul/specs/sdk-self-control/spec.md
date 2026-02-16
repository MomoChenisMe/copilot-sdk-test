## ADDED Requirements

### Requirement: Profile 讀寫工具

Copilot SDK session SHALL 註冊 `read_profile` 和 `update_profile` 工具，允許 SDK 讀取和修改使用者 Profile（PROFILE.md）。

#### Scenario: SDK 讀取 Profile
- **WHEN** SDK 呼叫 `read_profile` 工具
- **THEN** 工具 handler MUST 從 PromptFileStore 讀取 PROFILE.md 並回傳其內容

#### Scenario: SDK 讀取空 Profile
- **WHEN** SDK 呼叫 `read_profile` 且 PROFILE.md 不存在或為空
- **THEN** 工具 handler MUST 回傳 `{ content: "(empty)" }`

#### Scenario: SDK 更新 Profile
- **WHEN** SDK 呼叫 `update_profile` 工具帶有 `{ content: "new content" }`
- **THEN** 工具 handler MUST 將 content 寫入 PROFILE.md，回傳 `{ success: true }`

#### Scenario: Profile 更新下一輪生效
- **WHEN** SDK 在 Turn N 中呼叫 `update_profile` 修改 PROFILE.md
- **THEN** Turn N+1 的 `startStream` 呼叫 `PromptComposer.compose()` 時 MUST 讀取到更新後的 PROFILE.md 內容

### Requirement: Agent Rules 讀寫工具

Copilot SDK session SHALL 註冊 `read_agent_rules` 和 `update_agent_rules` 工具，允許 SDK 讀取和修改 Agent 規則（AGENT.md）。

#### Scenario: SDK 讀取 Agent Rules
- **WHEN** SDK 呼叫 `read_agent_rules` 工具
- **THEN** 工具 handler MUST 從 PromptFileStore 讀取 AGENT.md 並回傳其內容

#### Scenario: SDK 更新 Agent Rules
- **WHEN** SDK 呼叫 `update_agent_rules` 工具帶有 `{ content: "new rules" }`
- **THEN** 工具 handler MUST 將 content 寫入 AGENT.md，回傳 `{ success: true }`

#### Scenario: Agent Rules 更新下一輪生效
- **WHEN** SDK 在 Turn N 中呼叫 `update_agent_rules`
- **THEN** Turn N+1 的 system prompt MUST 包含更新後的 AGENT.md 內容

### Requirement: Preferences 讀寫工具

Copilot SDK session SHALL 註冊 `read_preferences` 和 `update_preferences` 工具，允許 SDK 讀取和修改記憶偏好（memory/preferences.md）。

#### Scenario: SDK 讀取 Preferences
- **WHEN** SDK 呼叫 `read_preferences` 工具
- **THEN** 工具 handler MUST 從 PromptFileStore 讀取 memory/preferences.md 並回傳其內容

#### Scenario: SDK 更新 Preferences
- **WHEN** SDK 呼叫 `update_preferences` 工具帶有 `{ content: "updated prefs" }`
- **THEN** 工具 handler MUST 將 content 寫入 memory/preferences.md，回傳 `{ success: true }`

### Requirement: Skills CRUD 工具

Copilot SDK session SHALL 註冊技能管理工具組：`list_skills`、`read_skill`、`create_skill`、`update_skill`、`delete_skill`。

#### Scenario: SDK 列出所有技能
- **WHEN** SDK 呼叫 `list_skills` 工具
- **THEN** 工具 handler MUST 回傳所有 user skills 的 `[{ name, description }]` 清單

#### Scenario: SDK 讀取技能
- **WHEN** SDK 呼叫 `read_skill` 工具帶有 `{ name: "code-review" }`
- **THEN** 工具 handler MUST 回傳該技能的 `{ name, description, content }`

#### Scenario: SDK 讀取不存在的技能
- **WHEN** SDK 呼叫 `read_skill` 帶有不存在的名稱
- **THEN** 工具 handler MUST 回傳 `{ error: "Skill not found" }`

#### Scenario: SDK 建立技能
- **WHEN** SDK 呼叫 `create_skill` 工具帶有 `{ name, description, content }`
- **THEN** 工具 handler MUST 呼叫 `skillStore.writeSkill()` 建立技能，回傳 `{ success: true }`

#### Scenario: SDK 更新技能
- **WHEN** SDK 呼叫 `update_skill` 工具帶有 `{ name, content }`
- **THEN** 工具 handler MUST 更新該技能的內容，回傳 `{ success: true }`

#### Scenario: SDK 刪除 user skill
- **WHEN** SDK 呼叫 `delete_skill` 帶有 user skill 名稱
- **THEN** 工具 handler MUST 刪除該技能，回傳 `{ success: true }`

#### Scenario: SDK 嘗試刪除 builtin skill
- **WHEN** SDK 呼叫 `delete_skill` 帶有 builtin skill 名稱
- **THEN** 工具 handler MUST 拒絕操作，回傳 `{ error: "Cannot delete built-in skills" }`

### Requirement: 工具註冊到 SDK Session

Self-control tools SHALL 在每次建立或恢復 SDK session 時被註冊。

#### Scenario: 新 session 註冊工具
- **WHEN** `SessionManager.createSession()` 被呼叫
- **THEN** SessionConfig MUST 包含所有 self-control tools 在 `tools` 欄位中

#### Scenario: 恢復 session 註冊工具
- **WHEN** `SessionManager.resumeSession()` 被呼叫
- **THEN** ResumeSessionConfig MUST 包含所有 self-control tools 在 `tools` 欄位中

#### Scenario: StreamManager 傳遞工具
- **WHEN** `StreamManager.startStream()` 被呼叫
- **THEN** StreamManager MUST 將 `selfControlTools` 傳遞給 session options

### Requirement: System Prompt 不可被 SDK 修改

SYSTEM_PROMPT.md SHALL NOT 被暴露為 self-control 工具。

#### Scenario: 無 system prompt 工具
- **WHEN** self-control tools 列表被建立
- **THEN** 列表中 MUST NOT 包含任何可讀取或修改 SYSTEM_PROMPT.md 的工具

### Requirement: 內容長度限制

Self-control 工具的寫入操作 SHALL 驗證內容長度。

#### Scenario: Profile/Agent 內容超限
- **WHEN** SDK 呼叫 `update_profile` 或 `update_agent_rules` 且 content 超過 50KB
- **THEN** 工具 handler MUST 拒絕操作，回傳 `{ error: "Content too large (max 50KB)" }`

#### Scenario: Skill 內容超限
- **WHEN** SDK 呼叫 `create_skill` 或 `update_skill` 且 content 超過 100KB
- **THEN** 工具 handler MUST 拒絕操作，回傳 `{ error: "Content too large (max 100KB)" }`

### Requirement: Per-Turn Prompt Reassembly

系統 SHALL 在每次 `startStream` 呼叫時重新從 disk 組合 system prompt，確保 self-control 工具的修改在下一輪生效。

#### Scenario: 每次 startStream 重新讀取
- **WHEN** `StreamManager.startStream()` 被呼叫
- **THEN** `PromptComposer.compose()` MUST 從 disk 重新讀取 PROFILE.md、AGENT.md、memory/preferences.md 等檔案，MUST NOT 使用快取

#### Scenario: 修改即時反映
- **WHEN** SDK 在 Turn N 修改了 PROFILE.md，Turn N+1 開始
- **THEN** Turn N+1 的 system prompt MUST 包含 Turn N 修改後的 PROFILE.md 內容
