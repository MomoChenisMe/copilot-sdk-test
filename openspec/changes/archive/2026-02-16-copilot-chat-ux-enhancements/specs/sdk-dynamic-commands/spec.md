## ADDED Requirements

### Requirement: 後端 SDK commands 列表端點
系統 SHALL 提供 `GET /api/copilot/commands` REST 端點，回傳 Copilot SDK 可用的 slash commands 清單。

#### Scenario: 成功取得 SDK commands
- **WHEN** 前端請求 `GET /api/copilot/commands`
- **THEN** 伺服器回傳 JSON 陣列，每個元素包含 `{ name: string, description: string }`
- **AND** HTTP 狀態碼為 200

#### Scenario: SDK 不支援命令列舉時的 fallback
- **WHEN** SDK API 無法列舉可用命令（API 不存在或回傳錯誤）
- **THEN** 伺服器 SHALL 使用靜態配置檔（或內建清單）作為 fallback
- **AND** 仍回傳 200 + commands 陣列

### Requirement: 前端載入並快取 SDK commands
系統 SHALL 在應用程式啟動時載入 SDK commands，並快取於 Zustand store 中。

#### Scenario: 啟動時載入 SDK commands
- **WHEN** 應用程式掛載（mount）
- **THEN** 系統 SHALL 呼叫 `GET /api/copilot/commands` 並將結果存入 store 的 `sdkCommands` 狀態

#### Scenario: API 呼叫失敗
- **WHEN** `GET /api/copilot/commands` 回傳錯誤
- **THEN** `sdkCommands` 設為空陣列，不影響其他功能

### Requirement: SlashCommandMenu 顯示 SDK commands 區段
系統 SHALL 在 slash command menu 中新增 SDK commands 區段，與 builtin commands 和 skills 並列顯示。

#### Scenario: 三區段顯示
- **WHEN** 使用者輸入 `/` 開啟 slash menu
- **THEN** menu MUST 顯示三個分區：「命令」（builtin）、「技能」（skills）、「SDK」（sdk commands）

#### Scenario: SDK command 選取行為
- **WHEN** 使用者選取一個 SDK command
- **THEN** 系統 SHALL 將 `/<command-name> ` 插入輸入框（含尾隨空格），允許繼續輸入參數

#### Scenario: SDK command 過濾
- **WHEN** 使用者輸入 `/hel`
- **THEN** SDK commands 區段僅顯示名稱包含 `hel` 的命令（case-insensitive）
