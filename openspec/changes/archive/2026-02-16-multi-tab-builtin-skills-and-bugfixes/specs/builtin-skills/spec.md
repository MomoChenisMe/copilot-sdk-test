## ADDED Requirements

### Requirement: BuiltinSkillStore 類別

系統 SHALL 提供 `BuiltinSkillStore` 類別，從原始碼目錄讀取內建系統技能。

#### Scenario: BuiltinSkillStore 初始化

- **WHEN** 後端服務啟動
- **THEN** 系統 MUST 建立 `BuiltinSkillStore` instance，根目錄為 `backend/src/skills/builtin/`（相對於模組位置）

#### Scenario: 列出內建技能

- **WHEN** 呼叫 `builtinStore.listSkills()`
- **THEN** 系統 MUST 回傳所有內建技能的 `{ name, description, content, builtin: true }` 陣列

#### Scenario: 讀取單一內建技能

- **WHEN** 呼叫 `builtinStore.readSkill(name)` 且該技能存在
- **THEN** 系統 MUST 回傳 `{ name, description, content, builtin: true }` 物件

#### Scenario: 讀取不存在的內建技能

- **WHEN** 呼叫 `builtinStore.readSkill(name)` 且該技能不存在
- **THEN** 系統 MUST 回傳 `null`

#### Scenario: 取得內建技能目錄路徑

- **WHEN** 呼叫 `builtinStore.getSkillDirectories()`
- **THEN** 系統 MUST 回傳所有內建技能子目錄的絕對路徑陣列

### Requirement: 內建技能清單

系統 SHALL 打包以下 8 個技能作為系統預設：

#### Scenario: 預載技能列表

- **WHEN** 系統列出內建技能
- **THEN** 系統 MUST 包含以下 8 個技能：
  1. `conventional-commit` — Git commit 訊息規範
  2. `openspec-workflow` — 結構化開發流程
  3. `skill-creator` — 技能建立輔助
  4. `ui-ux-pro-max` — UI/UX 設計智慧
  5. `frontend-design` — 前端介面設計
  6. `doc-coauthoring` — 文件協作撰寫
  7. `tdd-workflow` — 測試驅動開發流程
  8. `brainstorming` — 創意腦力激盪

#### Scenario: 技能目錄結構

- **WHEN** 內建技能目錄存在
- **THEN** 每個技能 MUST 為 `backend/src/skills/builtin/{name}/SKILL.md` 格式，包含 YAML frontmatter（name + description）和 Markdown body

### Requirement: 內建技能唯讀保護

系統 SHALL 禁止透過 API 修改或刪除內建技能。

#### Scenario: 拒絕更新內建技能

- **WHEN** 前端發送 `PUT /api/skills/:name` 且 `:name` 為內建技能名稱
- **THEN** 後端 MUST 回傳 HTTP 403 和 `{ error: "Cannot modify built-in skills" }`

#### Scenario: 拒絕刪除內建技能

- **WHEN** 前端發送 `DELETE /api/skills/:name` 且 `:name` 為內建技能名稱
- **THEN** 後端 MUST 回傳 HTTP 403 和 `{ error: "Cannot delete built-in skills" }`

#### Scenario: 允許建立同名使用者技能

- **WHEN** 前端發送 `PUT /api/skills/:name` 且 `:name` 與內建技能同名
- **THEN** 後端 MUST 回傳 HTTP 403，MUST NOT 允許覆蓋內建技能

### Requirement: API 合併回傳

系統 SHALL 在 Skills API 回傳中合併內建和使用者技能，並標記來源。

#### Scenario: 列出全部技能

- **WHEN** 前端發送 `GET /api/skills`
- **THEN** 後端 MUST 回傳 `{ skills: [...builtinSkills, ...userSkills] }`，每個 skill 物件包含 `builtin: boolean` 欄位，內建技能在前

#### Scenario: 讀取技能優先順序

- **WHEN** 前端發送 `GET /api/skills/:name`
- **THEN** 後端 MUST 優先查找 builtin，再查找 user，回傳 `{ name, description, content, builtin }` 或 404

### Requirement: SkillItem 介面更新

前端 `SkillItem` 介面 SHALL 新增 `builtin` 欄位。

#### Scenario: SkillItem 型別

- **WHEN** 前端定義 SkillItem 介面
- **THEN** 介面 MUST 為 `{ name: string; description: string; content: string; builtin: boolean }`

### Requirement: Skills Tab 分區顯示

前端 SkillsTab SHALL 將系統技能和使用者技能分開顯示。

#### Scenario: 系統技能區塊

- **WHEN** SkillsTab 渲染且有內建技能
- **THEN** 介面 MUST 在頂部顯示「系統技能」區塊，每個技能包含：toggle 開關、技能名稱、「System」標籤（badge）

#### Scenario: 系統技能唯讀

- **WHEN** 使用者展開系統技能
- **THEN** 介面 MUST 顯示 Markdown 預覽模式，MUST NOT 顯示 Edit 或 Delete 按鈕

#### Scenario: 使用者技能區塊

- **WHEN** SkillsTab 渲染且有使用者技能
- **THEN** 介面 MUST 在系統技能下方顯示「使用者技能」區塊，保留完整 CRUD 操作

#### Scenario: 停用系統技能

- **WHEN** 使用者關閉系統技能的 toggle
- **THEN** 系統 MUST 將該技能名稱加入 `disabledSkills` 陣列，下次 `copilot:send` 時傳遞

#### Scenario: 啟用已停用的系統技能

- **WHEN** 使用者開啟系統技能的 toggle
- **THEN** 系統 MUST 從 `disabledSkills` 陣列中移除該技能名稱

### Requirement: 內建技能 SDK 整合

系統 SHALL 將內建技能目錄和使用者技能目錄合併傳遞給 Copilot SDK。

#### Scenario: 合併 skillDirectories

- **WHEN** `StreamManager.startStream()` 被呼叫
- **THEN** 系統 MUST 將 `builtinStore.getSkillDirectories()` 和 `userStore.getSkillDirectories()` 合併，傳遞給 `sessionConfig.skillDirectories`

#### Scenario: 停用生效

- **WHEN** 使用者停用內建技能（如 `tdd-workflow`）
- **THEN** `disabledSkills` 陣列中包含 `'tdd-workflow'`，Copilot SDK MUST 忽略該技能

### Requirement: 內建技能 i18n

系統 SHALL 新增內建技能相關的 i18n 翻譯。

#### Scenario: 新增翻譯 key

- **WHEN** SkillsTab 渲染
- **THEN** 系統 MUST 支援以下 key：`settings.skills.system`（系統技能）、`settings.skills.user`（使用者技能）、`settings.skills.systemBadge`（System 標籤）、`settings.skills.cannotModifyBuiltin`（不可修改提示）
