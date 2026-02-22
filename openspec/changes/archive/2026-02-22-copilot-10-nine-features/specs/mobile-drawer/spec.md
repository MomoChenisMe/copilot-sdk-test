## ADDED Requirements

### Requirement: MobileDrawer 抽屜元件

系統 SHALL 提供 MobileDrawer 元件，在手機寬度（< md breakpoint）時以左側滑入抽屜顯示 tab 列表與對話管理。

#### Scenario: 抽屜開啟動畫

- **WHEN** `open` prop 為 true
- **THEN** 抽屜面板 MUST 從左側滑入（`translateX(0)`）
- **AND** 背景 overlay MUST 顯示為半透明黑色（`bg-black/50`）
- **AND** 面板寬度 MUST 為 `w-72`（288px）

#### Scenario: 抽屜關閉動畫

- **WHEN** `open` prop 變為 false
- **THEN** 抽屜面板 MUST 滑出到左側（`-translateX-full`）
- **AND** 背景 overlay MUST 淡出

#### Scenario: 點擊 backdrop 關閉

- **WHEN** 抽屜開啟狀態
- **AND** 使用者點擊背景 overlay
- **THEN** 抽屜 MUST 呼叫 `onClose` callback

#### Scenario: 抽屜內容

- **WHEN** 抽屜開啟
- **THEN** MUST 顯示以下內容：
  - 所有 tab 的垂直列表（標題 + active 標示）
  - 新增 tab 按鈕
  - 對話搜尋功能

#### Scenario: 選取 tab 後自動關閉

- **WHEN** 使用者在抽屜中點擊一個 tab
- **THEN** 系統 MUST 切換到該 tab
- **AND** 抽屜 MUST 自動關閉

### Requirement: 手機版隱藏 TabBar

在手機寬度（< md breakpoint）時，系統 SHALL 隱藏桌面版水平 TabBar，改用 MobileDrawer。

#### Scenario: 手機版不顯示 TabBar

- **WHEN** 螢幕寬度 < 768px
- **THEN** 水平 TabBar MUST 隱藏（`hidden md:block`）

#### Scenario: 桌面版正常顯示 TabBar

- **WHEN** 螢幕寬度 >= 768px
- **THEN** 水平 TabBar MUST 正常顯示
- **AND** MobileDrawer 的 hamburger 按鈕 MUST 隱藏

### Requirement: TopBar Hamburger 按鈕

TopBar SHALL 在手機寬度時顯示 hamburger 選單按鈕，用於開啟 MobileDrawer。

#### Scenario: 手機版顯示 hamburger

- **WHEN** 螢幕寬度 < 768px
- **THEN** TopBar 左側 MUST 顯示 Menu icon 按鈕
- **AND** 按鈕 MUST 只在手機版可見（`md:hidden`）

#### Scenario: 點擊 hamburger 開啟抽屜

- **WHEN** 使用者點擊 hamburger 按鈕
- **THEN** MobileDrawer MUST 開啟

#### Scenario: 桌面版不顯示 hamburger

- **WHEN** 螢幕寬度 >= 768px
- **THEN** hamburger 按鈕 MUST 隱藏
