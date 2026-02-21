## MODIFIED Requirements

### Requirement: DirectoryPicker 響應式寬度

DirectoryPicker 的彈出面板 MUST 使用響應式最大寬度，確保在小螢幕上不溢出。
面板寬度 MUST 為 `min(320px, 100vw - 2rem)`。

#### Scenario: 桌面螢幕顯示

- **WHEN** 螢幕寬度 >= 375px
- **THEN** DirectoryPicker 面板寬度為 320px (w-80)

#### Scenario: 小螢幕顯示

- **WHEN** 螢幕寬度為 320px
- **THEN** DirectoryPicker 面板寬度為 320 - 32 = 288px，不溢出螢幕右邊

### Requirement: ConversationPopover 視窗邊界檢測

ConversationPopover（新增頁籤下拉選單）MUST 在定位時進行 viewport boundary 檢測。
若 popover 的 `left + width` 超過 `viewportWidth - 16px`，MUST 自動調整 left 值。
Popover MUST 加入 `max-width: calc(100vw - 2rem)` 限制。

#### Scenario: Popover 超出右邊界

- **WHEN** anchor 元素位於螢幕右側，使 popover 的計算位置超出 viewport 右邊
- **THEN** popover 的 left 被調整為 `viewportWidth - popoverWidth - 16px`

#### Scenario: Popover 正常顯示

- **WHEN** anchor 元素位於螢幕左側，popover 完全在 viewport 內
- **THEN** popover 正常定位於 anchor 下方

### Requirement: ModelSelector 下拉選單響應式

ModelSelector 的下拉選單 MUST 使用響應式最大寬度 `min(20rem, calc(100vw - 2rem))`。
最小寬度 MUST 為 `min-w-48`（從 min-w-64 縮減）。

#### Scenario: 手機螢幕

- **WHEN** 螢幕寬度為 375px
- **THEN** ModelSelector 下拉選單寬度不超過 375 - 32 = 343px

#### Scenario: 桌面螢幕

- **WHEN** 螢幕寬度 >= 768px
- **THEN** ModelSelector 下拉選單寬度最多 320px (20rem)
