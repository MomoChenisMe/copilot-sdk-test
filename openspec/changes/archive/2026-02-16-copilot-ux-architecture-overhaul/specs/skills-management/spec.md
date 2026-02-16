## ADDED Requirements

### Requirement: 前端 Skills 快取

前端 Zustand store SHALL 在應用啟動時從後端載入技能列表並快取，供 slash command 選單和其他元件使用。

#### Scenario: 啟動時載入 Skills
- **WHEN** 應用程式啟動且使用者已認證
- **THEN** 系統 MUST 呼叫 `GET /api/skills` 並將結果存入 store 的 `skills: SkillItem[]`，設定 `skillsLoaded: true`

#### Scenario: Skills 載入中
- **WHEN** skills 尚未載入完成
- **THEN** `skillsLoaded` MUST 為 `false`，依賴 skills 的 UI（如 slash command 選單的技能區段）MUST 顯示載入中或空狀態

#### Scenario: SettingsPanel 操作後重新載入
- **WHEN** 使用者在 SettingsPanel 建立、更新或刪除技能
- **THEN** 系統 MUST 重新呼叫 `GET /api/skills` 更新 store 中的 `skills` 快取

#### Scenario: disabledSkills 過濾
- **WHEN** slash command 選單需要已啟用的技能列表
- **THEN** 系統 MUST 從 store.skills 中排除 store.disabledSkills 包含的技能名稱

### Requirement: Skills 作為 Slash Commands 可呼叫

每個已啟用的技能 SHALL 可透過 slash command 選單呼叫。

#### Scenario: 技能顯示在 slash command 選單
- **WHEN** slash command 選單顯示
- **THEN** 選單的「Skills」群組 MUST 包含所有已啟用的技能（name + description）

#### Scenario: 選取技能命令插入文字
- **WHEN** 使用者在 slash command 選單中選取技能
- **THEN** 輸入框文字 MUST 設為 `/skill-name `（尾部含空格），游標定位在末尾

#### Scenario: 技能啟停即時反映
- **WHEN** 使用者在 SettingsPanel 切換技能的啟用/停用
- **THEN** 下次開啟 slash command 選單時，該技能 MUST 根據最新狀態顯示或隱藏
