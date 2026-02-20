## MODIFIED Requirements

### Requirement: System Prompt 檔案結構

系統 SHALL 使用檔案系統管理 system prompt，以 `data/prompts/` 為根目錄，支援全域設定檔、agent 規則和專案層級提示。

#### Scenario: 目錄結構初始化

- **WHEN** 後端服務啟動
- **THEN** 系統 MUST 呼叫 `ensureDirectories()` 確保以下目錄結構存在：
  - `data/prompts/PROFILE.md`（全域使用者設定，若不存在則建立空檔）
  - `data/prompts/AGENT.md`（agent 專屬規則，若不存在則建立空檔）
  - `data/prompts/memory/`（記憶系統目錄）
- **AND** MUST NOT 建立 `data/prompts/presets/` 目錄

#### Scenario: PROFILE.md 內容用途

- **WHEN** 使用者編輯 PROFILE.md
- **THEN** 該檔案 MUST 儲存全域使用者偏好資訊，此內容 SHALL 被注入每次對話的 system prompt

#### Scenario: AGENT.md 內容用途

- **WHEN** 使用者編輯 AGENT.md
- **THEN** 該檔案 MUST 儲存 agent 行為規則，此內容 SHALL 被注入每次對話的 system prompt

### Requirement: PromptComposer 組裝邏輯

系統 SHALL 提供 `PromptComposer` 模組，負責按優先序組裝最終的 system prompt。

#### Scenario: 組裝順序

- **WHEN** PromptComposer 組裝 system prompt
- **THEN** 最終 prompt MUST 按以下順序串接各區段（以 `\n\n---\n\n` 分隔）：
  1. SYSTEM_PROMPT.md 內容（預設系統提示詞模板）
  2. PROFILE.md 內容（全域使用者設定）
  3. AGENT.md 內容（agent 規則）
  4. memory/preferences.md 內容（使用者偏好記憶）
  5. `.ai-terminal.md` 內容（專案層級提示）
- **AND** 組裝順序 MUST NOT 包含 presets 區段

#### Scenario: PromptComposer 函式簽名

- **WHEN** PromptComposer.compose() 被呼叫
- **THEN** 函式 MUST 接受 `cwd: string` 參數
- **AND** MUST NOT 接受 `activePresets` 參數

#### Scenario: 區段為空時跳過

- **WHEN** 任一區段的檔案內容為空字串或僅含空白
- **THEN** PromptComposer MUST 跳過該區段，不產生多餘的分隔線

#### Scenario: SDK 整合方式

- **WHEN** PromptComposer 組裝完成的 system prompt 傳遞給 Copilot SDK
- **THEN** 系統 MUST 使用 `systemMessage` 參數搭配 `mode: 'append'`

### Requirement: System Prompt REST API

系統 SHALL 提供 REST API 端點管理 system prompt 檔案。

#### Scenario: 讀取 profile prompt

- **WHEN** 前端發送 `GET /api/prompts/profile`
- **THEN** 後端 MUST 回傳 `{ content: string }` 包含 PROFILE.md 的檔案內容，HTTP status 200

#### Scenario: 更新 profile prompt

- **WHEN** 前端發送 `PUT /api/prompts/profile` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/prompts/PROFILE.md`，回傳 HTTP status 200

#### Scenario: 讀取 agent prompt

- **WHEN** 前端發送 `GET /api/prompts/agent`
- **THEN** 後端 MUST 回傳 `{ content: string }` 包含 AGENT.md 的檔案內容，HTTP status 200

#### Scenario: 更新 agent prompt

- **WHEN** 前端發送 `PUT /api/prompts/agent` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/prompts/AGENT.md`，回傳 HTTP status 200

## REMOVED Requirements

### Requirement: 預設集（Presets）檔案管理

**Reason**: 使用者決定不需要預設模板功能，移除以精簡系統。

**Migration**: 無遷移需求。`data/prompts/presets/` 目錄中的現有檔案可手動刪除。

### Requirement: 預設集 REST API

**Reason**: 隨預設集功能一同移除。

**Migration**: 以下 API 端點將被移除：
- `GET /api/prompts/presets`
- `GET /api/prompts/presets/:name`
- `PUT /api/prompts/presets/:name`
- `DELETE /api/prompts/presets/:name`
- `GET /api/prompts/presets/export`
- `POST /api/prompts/presets/import`

### Requirement: 前端 Presets 相關狀態

**Reason**: 隨預設集功能一同移除。

**Migration**: 移除 Zustand store 中的 `activePresets: string[]` 狀態、`togglePreset` action、以及 localStorage key `'ai-terminal:activePresets'` 的讀寫邏輯。WebSocket 訊息中的 `activePresets` 欄位也一同移除。

## Requirements
