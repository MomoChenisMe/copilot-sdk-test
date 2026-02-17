## ADDED Requirements

### Requirement: 全域快捷鍵 Hook
系統 SHALL 透過單一 document keydown listener 提供全域快捷鍵支援。

#### Scenario: Tab 管理快捷鍵
- **WHEN** 使用者按 Cmd+T（或 Alt+T）
- **THEN** 系統 SHALL 建立新 tab

#### Scenario: 關閉 Tab
- **WHEN** 使用者按 Cmd+W（或 Alt+W）
- **THEN** 系統 SHALL 關閉目前 active tab

#### Scenario: 數字鍵切換 Tab
- **WHEN** 使用者按 Cmd+1 到 Cmd+9
- **THEN** 系統 SHALL 切換到對應序號的 tab

#### Scenario: 前後 Tab 切換
- **WHEN** 使用者按 Cmd+Shift+[ 或 Cmd+Shift+]
- **THEN** 系統 SHALL 切換到前一個或後一個 tab

#### Scenario: 模式切換
- **WHEN** 使用者按 Cmd+Shift+A 或 Cmd+Shift+B
- **THEN** active tab SHALL 切換到 AI mode 或 Bash mode

#### Scenario: 設定開啟
- **WHEN** 使用者按 Cmd+,
- **THEN** Settings panel SHALL 開啟

#### Scenario: 主題切換
- **WHEN** 使用者按 Cmd+Shift+D
- **THEN** 系統 SHALL toggle dark/light theme

#### Scenario: Input focus 中的快捷鍵
- **WHEN** 使用者 focus 在 textarea 中按快捷鍵
- **THEN** 全域 override 快捷鍵（如 Cmd+T）SHALL 仍然生效

### Requirement: 快捷鍵提示
UI 元素 SHALL 顯示對應的快捷鍵提示。

#### Scenario: Tooltip 顯示
- **WHEN** 使用者 hover 在有快捷鍵的按鈕上
- **THEN** tooltip SHALL 包含快捷鍵標示（如 "Cmd+T"）

### Requirement: 快捷鍵列表面板
系統 SHALL 提供可查閱的快捷鍵列表。

#### Scenario: 開啟快捷鍵面板
- **WHEN** 使用者按 ? 鍵（非在 input focus 中）
- **THEN** 系統 SHALL 顯示完整快捷鍵列表面板
