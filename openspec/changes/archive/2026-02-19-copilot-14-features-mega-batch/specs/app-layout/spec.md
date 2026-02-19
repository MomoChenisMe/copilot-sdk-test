## ADDED Requirements

### Requirement: 底部工具列 mobile 換行堆疊
ChatView 底部輸入區的工具列 SHALL 在 mobile 視窗寬度（< `md` breakpoint, 768px）時使用 `flex flex-wrap` 換行堆疊。第一行 MUST 放置 ModelSelector + CwdSelector，第二行 MUST 放置 PlanActToggle + mode 按鈕。padding 在 mobile 時 MUST 從 `px-4` 縮減為 `px-2`。

#### Scenario: Mobile 寬度換行
- **WHEN** 視窗寬度 < 768px
- **THEN** 底部工具列分兩行顯示：第一行為 model 和 cwd 選擇器，第二行為 toggle 和模式按鈕

#### Scenario: Desktop 寬度單行
- **WHEN** 視窗寬度 >= 768px
- **THEN** 底部工具列在單行內水平排列所有元素

#### Scenario: 極小寬度（320px）
- **WHEN** 視窗寬度為 320px
- **THEN** 所有工具列元素均可見且不溢出，padding 為 `px-2`

### Requirement: CWD 選擇器路徑截斷
CwdSelector 元件 SHALL 在 mobile 視窗寬度（< `md`）時僅顯示路徑的最後一個目錄名稱。完整路徑 MUST 使用 `hidden md:inline` class 隱藏中間段落。

#### Scenario: Mobile 路徑截斷
- **WHEN** 視窗寬度 < 768px 且 CWD 為 `/home/user/projects/my-app`
- **THEN** 顯示 `my-app`（僅最後一段）

#### Scenario: Desktop 完整路徑
- **WHEN** 視窗寬度 >= 768px
- **THEN** 顯示完整路徑 `/home/user/projects/my-app`

### Requirement: 全斷點響應式覆蓋
所有前端元件 SHALL 在 320px、375px、768px、1024px、1920px 五個斷點寬度下正常顯示，無溢出（overflow）、無裁切（clipping）、無水平捲軸。

#### Scenario: 320px 最小寬度
- **WHEN** 視窗寬度為 320px
- **THEN** ChatView、TabBar、SettingsPanel、UsageBar 均無水平捲軸，文字適當截斷或換行

#### Scenario: 375px iPhone 寬度
- **WHEN** 視窗寬度為 375px
- **THEN** 所有互動元素（按鈕、輸入框）均可正常操作，觸控目標 >= 44px

#### Scenario: 1920px 寬螢幕
- **WHEN** 視窗寬度為 1920px
- **THEN** 內容適當置中或展開，不出現過度留白

## MODIFIED Requirements

### Requirement: Split layout support
AppShell 主要內容區域 SHALL 支援 ChatView 與 ArtifactsPanel 並排 flex 佈局。在 mobile 寬度（< `md`）時，ArtifactsPanel MUST 以 overlay 或 full-width 方式顯示（而非並排），ChatView 隱藏。在 desktop 寬度時維持原有的並排佈局（panel 480px）。

#### Scenario: Mobile 時 panel 全寬
- **WHEN** 視窗寬度 < 768px 且 ArtifactsPanel 開啟
- **THEN** ArtifactsPanel 佔滿全寬，ChatView 隱藏

#### Scenario: Desktop 時並排
- **WHEN** 視窗寬度 >= 768px 且 ArtifactsPanel 開啟
- **THEN** ChatView 和 ArtifactsPanel 並排顯示，panel 寬 480px

#### Scenario: Panel 關閉時
- **WHEN** ArtifactsPanel 關閉
- **THEN** ChatView 佔滿全寬（所有斷點均適用）
