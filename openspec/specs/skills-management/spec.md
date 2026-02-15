## Requirements

### Requirement: Skills 目錄結構

系統 SHALL 使用檔案系統管理 Skills，以 `data/skills/` 為根目錄，每個 skill 為一個子目錄，包含 `SKILL.md` 核心檔案。

#### Scenario: 目錄初始化

- **WHEN** 後端服務啟動
- **THEN** 系統 MUST 呼叫 `SkillFileStore.ensureDirectory()` 確保 `data/skills/` 目錄存在，使用 `fs.mkdirSync` 搭配 `{ recursive: true }`

#### Scenario: Skill 目錄結構

- **WHEN** 使用者建立一個名為 `code-review` 的 skill
- **THEN** 系統 MUST 建立 `data/skills/code-review/SKILL.md` 檔案

#### Scenario: 列出 Skills

- **WHEN** 系統列出所有 skills
- **THEN** 系統 MUST 掃描 `data/skills/` 下的所有子目錄，僅回傳包含 `SKILL.md` 檔案的目錄作為有效 skill

#### Scenario: 無 Skills 時

- **WHEN** `data/skills/` 目錄為空或不存在
- **THEN** 系統 MUST 回傳空陣列，MUST NOT 拋出錯誤

### Requirement: SkillFileStore CRUD 操作

系統 SHALL 提供 `SkillFileStore` class 管理 skill 的建立、讀取、更新和刪除。

#### Scenario: 讀取 Skill

- **WHEN** 呼叫 `readSkill(name)` 且該 skill 存在
- **THEN** 系統 MUST 回傳 `{ name: string, description: string, content: string }` 物件，`description` 從 SKILL.md 的 YAML frontmatter 解析

#### Scenario: 讀取不存在的 Skill

- **WHEN** 呼叫 `readSkill(name)` 且該 skill 不存在
- **THEN** 系統 MUST 回傳 `null`

#### Scenario: 寫入 Skill

- **WHEN** 呼叫 `writeSkill(name, content)`
- **THEN** 系統 MUST 建立 `data/skills/{name}/` 目錄（若不存在）並寫入 `SKILL.md` 檔案

#### Scenario: 刪除 Skill

- **WHEN** 呼叫 `deleteSkill(name)`
- **THEN** 系統 MUST 遞迴刪除 `data/skills/{name}/` 整個目錄，使用 `fs.rmSync` 搭配 `{ recursive: true, force: true }`

#### Scenario: 刪除不存在的 Skill

- **WHEN** 呼叫 `deleteSkill(name)` 但該 skill 不存在
- **THEN** 系統 MUST 靜默完成，MUST NOT 拋出錯誤

#### Scenario: 取得 Skill 目錄路徑

- **WHEN** 呼叫 `getSkillDirectories()`
- **THEN** 系統 MUST 回傳所有有效 skill 子目錄的絕對路徑陣列，供 SDK `skillDirectories` 參數使用

### Requirement: Skills REST API

系統 SHALL 提供 REST API 端點管理 skills，掛載於 `/api/skills`，需經過 `authMiddleware` 驗證。

#### Scenario: 列出所有 Skills

- **WHEN** 前端發送 `GET /api/skills`
- **THEN** 後端 MUST 回傳 `{ skills: Array<{ name: string; description: string; content: string }> }`，HTTP status 200

#### Scenario: 讀取單一 Skill

- **WHEN** 前端發送 `GET /api/skills/:name`
- **THEN** 後端 MUST 回傳 `{ name: string; description: string; content: string }`，HTTP status 200

#### Scenario: 讀取不存在的 Skill

- **WHEN** 前端發送 `GET /api/skills/:name` 但該 skill 不存在
- **THEN** 後端 MUST 回傳 HTTP status 404 和 `{ error: "Skill not found" }`

#### Scenario: 建立或更新 Skill

- **WHEN** 前端發送 `PUT /api/skills/:name` 帶有 `{ content: string }` body
- **THEN** 後端 MUST 將內容寫入 `data/skills/{name}/SKILL.md`，回傳 `{ ok: true }`，HTTP status 200

#### Scenario: 刪除 Skill

- **WHEN** 前端發送 `DELETE /api/skills/:name`
- **THEN** 後端 MUST 刪除 `data/skills/{name}/` 整個目錄，回傳 `{ ok: true }`，HTTP status 200

#### Scenario: 名稱安全驗證

