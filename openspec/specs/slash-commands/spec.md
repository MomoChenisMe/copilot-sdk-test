## ADDED Requirements

### Requirement: Slash Command 選單觸發

系統 SHALL 在聊天輸入框偵測到 "/" 字元且位於文字開頭時，顯示浮動的 slash command 選單。

#### Scenario: 輸入 "/" 觸發選單
- **WHEN** 使用者在空白輸入框中輸入 "/"
- **THEN** 系統 MUST 在輸入框上方顯示 SlashCommandMenu 浮動選單，列出所有可用命令

#### Scenario: 輸入 "/" 後繼續打字過濾
- **WHEN** 使用者輸入 "/set"
- **THEN** 選單 MUST 只顯示名稱或描述中匹配 "set" 的命令（大小寫不敏感）

#### Scenario: 非開頭的 "/" 不觸發
- **WHEN** 使用者在文字中間輸入 "/"（例如 "hello / world"）
- **THEN** 系統 MUST NOT 顯示 slash command 選單

#### Scenario: 清空輸入關閉選單
- **WHEN** 使用者刪除 "/" 使輸入框變空或文字不再以 "/" 開頭
- **THEN** 選單 MUST 立即關閉

#### Scenario: 無匹配結果
- **WHEN** 使用者輸入的 filter 文字無匹配任何命令
- **THEN** 選單 MUST 顯示「無匹配命令」提示文字

### Requirement: Slash Command 選單鍵盤導航

SlashCommandMenu SHALL 支援完整的鍵盤導航操作。

#### Scenario: 方向鍵選擇
- **WHEN** 選單顯示中，使用者按下 ArrowDown 或 ArrowUp
- **THEN** 選單 MUST 移動高亮選擇到下一個或上一個命令項目，並自動捲動使選中項可見

#### Scenario: Enter 確認選擇
- **WHEN** 選單顯示中且有高亮項目，使用者按下 Enter
- **THEN** 系統 MUST 執行該命令（內建命令直接執行，技能命令插入文字），選單 MUST 關閉

#### Scenario: Escape 關閉選單
- **WHEN** 選單顯示中，使用者按下 Escape
- **THEN** 選單 MUST 關閉，輸入框保留當前文字

#### Scenario: 點擊選單項目
- **WHEN** 使用者點擊選單中的某個命令項目
- **THEN** 系統 MUST 執行該命令，行為與 Enter 確認相同

### Requirement: 內建 Slash Commands

系統 SHALL 提供以下內建 slash commands。

#### Scenario: /clear 清除對話
- **WHEN** 使用者選取 `/clear` 命令
- **THEN** 系統 MUST 清除當前 Tab 的所有訊息和 streaming 狀態

#### Scenario: /settings 開啟設定
- **WHEN** 使用者選取 `/settings` 命令
- **THEN** 系統 MUST 開啟 SettingsPanel slide-over

#### Scenario: /new 新對話
- **WHEN** 使用者選取 `/new` 命令
- **THEN** 系統 MUST 建立新的 Tab 和對話，等同於點擊 Tab Bar 的 "+" 按鈕

### Requirement: Slash Command 選單分組顯示

SlashCommandMenu SHALL 將命令按類型分組顯示，以內建命令和技能兩個群組呈現。

#### Scenario: 分組標題顯示
- **WHEN** 選單包含內建命令和技能命令
- **THEN** 選單 MUST 以分組標題區分：「Commands」（內建）和「Skills」（技能），標題使用 `text-xs text-text-muted uppercase` 樣式

#### Scenario: 只有一個群組
- **WHEN** 過濾後只有一個群組有匹配結果
- **THEN** 選單 MUST 只顯示該群組，不顯示空群組

### Requirement: 技能作為 Slash Commands

系統 SHALL 將所有已啟用的技能自動註冊為 slash commands。

#### Scenario: 技能出現在選單中
- **WHEN** 使用者輸入 "/"
- **THEN** 選單的「Skills」群組 MUST 包含所有已啟用的技能（排除 `disabledSkills` 中的項目），每個項目顯示技能名稱和描述

#### Scenario: 選取技能命令
- **WHEN** 使用者選取一個技能命令（例如 `/brainstorming`）
- **THEN** 系統 MUST 將輸入框文字設為 `/brainstorming `（含尾部空格），游標定位在末尾，使用者可繼續輸入

#### Scenario: 技能被停用後消失
- **WHEN** 使用者在 SettingsPanel 停用某個技能
- **THEN** 該技能 MUST 立即從 slash command 選單中移除

#### Scenario: 新技能自動出現
- **WHEN** 使用者在 SettingsPanel 建立或啟用新技能
- **THEN** 該技能 MUST 在下次開啟選單時出現在列表中

### Requirement: Skills 快取

前端 SHALL 在應用啟動時從後端載入技能列表並快取到 Zustand store。

#### Scenario: 啟動時載入
- **WHEN** 應用程式啟動且使用者已認證
- **THEN** 系統 MUST 呼叫 `GET /api/skills` 並將結果存入 store 的 `skills: SkillItem[]`

#### Scenario: 快取供選單使用
- **WHEN** slash command 選單需要技能列表
- **THEN** 系統 MUST 從 Zustand store 讀取 `skills`，MUST NOT 每次開啟選單都重新 fetch

#### Scenario: 技能更新後重新載入
- **WHEN** 使用者在 SettingsPanel 建立、更新或刪除技能
- **THEN** 系統 MUST 重新 fetch `GET /api/skills` 並更新 store 中的 `skills`

### Requirement: Slash Command 選單 i18n

SlashCommandMenu 中的所有使用者可見文字 SHALL 支援 i18n 國際化。

#### Scenario: 英文介面
- **WHEN** 語言設為英文
- **THEN** 選單 MUST 使用英文顯示分組標題（"Commands"、"Skills"）、無結果提示（"No commands found"）

#### Scenario: 繁體中文介面
- **WHEN** 語言設為繁體中文
- **THEN** 選單 MUST 使用繁體中文顯示分組標題（「命令」、「技能」）、無結果提示（「找不到命令」）
