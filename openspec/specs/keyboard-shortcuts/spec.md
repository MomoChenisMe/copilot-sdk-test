## MODIFIED Requirements

### Requirement: Plan/Act 模式切換快捷鍵

系統 SHALL 提供 Shift+Tab 全域快捷鍵來切換 Plan/Act 模式。

#### Scenario: 切換到 Plan 模式

- **WHEN** 使用者在 Act 模式下按 Shift+Tab
- **THEN** active tab 的 `planMode` MUST 切換為 `true`

#### Scenario: 切換到 Act 模式

- **WHEN** 使用者在 Plan 模式下按 Shift+Tab
- **THEN** active tab 的 `planMode` MUST 切換為 `false`

#### Scenario: Streaming 中不可切換

- **WHEN** 對話正在 streaming 且使用者按 Shift+Tab
- **THEN** 系統 MUST 忽略該快捷鍵，`planMode` 不變

#### Scenario: 無 active tab 時不執行

- **WHEN** 沒有 active tab（如歡迎畫面）且使用者按 Shift+Tab
- **THEN** 系統 MUST 不執行任何操作

#### Scenario: 阻止瀏覽器預設行為

- **WHEN** 使用者按 Shift+Tab
- **THEN** 系統 MUST 呼叫 `e.preventDefault()` 阻止瀏覽器焦點導航

#### Scenario: Terminal 模式下不可切換 Plan

- **WHEN** active tab 處於 terminal 模式且使用者按 Shift+Tab
- **THEN** 系統 MUST 忽略該快捷鍵，`planMode` 不變

### Requirement: 快捷鍵列表更新

SHORTCUT_DEFINITIONS SHALL 包含所有快捷鍵定義。

#### Scenario: 快捷鍵面板顯示 Shift+Tab

- **WHEN** 使用者開啟快捷鍵面板
- **THEN** 列表 MUST 包含 `⇧ Tab` — "Toggle Plan/Act Mode"

#### Scenario: 快捷鍵面板顯示 Alt+O

- **WHEN** 使用者開啟快捷鍵面板
- **THEN** 列表 MUST 包含 `⌥ O` — "Toggle OpenSpec Panel"

#### Scenario: 快捷鍵面板顯示 Cmd/Ctrl+Shift+Tab

- **WHEN** 使用者開啟快捷鍵面板
- **THEN** 列表 MUST 包含 `⌘/⌃ ⇧ Tab` — "Toggle AI/Bash Mode"

## REMOVED Requirements

### Requirement: AI/Bash 模式獨立快捷鍵

**Reason**: 使用者要求將 AI 和 Bash 模式切換合併為單一 toggle 快捷鍵 Cmd/Ctrl+Shift+Tab，移除分離的 Alt+Shift+A（AI 模式）和 Alt+Shift+B（Bash 模式）。
**Migration**: 使用 Cmd/Ctrl+Shift+Tab 在兩個模式間切換。

## ADDED Requirements

### Requirement: AI/Bash 模式 toggle 快捷鍵

系統 SHALL 提供 Cmd/Ctrl+Shift+Tab 全域快捷鍵來切換 AI（copilot）和 Bash（terminal）模式。

#### Scenario: 從 AI 模式切換到 Bash 模式

- **WHEN** active tab 處於 copilot 模式且使用者按 Cmd/Ctrl+Shift+Tab
- **THEN** active tab 的 `mode` MUST 切換為 `terminal`

#### Scenario: 從 Bash 模式切換到 AI 模式

- **WHEN** active tab 處於 terminal 模式且使用者按 Cmd/Ctrl+Shift+Tab
- **THEN** active tab 的 `mode` MUST 切換為 `copilot`

#### Scenario: 無 active tab 時不執行

- **WHEN** 沒有 active tab 且使用者按 Cmd/Ctrl+Shift+Tab
- **THEN** 系統 MUST 不執行任何操作

#### Scenario: 阻止瀏覽器預設行為

- **WHEN** 使用者按 Cmd/Ctrl+Shift+Tab
- **THEN** 系統 MUST 呼叫 `e.preventDefault()` 阻止瀏覽器預設行為

#### Scenario: 優先於 Shift+Tab handler

- **WHEN** 使用者按 Cmd/Ctrl+Shift+Tab
- **THEN** 系統 MUST 優先匹配此 handler（含 ctrlKey/metaKey），而非 Shift+Tab 的 Plan toggle handler