- **WHEN** API 接收到 skill name 包含 `..`、`/`、`\` 或 null byte 字元
- **THEN** 系統 MUST 回傳 HTTP status 400 和 `{ error: "Invalid skill name" }`，重用 `sanitizeName()` from `prompts/file-store.ts`

### Requirement: Skills 與 Copilot SDK 整合

系統 SHALL 將 Skills 目錄路徑和停用列表傳遞給 Copilot SDK 的 `SessionConfig`。

#### Scenario: 傳遞 skillDirectories

- **WHEN** `StreamManager.startStream()` 被呼叫且 `SkillFileStore` 存在
- **THEN** 系統 MUST 呼叫 `skillStore.getSkillDirectories()` 取得所有 skill 目錄路徑，並設定 `sessionConfig.skillDirectories`

#### Scenario: 傳遞 disabledSkills

- **WHEN** 前端透過 WebSocket `copilot:send` 訊息包含 `disabledSkills` 陣列
- **THEN** 系統 MUST 將該陣列傳遞至 `sessionConfig.disabledSkills`

#### Scenario: 無 Skills 時

- **WHEN** `data/skills/` 目錄為空
- **THEN** 系統 MUST NOT 設定 `skillDirectories` 參數（或傳遞空陣列），SDK 行為不受影響

#### Scenario: disabledSkills 未提供時

- **WHEN** WebSocket 訊息不包含 `disabledSkills` 欄位
- **THEN** 系統 MUST 使用空陣列作為預設值

### Requirement: 前端 Skills Tab

系統 SHALL 在 SettingsPanel 提供「Skills」分頁，支援 skill 的完整管理。

#### Scenario: Skills 列表顯示

- **WHEN** 使用者開啟 Skills 分頁
- **THEN** 介面 MUST 顯示所有 skills 列表，每個 skill 包含：啟用/停用 toggle、skill 名稱（可展開）、刪除按鈕

#### Scenario: 空狀態

- **WHEN** 無任何 skill 存在
- **THEN** 介面 MUST 顯示空狀態提示訊息和「New Skill」按鈕

#### Scenario: Skill 啟用/停用

- **WHEN** 使用者切換 skill 的 toggle 開關
- **THEN** 系統 MUST 更新 Zustand store 中的 `disabledSkills: string[]` 陣列，停用時新增、啟用時移除

#### Scenario: disabledSkills 持久化

- **WHEN** `disabledSkills` 在 store 中變更
- **THEN** 系統 MUST 將 `disabledSkills` 同步寫入 `localStorage` key `'ai-terminal:disabledSkills'`，頁面重載時 MUST 從 localStorage 還原

#### Scenario: 建立新 Skill

- **WHEN** 使用者點擊「New Skill」按鈕
- **THEN** 介面 MUST 展開建立表單，包含：skill name 輸入框、content textarea、Create 按鈕

#### Scenario: 建立表單驗證

- **WHEN** 使用者在 name 輸入框中輸入空字串或包含特殊字元
- **THEN** 介面 MUST 阻止建立操作，顯示驗證錯誤提示

#### Scenario: 編輯 Skill

- **WHEN** 使用者點擊 skill 名稱
- **THEN** 介面 MUST 展開 textarea 編輯器，載入該 skill 的 SKILL.md 內容，底部有 Save 和 Preview 按鈕

#### Scenario: Markdown 預覽

- **WHEN** 使用者點擊 Preview 按鈕
- **THEN** 介面 MUST 將 textarea 切換為 markdown 渲染視圖，使用現有的 `Markdown` 元件

#### Scenario: 刪除 Skill 確認

- **WHEN** 使用者點擊刪除按鈕
- **THEN** 介面 MUST 顯示確認對話框，確認後呼叫 `DELETE /api/skills/:name`，更新列表

#### Scenario: 儲存回饋

- **WHEN** 使用者點擊 Save 按鈕且 API 呼叫成功
- **THEN** 介面 MUST 短暫顯示「已儲存」toast（2 秒後消失）

### Requirement: 前端傳送 Skills 狀態

系統 SHALL 在每次發送訊息時將 `disabledSkills` 和 `activePresets` 包含在 WebSocket 訊息中。

#### Scenario: sendMessage 包含 Skills 狀態

- **WHEN** `useCopilot.sendMessage()` 被呼叫
- **THEN** WebSocket 訊息 MUST 包含 `{ conversationId, prompt, activePresets, disabledSkills }`，從 Zustand store 取得

#### Scenario: 修復 activePresets 傳送

- **WHEN** `useCopilot.sendMessage()` 被呼叫
- **THEN** 訊息 MUST 包含 `activePresets`（修復現有的 bug——目前未傳送此欄位）

### Requirement: Skills 設定項

系統 SHALL 在 `config.ts` 新增 `skillsPath` 設定項。

#### Scenario: 預設路徑

- **WHEN** 未設定 `SKILLS_PATH` 環境變數
- **THEN** `skillsPath` MUST 預設為 `'./data/skills'`

#### Scenario: 自訂路徑

- **WHEN** 設定 `SKILLS_PATH` 環境變數為 `/custom/path`
- **THEN** `skillsPath` MUST 使用該自訂路徑
