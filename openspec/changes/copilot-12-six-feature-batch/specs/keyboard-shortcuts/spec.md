## ADDED Requirements

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

### Requirement: OpenSpec 面板切換快捷鍵
系統 SHALL 提供 Alt+O 全域快捷鍵來切換 OpenSpec 面板。

#### Scenario: 開啟面板
- **WHEN** OpenSpec 已啟用且面板關閉時使用者按 Alt+O
- **THEN** 面板 MUST 開啟

#### Scenario: 關閉面板
- **WHEN** 面板已開啟且使用者按 Alt+O
- **THEN** 面板 MUST 關閉

#### Scenario: OpenSpec 未啟用時不動作
- **WHEN** OpenSpec 未啟用且使用者按 Alt+O
- **THEN** 系統 MUST 不執行任何操作

### Requirement: 快捷鍵列表更新
SHORTCUT_DEFINITIONS SHALL 包含新增的快捷鍵。

#### Scenario: 快捷鍵面板顯示 Shift+Tab
- **WHEN** 使用者開啟快捷鍵面板
- **THEN** 列表 MUST 包含 `⇧ Tab` — "Toggle Plan/Act Mode"

#### Scenario: 快捷鍵面板顯示 Alt+O
- **WHEN** 使用者開啟快捷鍵面板
- **THEN** 列表 MUST 包含 `⌥ O` — "Toggle OpenSpec Panel"
