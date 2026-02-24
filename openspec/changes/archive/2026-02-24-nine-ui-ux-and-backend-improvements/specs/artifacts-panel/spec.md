## MODIFIED Requirements

### Requirement: ArtifactsPanel 入口觸發方式

ArtifactsPanel 的開關 MUST 可透過 TopBar 的 Artifacts 按鈕觸發（新增入口）。原有的 inline artifact 卡片點擊觸發方式 MUST 保持不變。兩種入口 MUST 操作相同的 `artifactsPanelOpen` 狀態。

The panel MUST open regardless of whether the artifacts array is empty or not. The `artifacts.length > 0` check MUST be removed from the panel visibility condition in AppShell.

#### Scenario: 從 TopBar 按鈕開啟面板
- **WHEN** 使用者點擊 TopBar 的 Artifacts 按鈕
- **THEN** ArtifactsPanel 開啟，顯示當前 tab 的所有 artifacts

#### Scenario: 從 TopBar 按鈕開啟面板（無 artifacts）
- **WHEN** 使用者點擊 TopBar 的 Artifacts 按鈕
- **AND** 當前 tab 沒有任何 artifacts
- **THEN** ArtifactsPanel MUST open and display the empty state UI

#### Scenario: 從 inline artifact 卡片開啟面板
- **WHEN** 使用者在聊天訊息中點擊 artifact 卡片
- **THEN** ArtifactsPanel 開啟並聚焦到該 artifact（行為不變）

#### Scenario: 互斥面板邏輯
- **WHEN** OpenSpec panel 已開啟，使用者透過 TopBar 按鈕開啟 ArtifactsPanel
- **THEN** OpenSpec panel 自動關閉，ArtifactsPanel 開啟

## ADDED Requirements

### Requirement: ArtifactsPanel empty state

ArtifactsPanel SHALL display an empty state UI when no artifacts are available in the current tab.

#### Scenario: Empty state display

- **WHEN** ArtifactsPanel is open
- **AND** the artifacts array is empty
- **THEN** the panel content area MUST display a centered empty state with:
  - A muted icon (Package or FileText icon, size 28, opacity 40%)
  - Text message using i18n key `artifacts.empty` (en: "No artifacts yet" / zh-TW: "目前沒有 Artifacts")
- **AND** the panel header, close button, and footer MUST still be rendered normally

#### Scenario: Empty state disappears when artifacts arrive

- **WHEN** ArtifactsPanel is open showing the empty state
- **AND** a new artifact is added (e.g., from AI response)
- **THEN** the empty state MUST be replaced by the artifact content view

### Requirement: Artifacts empty state i18n keys

Translation files SHALL include keys for the artifacts empty state.

#### Scenario: i18n key completeness

- **WHEN** ArtifactsPanel empty state is rendered
- **THEN** translation files MUST include:
  - `artifacts.empty` — en: "No artifacts yet" / zh-TW: "目前沒有 Artifacts"
