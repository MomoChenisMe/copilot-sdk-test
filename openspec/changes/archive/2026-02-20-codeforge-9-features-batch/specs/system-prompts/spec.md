## MODIFIED Requirements

### Requirement: 預設系統提示詞模板

系統 SHALL 提供高品質的預設系統提示詞模板 `SYSTEM_PROMPT.md`，內容以 CodeForge 品牌識別為核心，涵蓋所有平台功能的使用指引。

#### Scenario: 首次初始化建立模板

- **WHEN** `ensureDirectories()` 被呼叫且 `data/prompts/SYSTEM_PROMPT.md` 不存在
- **THEN** 系統 MUST 以 `DEFAULT_SYSTEM_PROMPT` 常數內容建立該檔案

#### Scenario: 模板已存在時不覆蓋

- **WHEN** `ensureDirectories()` 被呼叫且 `data/prompts/SYSTEM_PROMPT.md` 已存在
- **THEN** 系統 MUST NOT 覆蓋現有檔案內容

#### Scenario: 預設模板常數 — 品牌識別

- **WHEN** `DEFAULT_SYSTEM_PROMPT` 常數被引用
- **THEN** 內容 MUST 為英文
- **AND** Identity & Role 段落 MUST 使用 "CodeForge" 作為產品名稱（取代舊版 "AI Terminal"）
- **AND** 內容 MUST NOT 包含 "AI Terminal" 字樣

#### Scenario: 預設模板常數 — 功能涵蓋範圍

- **WHEN** `DEFAULT_SYSTEM_PROMPT` 常數被引用
- **THEN** 內容 MUST 涵蓋以下功能區塊的使用指引：
  - Multi-tab 多分頁對話
  - Plan mode 規劃模式
  - Skills 技能系統
  - Cross-conversation memory 跨對話記憶
  - MCP (Model Context Protocol) 工具擴充
  - Artifacts 產出物預覽
  - Tasks 任務管理
  - Bash 終端執行模式
  - Web search 網頁搜尋

### Requirement: 專案層級 System Prompt

系統 SHALL 支援專案層級的 `.codeforge.md` 檔案，從目前工作目錄自動偵測並載入，同時向後相容舊版 `.ai-terminal.md` 檔案。

#### Scenario: 自動偵測 `.codeforge.md` 專案提示

- **WHEN** 使用者開啟對話且目前工作目錄（cwd）包含 `.codeforge.md` 檔案
- **THEN** PromptComposer MUST 讀取該檔案內容並納入 system prompt 組裝

#### Scenario: 向後相容 `.ai-terminal.md` fallback

- **WHEN** 目前工作目錄不包含 `.codeforge.md` 但包含 `.ai-terminal.md` 檔案
- **THEN** PromptComposer MUST 讀取 `.ai-terminal.md` 作為 fallback，納入 system prompt 組裝

#### Scenario: 兩個檔案皆存在時以新版為準

- **WHEN** 目前工作目錄同時包含 `.codeforge.md` 和 `.ai-terminal.md`
- **THEN** PromptComposer MUST 僅讀取 `.codeforge.md`，忽略 `.ai-terminal.md`

#### Scenario: 專案提示不存在

- **WHEN** 目前工作目錄不包含 `.codeforge.md` 也不包含 `.ai-terminal.md` 檔案
- **THEN** PromptComposer MUST 跳過專案層級提示，不拋出錯誤

#### Scenario: 專案提示讀取失敗

- **WHEN** `.codeforge.md` 或 `.ai-terminal.md` 檔案存在但因權限問題無法讀取
- **THEN** 系統 MUST 以 `console.warn` 記錄警告，繼續組裝其餘 prompt 部分，MUST NOT 中斷對話流程

### Requirement: PromptComposer 組裝邏輯

系統 SHALL 提供 `PromptComposer` 模組，負責按優先序組裝最終的 system prompt。

#### Scenario: 組裝順序

- **WHEN** PromptComposer 組裝 system prompt
- **THEN** 最終 prompt MUST 按以下順序串接各區段（以 `\n\n---\n\n` 分隔）：
  1. SYSTEM_PROMPT.md 內容（預設系統提示詞模板）
  2. PROFILE.md 內容（全域使用者設定）
  3. AGENT.md 內容（agent 規則）
  4. 已啟用的 presets 內容（按字母序）
  5. memory/preferences.md 內容（使用者偏好記憶）
  6. `.codeforge.md` 或 `.ai-terminal.md` 內容（專案層級提示，新版優先）

#### Scenario: 區段為空時跳過

- **WHEN** 任一區段的檔案內容為空字串或僅含空白
- **THEN** PromptComposer MUST 跳過該區段，不產生多餘的分隔線

#### Scenario: SDK 整合方式

- **WHEN** PromptComposer 組裝完成的 system prompt 傳遞給 Copilot SDK
- **THEN** 系統 MUST 使用 `systemMessage` 參數搭配 `mode: 'append'`，將組裝後的 prompt 附加到 SDK 預設的 system prompt 後方，MUST NOT 使用 `mode: 'replace'` 覆蓋 SDK 預設內容

#### Scenario: 所有區段為空

- **WHEN** 所有 prompt 區段檔案皆為空或不存在
- **THEN** PromptComposer MUST 回傳空字串，系統 MUST NOT 傳遞 `systemMessage` 參數給 SDK
