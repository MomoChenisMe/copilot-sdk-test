## ADDED Requirements

### Requirement: System Prompt 檔案結構

系統 SHALL 使用檔案系統管理 system prompt，以 `data/prompts/` 為根目錄，支援全域設定檔、agent 規則、預設集和專案層級提示。

#### Scenario: 目錄結構初始化

- **WHEN** 後端服務啟動
- **THEN** 系統 MUST 呼叫 `ensureDirectories()` 確保以下目錄結構存在：
  - `data/prompts/PROFILE.md`（全域使用者設定，若不存在則建立空檔）
  - `data/prompts/AGENT.md`（agent 專屬規則，若不存在則建立空檔）
  - `data/prompts/presets/`（預設集目錄）
  - `data/prompts/memory/`（記憶系統目錄，見 cross-conversation-memory spec）

#### Scenario: PROFILE.md 內容用途

- **WHEN** 使用者編輯 PROFILE.md
- **THEN** 該檔案 MUST 儲存全域使用者偏好資訊（如慣用語言、程式碼風格偏好、溝通風格等），此內容 SHALL 被注入每次對話的 system prompt

#### Scenario: AGENT.md 內容用途

- **WHEN** 使用者編輯 AGENT.md
- **THEN** 該檔案 MUST 儲存 agent 行為規則（如回答長度限制、角色設定、限制條件等），此內容 SHALL 被注入每次對話的 system prompt

#### Scenario: 預設集檔案

- **WHEN** 系統首次初始化 presets 目錄
- **THEN** 系統 MUST 建立以下內建預設集檔案（若不存在）：
  - `presets/code-review.md` — 程式碼審查情境的 system prompt
  - `presets/devops.md` — DevOps 操作情境的 system prompt
  - `presets/learning.md` — 學習輔助情境的 system prompt

#### Scenario: 自定義預設集

- **WHEN** 使用者透過 API 建立新的 preset
- **THEN** 系統 MUST 將檔案儲存至 `presets/{name}.md`，`name` 由使用者指定

### Requirement: 專案層級 System Prompt

系統 SHALL 支援專案層級的 `.ai-terminal.md` 檔案，從目前工作目錄自動偵測並載入。

#### Scenario: 自動偵測專案提示

- **WHEN** 使用者開啟對話且目前工作目錄（cwd）包含 `.ai-terminal.md` 檔案
- **THEN** PromptComposer MUST 讀取該檔案內容並納入 system prompt 組裝

#### Scenario: 專案提示不存在

- **WHEN** 目前工作目錄不包含 `.ai-terminal.md` 檔案
- **THEN** PromptComposer MUST 跳過專案層級提示，不拋出錯誤

#### Scenario: 專案提示讀取失敗

- **WHEN** `.ai-terminal.md` 檔案存在但因權限問題無法讀取
- **THEN** 系統 MUST 以 `console.warn` 記錄警告，繼續組裝其餘 prompt 部分，MUST NOT 中斷對話流程

### Requirement: PromptComposer 組裝邏輯

系統 SHALL 提供 `PromptComposer` 模組，負責按優先序組裝最終的 system prompt。

#### Scenario: 組裝順序

- **WHEN** PromptComposer 組裝 system prompt
- **THEN** 最終 prompt MUST 按以下順序串接各區段（以 `\n\n---\n\n` 分隔）：
  1. PROFILE.md 內容（全域使用者設定）
  2. AGENT.md 內容（agent 規則）
  3. 已啟用的 presets 內容（按字母序）
  4. memory/preferences.md 內容（使用者偏好記憶）
  5. `.ai-terminal.md` 內容（專案層級提示）

#### Scenario: 區段為空時跳過

- **WHEN** 任一區段的檔案內容為空字串或僅含空白
- **THEN** PromptComposer MUST 跳過該區段，不產生多餘的分隔線

#### Scenario: SDK 整合方式

- **WHEN** PromptComposer 組裝完成的 system prompt 傳遞給 Copilot SDK
- **THEN** 系統 MUST 使用 `systemMessage` 參數搭配 `mode: 'append'`，將組裝後的 prompt 附加到 SDK 預設的 system prompt 後方，MUST NOT 使用 `mode: 'replace'` 覆蓋 SDK 預設內容

#### Scenario: 所有區段為空

