## ADDED Requirements

### Requirement: Split layout 支援

AppShell 主內容區域 SHALL 支援 side-by-side flex layout，使 ChatView 與 ArtifactsPanel 可並排顯示。

#### Scenario: Flex layout 容器

- WHEN AppShell 渲染主內容區域
- THEN 容器 SHALL 使用 `display: flex` 與 `flex-direction: row` 佈局
- AND 容器 SHALL 佔滿 TopBar 與 TabBar 之間的剩餘空間

#### Scenario: 僅 ChatView 時的佈局

- WHEN ArtifactsPanel 未開啟
- THEN ChatView SHALL 使用 `flex: 1` 佔滿整個主內容區域
- AND 佈局 SHALL 與先前無 artifacts 功能時表現一致

---

### Requirement: Artifacts panel 渲染

當 `artifactsPanelOpen` 為 true 時，ArtifactsPanel SHALL 渲染在 ChatView 旁邊。

#### Scenario: Panel 開啟時渲染

- WHEN store 中 `artifactsPanelOpen` 狀態為 true
- THEN AppShell SHALL 在 ChatView 右側渲染 ArtifactsPanel component
- AND 兩者 SHALL 並排顯示於 flex 容器中

#### Scenario: Panel 關閉時不渲染

- WHEN store 中 `artifactsPanelOpen` 狀態為 false
- THEN AppShell SHALL NOT 渲染 ArtifactsPanel component
- AND ChatView SHALL 獨自佔滿主內容區域

---

### Requirement: Chat 寬度自動調整

當 artifacts panel 開啟時，ChatView SHALL 自動縮減寬度以容納 panel。

#### Scenario: Panel 開啟時 ChatView 縮減

- WHEN ArtifactsPanel 開啟（寬度 480px）
- THEN ChatView SHALL 使用 `flex: 1` 自動縮減寬度
- AND ChatView 的可用寬度 SHALL 為 viewport 寬度減去 480px

#### Scenario: Panel 關閉時 ChatView 恢復全寬

- WHEN ArtifactsPanel 從開啟變為關閉
- THEN ChatView SHALL 恢復為全寬佈局
- AND 過渡 SHALL 平滑自然

#### Scenario: 小螢幕不影響 ChatView 寬度

- WHEN viewport 寬度 < 768px
- AND ArtifactsPanel 開啟
- THEN ArtifactsPanel SHALL 以 overlay 模式渲染
- AND ChatView SHALL 保持全寬不受影響
