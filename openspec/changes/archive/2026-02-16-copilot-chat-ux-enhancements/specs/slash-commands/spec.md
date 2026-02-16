## MODIFIED Requirements

### Requirement: 鍵盤導航與選取
SlashCommandMenu SHALL 支援鍵盤導航：Arrow Up/Down 移動高亮、Enter 或 Tab 選取高亮命令、Escape 關閉選單。

#### Scenario: Arrow Down 移動高亮
- **WHEN** slash menu 開啟且使用者按下 Arrow Down
- **THEN** 高亮位置向下移動一個選項

#### Scenario: Arrow Up 移動高亮
- **WHEN** slash menu 開啟且使用者按下 Arrow Up
- **THEN** 高亮位置向上移動一個選項

#### Scenario: Enter 選取命令
- **WHEN** slash menu 開啟且使用者按下 Enter
- **THEN** 系統 SHALL 選取當前高亮的命令

#### Scenario: Tab 選取命令
- **WHEN** slash menu 開啟且使用者按下 Tab
- **THEN** 系統 SHALL 選取當前高亮的命令（行為與 Enter 完全一致）

#### Scenario: Escape 關閉選單
- **WHEN** slash menu 開啟且使用者按下 Escape
- **THEN** 選單 SHALL 關閉，不選取任何命令

### Requirement: 命令分類顯示
SlashCommandMenu SHALL 將命令分為三個區段顯示：「命令」（builtin type）、「技能」（skill type）、「SDK」（sdk type）。

#### Scenario: 三區段分組
- **WHEN** 使用者輸入 `/` 開啟選單
- **THEN** 選單 MUST 依類型分三個區段，每個區段有標題 header
- **AND** 空區段 SHALL NOT 顯示

#### Scenario: 過濾跨區段
- **WHEN** 使用者輸入 `/test`
- **THEN** 所有三個區段中名稱包含 `test` 的命令都 SHALL 顯示

## ADDED Requirements

### Requirement: SDK command type 支援
SlashCommand 型別 SHALL 支援 `'sdk'` 作為第三種命令類型（alongside `'builtin'` 和 `'skill'`）。

#### Scenario: SDK command 選取行為
- **WHEN** 使用者選取一個 type 為 `'sdk'` 的命令
- **THEN** 系統 SHALL 將 `/<command-name> ` 插入輸入框（含尾隨空格）
- **AND** 使用者可繼續輸入參數