- **WHEN** 所有 prompt 區段檔案皆為空或不存在
- **THEN** PromptComposer MUST 回傳空字串，系統 MUST NOT 傳遞 `systemMessage` 參數給 SDK

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

#### Scenario: 列出所有 presets

- **WHEN** 前端發送 `GET /api/prompts/presets`
- **THEN** 後端 MUST 回傳 `{ presets: Array<{ name: string; content: string }> }`，列出 `presets/` 目錄下所有 `.md` 檔案，HTTP status 200

#### Scenario: 讀取單一 preset

- **WHEN** 前端發送 `GET /api/prompts/presets/:name`
- **THEN** 後端 MUST 回傳 `{ name: string; content: string }` 包含指定 preset 的內容，HTTP status 200

#### Scenario: 建立或更新 preset

- **WHEN** 前端發送 `PUT /api/prompts/presets/:name` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/prompts/presets/{name}.md`，回傳 HTTP status 200

#### Scenario: 刪除 preset

- **WHEN** 前端發送 `DELETE /api/prompts/presets/:name`
- **THEN** 後端 MUST 刪除 `data/prompts/presets/{name}.md` 檔案，回傳 HTTP status 200

#### Scenario: 不存在的 preset 讀取

- **WHEN** 前端發送 `GET /api/prompts/presets/:name` 但該 preset 檔案不存在
- **THEN** 後端 MUST 回傳 HTTP status 404 和 `{ error: "Preset not found" }`

### Requirement: 檔案名稱安全驗證

系統 SHALL 對所有 prompt 相關的檔案操作進行名稱安全驗證，防止 path traversal 攻擊。

#### Scenario: 正常檔案名稱

- **WHEN** API 接收到 preset name 為合法字串（如 `"code-review"`、`"my-custom-preset"`）
- **THEN** 系統 MUST 接受並正常處理

#### Scenario: Path traversal 攻擊防護

- **WHEN** API 接收到 preset name 包含 `..`、`/`、`\` 或 null byte 字元
- **THEN** 系統 MUST 回傳 HTTP status 400 和 `{ error: "Invalid preset name" }`，MUST NOT 存取預期目錄外的檔案

#### Scenario: 特殊字元清理

- **WHEN** API 接收到 preset name 包含空格或特殊字元
- **THEN** 系統 MUST 使用 sanitize 函式將名稱正規化為安全的檔案名稱（僅保留 `[a-zA-Z0-9_-]` 字元），其餘字元替換為 `-`

#### Scenario: 空名稱防護

- **WHEN** API 接收到空字串或僅含空白的 preset name
- **THEN** 系統 MUST 回傳 HTTP status 400 和 `{ error: "Invalid preset name" }`

### Requirement: 啟動時目錄確認

系統 SHALL 在後端服務啟動時確保所有必要的 prompt 目錄和預設檔案存在。

#### Scenario: ensureDirectories 啟動時呼叫

- **WHEN** 後端 server 啟動（`app.listen` 或等效初始化點）
- **THEN** 系統 MUST 在接受請求前呼叫 `ensureDirectories()`，使用 `fs.mkdir` 搭配 `{ recursive: true }` 建立所有必要目錄

#### Scenario: 目錄已存在

- **WHEN** `ensureDirectories()` 被呼叫但所有目錄皆已存在
- **THEN** 系統 MUST 靜默完成，不拋出錯誤，不覆蓋現有檔案

#### Scenario: 目錄建立失敗

- **WHEN** `ensureDirectories()` 因磁碟權限問題無法建立目錄
- **THEN** 系統 MUST 以 `console.error` 記錄錯誤並拋出例外，阻止服務啟動

### Requirement: 前端 SettingsPanel 介面

系統 SHALL 在前端提供 SettingsPanel 元件，以分頁介面管理 system prompt。

#### Scenario: TopBar 設定入口

- **WHEN** 使用者查看 TopBar
- **THEN** TopBar MUST 顯示 gear icon 按鈕（Lucide `Settings` icon），點擊後開啟 SettingsPanel overlay

#### Scenario: SettingsPanel 分頁結構

- **WHEN** SettingsPanel 開啟
- **THEN** 介面 MUST 顯示三個分頁：「Profile」、「Agent」、「Presets」，預設選中「Profile」分頁

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
