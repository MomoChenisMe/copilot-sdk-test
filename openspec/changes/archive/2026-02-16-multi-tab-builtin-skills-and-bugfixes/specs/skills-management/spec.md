## MODIFIED Requirements

### Requirement: Skills REST API

系統 SHALL 提供 REST API 端點管理 skills，掛載於 `/api/skills`，需經過 `authMiddleware` 驗證。API MUST 合併回傳 builtin 和 user skills，並保護 builtin skills 不被修改。

#### Scenario: 列出所有 Skills

- **WHEN** 前端發送 `GET /api/skills`
- **THEN** 後端 MUST 回傳 `{ skills: Array<{ name: string; description: string; content: string; builtin: boolean }> }`，builtin skills 在前，HTTP status 200

#### Scenario: 讀取單一 Skill

- **WHEN** 前端發送 `GET /api/skills/:name`
- **THEN** 後端 MUST 優先查找 builtin，再查找 user，回傳 `{ name: string; description: string; content: string; builtin: boolean }`，HTTP status 200

#### Scenario: 讀取不存在的 Skill

- **WHEN** 前端發送 `GET /api/skills/:name` 但該 skill 不存在（builtin 和 user 都無）
- **THEN** 後端 MUST 回傳 HTTP status 404 和 `{ error: "Skill not found" }`

#### Scenario: 建立或更新 User Skill

- **WHEN** 前端發送 `PUT /api/skills/:name` 帶有 `{ content: string }` body 且 `:name` 不是 builtin skill
- **THEN** 後端 MUST 將內容寫入 `data/skills/{name}/SKILL.md`，回傳 `{ ok: true }`，HTTP status 200

#### Scenario: 拒絕更新 Builtin Skill

- **WHEN** 前端發送 `PUT /api/skills/:name` 且 `:name` 為 builtin skill 名稱
- **THEN** 後端 MUST 回傳 HTTP status 403 和 `{ error: "Cannot modify built-in skills" }`

#### Scenario: 刪除 User Skill

- **WHEN** 前端發送 `DELETE /api/skills/:name` 且 `:name` 不是 builtin skill
- **THEN** 後端 MUST 刪除 `data/skills/{name}/` 整個目錄，回傳 `{ ok: true }`，HTTP status 200

#### Scenario: 拒絕刪除 Builtin Skill

- **WHEN** 前端發送 `DELETE /api/skills/:name` 且 `:name` 為 builtin skill 名稱
- **THEN** 後端 MUST 回傳 HTTP status 403 和 `{ error: "Cannot delete built-in skills" }`

#### Scenario: 名稱安全驗證

- **WHEN** API 接收到 skill name 包含 `..`、`/`、`\` 或 null byte 字元
- **THEN** 系統 MUST 回傳 HTTP status 400 和 `{ error: "Invalid skill name" }`，重用 `sanitizeName()` from `prompts/file-store.ts`

### Requirement: Skills 與 Copilot SDK 整合

系統 SHALL 將 builtin 和 user Skills 目錄路徑合併傳遞給 Copilot SDK 的 `SessionConfig`。

#### Scenario: 傳遞合併的 skillDirectories

- **WHEN** `StreamManager.startStream()` 被呼叫
- **THEN** 系統 MUST 合併 `builtinStore.getSkillDirectories()` 和 `userStore.getSkillDirectories()`，傳遞給 `sessionConfig.skillDirectories`

#### Scenario: 傳遞 disabledSkills

- **WHEN** 前端透過 WebSocket `copilot:send` 訊息包含 `disabledSkills` 陣列
- **THEN** 系統 MUST 將該陣列傳遞至 `sessionConfig.disabledSkills`，同時適用於 builtin 和 user skills

#### Scenario: 無 Skills 時

- **WHEN** builtin 和 user `data/skills/` 目錄都為空
- **THEN** 系統 MUST NOT 設定 `skillDirectories` 參數（或傳遞空陣列），SDK 行為不受影響

#### Scenario: disabledSkills 未提供時

- **WHEN** WebSocket 訊息不包含 `disabledSkills` 欄位
- **THEN** 系統 MUST 使用空陣列作為預設值

### Requirement: 前端 Skills Tab

系統 SHALL 在 SettingsPanel 提供「Skills」分頁，分系統技能和使用者技能兩區顯示。

#### Scenario: Skills 列表分區顯示

- **WHEN** 使用者開啟 Skills 分頁
- **THEN** 介面 MUST 分兩區顯示：頂部「系統技能」區（builtin skills，帶「System」badge），下方「使用者技能」區（user skills，帶完整 CRUD 操作）

#### Scenario: 系統技能唯讀

- **WHEN** 使用者展開系統技能
- **THEN** 介面 MUST 顯示 Markdown 預覽模式，MUST NOT 顯示 Edit 或 Delete 按鈕，僅保留 toggle 開關

#### Scenario: 空狀態

- **WHEN** 無任何 user skill 存在
- **THEN** 使用者技能區 MUST 顯示空狀態提示訊息和「New Skill」按鈕

#### Scenario: Skill 啟用/停用

- **WHEN** 使用者切換 skill 的 toggle 開關（builtin 或 user）
- **THEN** 系統 MUST 更新 Zustand store 中的 `disabledSkills: string[]` 陣列，停用時新增、啟用時移除

#### Scenario: disabledSkills 持久化

- **WHEN** `disabledSkills` 在 store 中變更
- **THEN** 系統 MUST 將 `disabledSkills` 同步寫入 `localStorage` key `'ai-terminal:disabledSkills'`，頁面重載時 MUST 從 localStorage 還原

#### Scenario: 建立新 User Skill

- **WHEN** 使用者點擊「New Skill」按鈕
- **THEN** 介面 MUST 展開建立表單，包含：skill name 輸入框、content textarea、Create 按鈕

#### Scenario: 建立表單驗證

- **WHEN** 使用者在 name 輸入框中輸入空字串或包含特殊字元
- **THEN** 介面 MUST 阻止建立操作，顯示驗證錯誤提示

#### Scenario: 編輯 User Skill

- **WHEN** 使用者點擊 user skill 名稱
- **THEN** 介面 MUST 展開 textarea 編輯器，載入該 skill 的 SKILL.md 內容，底部有 Save 和 Preview 按鈕

#### Scenario: Markdown 預覽

- **WHEN** 使用者點擊 Preview 按鈕
- **THEN** 介面 MUST 將 textarea 切換為 markdown 渲染視圖，使用現有的 `Markdown` 元件

#### Scenario: 刪除 User Skill 確認

- **WHEN** 使用者點擊刪除按鈕
- **THEN** 介面 MUST 顯示確認對話框，確認後呼叫 `DELETE /api/skills/:name`，更新列表

#### Scenario: 儲存回饋

- **WHEN** 使用者點擊 Save 按鈕且 API 呼叫成功
- **THEN** 介面 MUST 短暫顯示「已儲存」toast（2 秒後消失）
