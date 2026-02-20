## ADDED Requirements

### Requirement: Mid-text Slash Command
Slash command 選單 SHALL 可在文字後的任意位置透過 `/` 觸發。

#### Scenario: 文字後觸發
- **WHEN** 使用者輸入 "hello /cl"
- **THEN** slash command 選單 SHALL 出現並過濾顯示匹配 "cl" 的命令

#### Scenario: URL 不觸發
- **WHEN** 使用者輸入 "https://example.com"
- **THEN** slash command 選單 SHALL 不出現（`/` 前面不是空格或行首）

#### Scenario: 選擇命令後插入
- **WHEN** 使用者在 "hello /cl" 狀態選擇 /clear
- **THEN** builtin command SHALL 被觸發，"hello " 保留在輸入框

### Requirement: IME Composition 防護
輸入法組字期間 SHALL 不觸發任何鍵盤快捷行為。

#### Scenario: 組字中按 Enter
- **WHEN** 使用者在 IME 組字中按 Enter
- **THEN** 系統 SHALL 不發送訊息，Enter 僅用於確認 IME 輸入

#### Scenario: 組字中按 Arrow 鍵
- **WHEN** 使用者在 IME 組字中按 ArrowDown/ArrowUp
- **THEN** 系統 SHALL 不操作 slash command menu navigation

#### Scenario: 組字結束後正常操作
- **WHEN** IME 組字完成（isComposing === false）
- **THEN** 後續 Enter SHALL 正常發送訊息

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
