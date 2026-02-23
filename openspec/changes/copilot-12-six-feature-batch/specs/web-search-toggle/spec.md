## MODIFIED Requirements

### Requirement: Web Search 強制搜尋 Toggle 元件
系統 SHALL 提供 `WebSearchToggle` 元件，允許使用者在輸入框內部切換強制網路搜尋模式。

#### Scenario: Toggle 元件渲染位置（所有尺寸）
- **WHEN** Brave API Key 已設定（`webSearchAvailable === true`）且 tab 已建立
- **THEN** Toggle 按鈕 MUST 在 Input 元件的 leftActions 區域顯示（Clock 按鈕之後）
- **AND** MUST 在 desktop 和 mobile 都可見
- **AND** Desktop 底部工具列（bottom-toolbar-row）MUST 不再包含 WebSearchToggle

#### Scenario: Toggle 元件隱藏
- **WHEN** Brave API Key 未設定（`webSearchAvailable === false`）
- **THEN** leftActions 中 SHALL 不渲染 `WebSearchToggle` 元件

#### Scenario: Input 內部按鈕樣式
- **WHEN** WebSearchToggle 在 Input leftActions 中渲染
- **THEN** 按鈕 MUST 使用無邊框的 inline 樣式
- **AND** 啟用狀態 MUST 顯示 `text-accent` 高亮
- **AND** 未啟用狀態 MUST 顯示 `text-text-muted hover:text-text-primary`

#### Scenario: Toggle 啟用狀態樣式
- **WHEN** `webSearchForced === true`
- **THEN** 按鈕 MUST 顯示 accent 色高亮樣式

#### Scenario: Toggle 未啟用狀態樣式
- **WHEN** `webSearchForced === false`
- **THEN** 按鈕 MUST 顯示 muted 預設樣式

#### Scenario: Streaming 時停用
- **WHEN** 對話正在 streaming（`isStreaming === true`）
- **THEN** Toggle 按鈕 SHALL 設為 `disabled`，顯示半透明樣式
