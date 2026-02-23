## MODIFIED Requirements

### Requirement: ArtifactsPanel 入口觸發方式

ArtifactsPanel 的開關 MUST 可透過 TopBar 的 Artifacts 按鈕觸發（新增入口）。原有的 inline artifact 卡片點擊觸發方式 MUST 保持不變。兩種入口 MUST 操作相同的 `artifactsPanelOpen` 狀態。

#### Scenario: 從 TopBar 按鈕開啟面板
- **WHEN** 使用者點擊 TopBar 的 Artifacts 按鈕
- **THEN** ArtifactsPanel 開啟，顯示當前 tab 的所有 artifacts

#### Scenario: 從 inline artifact 卡片開啟面板
- **WHEN** 使用者在聊天訊息中點擊 artifact 卡片
- **THEN** ArtifactsPanel 開啟並聚焦到該 artifact（行為不變）

#### Scenario: 互斥面板邏輯
- **WHEN** OpenSpec panel 已開啟，使用者透過 TopBar 按鈕開啟 ArtifactsPanel
- **THEN** OpenSpec panel 自動關閉，ArtifactsPanel 開啟
