## ADDED Requirements

### Requirement: Slash Command 雙行佈局

Slash command 下拉選單中的每個項目 SHALL 採用雙行堆疊佈局：第一行為指令名稱，第二行為描述文字。

#### Scenario: 名稱完整顯示

- **WHEN** slash command 選單顯示時
- **THEN** 每個項目的指令名稱（如 `/conventional-commit`）MUST 完整顯示在第一行，不截斷
- **AND** 名稱 MUST 使用 `text-sm font-medium` 樣式

#### Scenario: 描述換行顯示

- **WHEN** slash command 選單顯示時
- **THEN** 描述文字 MUST 顯示在第二行
- **AND** 描述 MUST 使用 `text-xs text-text-muted` 樣式
- **AND** 描述最多顯示 2 行（`line-clamp-2`），超出部分省略

#### Scenario: 選單尺寸調整

- **WHEN** slash command 選單顯示時
- **THEN** 選單寬度 MUST 為 `w-80`（從 `w-72` 增加）
- **AND** 最大高度 MUST 為 `max-h-72`（從 `max-h-60` 增加）

### Requirement: 使用者技能分區顯示

Slash command 下拉選單中的技能 SHALL 分為「系統技能」和「使用者技能」兩個獨立 section 顯示。

#### Scenario: 系統技能 section

- **WHEN** 存在 `builtin === true` 的技能
- **THEN** 下拉選單 MUST 顯示「系統技能」section header
- **AND** 該 section 下 MUST 列出所有 builtin 技能

#### Scenario: 使用者技能 section

- **WHEN** 存在 `builtin === false` 的技能
- **THEN** 下拉選單 MUST 顯示「使用者技能」section header
- **AND** 該 section 下 MUST 列出所有 user 技能

#### Scenario: 僅有系統技能

- **WHEN** 沒有任何 `builtin === false` 的技能
- **THEN** 下拉選單 MUST NOT 顯示「使用者技能」section header

#### Scenario: SlashCommand 介面擴充

- **WHEN** ChatView 組裝 slashCommands 陣列
- **THEN** 每個技能類型的 SlashCommand MUST 包含 `builtin` 欄位
- **AND** `builtin` 值 MUST 對應技能的 `builtin` 屬性
