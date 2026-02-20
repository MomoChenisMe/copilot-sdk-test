## ADDED Requirements

### Requirement: 技能操作後同步全局 Store

SkillsTab 中的技能操作（新增、編輯、刪除、安裝）SHALL 在完成後同步更新全局 Zustand store 的 `skills` 陣列。

#### Scenario: 新增技能後同步

- **WHEN** 使用者在 SettingsPanel 中透過手動建立新技能且 API 呼叫成功
- **THEN** SkillsTab MUST 呼叫 `useAppStore.getState().setSkills(updatedSkills)` 同步全局 store
- **AND** ChatView 的 slash command 下拉框 MUST 立即顯示新技能

#### Scenario: 編輯技能後同步

- **WHEN** 使用者在 SettingsPanel 中編輯技能描述或內容且 API 呼叫成功
- **THEN** SkillsTab MUST 同步全局 store 中對應技能的資料

#### Scenario: 刪除技能後同步

- **WHEN** 使用者在 SettingsPanel 中刪除技能且 API 呼叫成功
- **THEN** SkillsTab MUST 從全局 store 中移除該技能
- **AND** ChatView 的 slash command 下拉框 MUST 立即不再顯示該技能

#### Scenario: ZIP/URL 安裝後同步

- **WHEN** 使用者透過 ZIP 上傳或 URL 安裝技能且安裝成功
- **THEN** SkillsTab 的 `refreshSkills()` MUST 在更新本地 state 後也更新全局 store

#### Scenario: API 失敗不同步

- **WHEN** 技能操作的 API 呼叫失敗
- **THEN** SkillsTab MUST NOT 更新全局 store
- **AND** MUST 保持全局 store 中原有的技能資料
