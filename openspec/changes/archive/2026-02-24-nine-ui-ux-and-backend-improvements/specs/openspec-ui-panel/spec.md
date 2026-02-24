## ADDED Requirements

### Requirement: OpenSpec Settings tab

OpenSpec panel navigation SHALL include a "Settings" tab that contains the danger zone (Delete OpenSpec) and future configuration options.

#### Scenario: Settings tab visible in navigation

- **WHEN** user opens the OpenSpec panel and OpenSpec is found
- **THEN** a "Settings" tab MUST appear in the tab navigation bar (after "Archived")
- **AND** the tab label MUST use i18n key `openspecPanel.tabs.settings` (en: "Settings" / zh-TW: "設定")

#### Scenario: Settings tab content shows danger zone

- **WHEN** user clicks the "Settings" tab
- **THEN** the panel MUST display the danger zone section
- **AND** the danger zone MUST include a red-bordered card with warning text and "Delete OpenSpec" button
- **AND** clicking "Delete OpenSpec" MUST trigger the existing delete confirmation dialog (requiring "DELETE" input)

#### Scenario: Danger zone removed from Overview

- **WHEN** user views the Overview tab
- **THEN** the danger zone section MUST NOT be displayed in the Overview
- **AND** all other Overview content (stats, config display) MUST remain unchanged

### Requirement: Settings tab i18n keys

Translation files SHALL include keys for the OpenSpec Settings tab.

#### Scenario: i18n keys completeness

- **WHEN** the Settings tab is rendered
- **THEN** translation files MUST include:
  - `openspecPanel.tabs.settings` — en: "Settings" / zh-TW: "設定"

## MODIFIED Requirements

### Requirement: OpenSpec 總覽頁專案設定區塊佈局

OpenSpec 總覽頁（Overview tab）的「專案設定」卡片 MUST 使用 flex 佈局填滿面板剩餘的垂直空間，取代原有的 `max-h-64`（256px）固定高度。卡片內部的 header 和 tab 按鈕 MUST 為固定高度（`shrink-0`），內容區 MUST 為 `flex-1` 可捲動。OpenSpecPanel 的 content wrapper 在 overview tab MUST 使用 `overflow-hidden` 讓內部元件自行管理滾動。

「未找到 OpenSpec」狀態 MUST 新增「初始化 OpenSpec」按鈕（詳見 `openspec-init` spec）。

Overview tab MUST NOT contain the danger zone section. The danger zone MUST be located exclusively in the Settings tab.

#### Scenario: 專案設定卡片填滿剩餘空間

- **WHEN** 使用者開啟 OpenSpec 面板的總覽 tab
- **THEN** 專案設定卡片向下延伸填滿面板剩餘空間，內容可獨立捲動

#### Scenario: 無 config 時不顯示設定卡片

- **WHEN** 專案沒有 config.yaml
- **THEN** 總覽頁僅顯示統計數字區塊，不出現空白的設定卡片

#### Scenario: 設定內容可捲動

- **WHEN** 專案說明文字超過可見區域高度
- **THEN** 設定卡片的內容區域可獨立捲動，header 和 tab 按鈕固定不動

#### Scenario: 未找到 OpenSpec 時顯示初始化按鈕

- **WHEN** 指定 CWD 下未找到 openspec/ 目錄
- **THEN** 面板 MUST 顯示「初始化 OpenSpec」按鈕於空狀態提示下方

#### Scenario: Overview does not contain danger zone

- **WHEN** user views the Overview tab
- **THEN** no danger zone (delete button) MUST be present in the Overview content
