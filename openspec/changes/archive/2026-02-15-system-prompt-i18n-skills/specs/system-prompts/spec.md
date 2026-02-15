## ADDED Requirements

### Requirement: 預設系統提示詞模板

系統 SHALL 提供高品質的預設系統提示詞模板 `SYSTEM_PROMPT.md`，涵蓋 Identity & Role、Safety & Ethics、Response Guidelines、Tool Usage、Workspace Context 五大區塊。

#### Scenario: 首次初始化建立模板

- **WHEN** `ensureDirectories()` 被呼叫且 `data/prompts/SYSTEM_PROMPT.md` 不存在
- **THEN** 系統 MUST 以 `DEFAULT_SYSTEM_PROMPT` 常數內容建立該檔案

#### Scenario: 模板已存在時不覆蓋

- **WHEN** `ensureDirectories()` 被呼叫且 `data/prompts/SYSTEM_PROMPT.md` 已存在
- **THEN** 系統 MUST NOT 覆蓋現有檔案內容

#### Scenario: 預設模板常數

- **WHEN** `DEFAULT_SYSTEM_PROMPT` 常數被引用
- **THEN** 內容 MUST 為英文，MUST 包含以下五個段落標題：Identity & Role、Safety & Ethics、Response Guidelines、Tool Usage、Workspace Context

### Requirement: 系統提示詞 REST API

系統 SHALL 提供 REST API 端點管理系統提示詞模板。

#### Scenario: 讀取系統提示詞

- **WHEN** 前端發送 `GET /api/prompts/system-prompt`
- **THEN** 後端 MUST 回傳 `{ content: string }` 包含 SYSTEM_PROMPT.md 的檔案內容，HTTP status 200

#### Scenario: 更新系統提示詞

- **WHEN** 前端發送 `PUT /api/prompts/system-prompt` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/prompts/SYSTEM_PROMPT.md`，回傳 `{ ok: true }`，HTTP status 200

#### Scenario: 重置為預設模板

- **WHEN** 前端發送 `POST /api/prompts/system-prompt/reset`
- **THEN** 後端 MUST 將 `SYSTEM_PROMPT.md` 內容覆寫為 `DEFAULT_SYSTEM_PROMPT`，回傳 `{ content: string }` 包含重置後的內容，HTTP status 200

### Requirement: 前端 System Prompt Tab

系統 SHALL 在 SettingsPanel 提供「System Prompt」分頁作為第一個 tab。

#### Scenario: System Prompt 分頁顯示

- **WHEN** SettingsPanel 開啟
- **THEN** tab 列表 MUST 以「System Prompt」為第一個分頁，後接 Profile、Agent、Presets、Memory、Skills

#### Scenario: 載入系統提示詞內容

- **WHEN** 使用者選擇「System Prompt」分頁
- **THEN** 介面 MUST 呼叫 `GET /api/prompts/system-prompt` 載入內容至 textarea 編輯器

#### Scenario: 儲存系統提示詞

- **WHEN** 使用者編輯內容並點擊 Save 按鈕
- **THEN** 介面 MUST 呼叫 `PUT /api/prompts/system-prompt`，成功後顯示「已儲存」toast

#### Scenario: 重置為預設

- **WHEN** 使用者點擊「Reset to Default」按鈕並確認
- **THEN** 介面 MUST 呼叫 `POST /api/prompts/system-prompt/reset`，以回傳的內容更新 textarea，顯示「已重置」toast

#### Scenario: 重置確認對話

- **WHEN** 使用者點擊「Reset to Default」按鈕
- **THEN** 介面 MUST 先顯示確認提示，避免誤操作覆蓋使用者已編輯的內容

## MODIFIED Requirements

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
  6. `.ai-terminal.md` 內容（專案層級提示）

#### Scenario: 區段為空時跳過

- **WHEN** 任一區段的檔案內容為空字串或僅含空白
- **THEN** PromptComposer MUST 跳過該區段，不產生多餘的分隔線

#### Scenario: SDK 整合方式

- **WHEN** PromptComposer 組裝完成的 system prompt 傳遞給 Copilot SDK
- **THEN** 系統 MUST 使用 `systemMessage` 參數搭配 `mode: 'append'`，將組裝後的 prompt 附加到 SDK 預設的 system prompt 後方，MUST NOT 使用 `mode: 'replace'` 覆蓋 SDK 預設內容

#### Scenario: 所有區段為空

- **WHEN** 所有 prompt 區段檔案皆為空或不存在
- **THEN** PromptComposer MUST 回傳空字串，系統 MUST NOT 傳遞 `systemMessage` 參數給 SDK

### Requirement: 前端 SettingsPanel 介面

系統 SHALL 在前端提供 SettingsPanel 元件，以分頁介面管理 system prompt。

#### Scenario: SettingsPanel 分頁結構

- **WHEN** SettingsPanel 開啟
- **THEN** 介面 MUST 顯示六個分頁：「System Prompt」、「Profile」、「Agent」、「Presets」、「Memory」、「Skills」，預設選中「System Prompt」分頁

#### Scenario: Tab 溢位處理

- **WHEN** Settings 面板在窄螢幕（< 360px）上顯示
- **THEN** Tab 容器 MUST 支援水平捲動（`overflow-x-auto`），每個 tab 按鈕 MUST 使用固定寬度（`shrink-0`）而非均分寬度

#### Scenario: TopBar 設定入口

- **WHEN** 使用者查看 TopBar
- **THEN** TopBar MUST 顯示 gear icon 按鈕（Lucide `Settings` icon），點擊後開啟 SettingsPanel overlay

#### Scenario: Profile 分頁

- **WHEN** 使用者選擇「Profile」分頁
- **THEN** 介面 MUST 顯示 textarea 編輯器載入 PROFILE.md 內容，底部有「儲存」按鈕，儲存時呼叫 `PUT /api/prompts/profile`

#### Scenario: Agent 分頁

- **WHEN** 使用者選擇「Agent」分頁
- **THEN** 介面 MUST 顯示 textarea 編輯器載入 AGENT.md 內容，底部有「儲存」按鈕，儲存時呼叫 `PUT /api/prompts/agent`

#### Scenario: Presets 分頁

- **WHEN** 使用者選擇「Presets」分頁
- **THEN** 介面 MUST 顯示所有 presets 的列表（名稱 + toggle 開關），每個 preset 可點擊展開編輯，底部有「新增 Preset」按鈕

#### Scenario: Preset toggle 啟用/停用

- **WHEN** 使用者切換 preset 的 toggle 開關
- **THEN** 系統 MUST 更新 Zustand store 中的 `activePresets: string[]` 陣列，新增或移除該 preset name

#### Scenario: activePresets 持久化

- **WHEN** `activePresets` 在 store 中變更
- **THEN** 系統 MUST 將 `activePresets` 同步寫入 `localStorage` key `'ai-terminal:activePresets'`，頁面重載時 MUST 從 localStorage 還原

#### Scenario: SettingsPanel 關閉

- **WHEN** 使用者點擊 SettingsPanel 外部區域或關閉按鈕
- **THEN** SettingsPanel overlay MUST 關閉並回到聊天介面

#### Scenario: 儲存成功回饋

- **WHEN** 使用者點擊「儲存」按鈕且 API 呼叫成功
- **THEN** 介面 MUST 短暫顯示「已儲存」toast 提示（2 秒後自動消失）

#### Scenario: 儲存失敗回饋

- **WHEN** 使用者點擊「儲存」按鈕但 API 呼叫失敗
- **THEN** 介面 MUST 顯示「儲存失敗」的 error toast，保留使用者編輯內容，不清除 textarea
