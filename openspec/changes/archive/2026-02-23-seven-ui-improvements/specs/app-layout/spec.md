## ADDED Requirements

### Requirement: TopBar 按鈕 SHALL 顯示 Tooltip

TopBar 中所有圖示按鈕（Keyboard shortcuts、OpenSpec、Artifacts、Settings、Theme toggle）MUST 使用現有的 `Tooltip` 元件包裹，在使用者 hover 時顯示對應的 i18n 文字標籤。Tooltip 位置 MUST 為 `bottom`（因按鈕在畫面頂部）。ConnectionBadge 元件本身已有 tooltip 機制，不需額外包裹。

#### Scenario: 使用者 hover TopBar 按鈕時看到 tooltip
- **WHEN** 使用者將游標懸停在 TopBar 的任一圖示按鈕上超過 300ms
- **THEN** 按鈕下方顯示對應的文字標籤 tooltip（如「Settings」、「OpenSpec」）

#### Scenario: ConnectionBadge 不重複包裹 tooltip
- **WHEN** 使用者將游標懸停在 ConnectionBadge 上
- **THEN** 顯示 ConnectionBadge 自身的 tooltip，不出現重複的 tooltip

### Requirement: TopBar SHALL 包含 Artifacts 側邊欄按鈕

TopBar 右側按鈕群組 MUST 包含一個 Artifacts 按鈕，使用 `PanelRight` icon（lucide-react）。按鈕 MUST 放在 OpenSpec 按鈕和 Settings 按鈕之間。點擊按鈕 MUST toggle ArtifactsPanel 的開關狀態。

#### Scenario: 點擊按鈕開啟 ArtifactsPanel
- **WHEN** 使用者點擊 TopBar 的 Artifacts 按鈕且 ArtifactsPanel 目前關閉
- **THEN** ArtifactsPanel 開啟，OpenSpec panel 自動關閉（互斥邏輯）

#### Scenario: 點擊按鈕關閉 ArtifactsPanel
- **WHEN** 使用者點擊 TopBar 的 Artifacts 按鈕且 ArtifactsPanel 目前開啟
- **THEN** ArtifactsPanel 關閉

#### Scenario: 無 active tab 時不顯示按鈕
- **WHEN** 目前沒有 active tab（例如 welcome 畫面）
- **THEN** Artifacts 按鈕不渲染

### Requirement: Artifacts 按鈕 SHALL 顯示數量徽章

當 active tab 有 artifact 時，Artifacts 按鈕 MUST 在右上角顯示數量徽章。數量超過 9 時 MUST 顯示 `9+`。數量為 0 時 MUST 不顯示徽章。

#### Scenario: 有 3 個 artifacts 時顯示數字 3
- **WHEN** active tab 有 3 個 artifacts
- **THEN** Artifacts 按鈕右上角顯示圓形徽章，內容為 `3`

#### Scenario: 有 15 個 artifacts 時顯示 9+
- **WHEN** active tab 有 15 個 artifacts
- **THEN** 徽章顯示 `9+`

#### Scenario: 無 artifact 時不顯示徽章
- **WHEN** active tab 有 0 個 artifacts
- **THEN** 不顯示任何徽章
