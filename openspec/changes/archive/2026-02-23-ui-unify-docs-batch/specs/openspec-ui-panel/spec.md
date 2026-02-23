## MODIFIED Requirements

### Requirement: Panel container styling
OpenSpec 面板容器 SHALL 使用 `bg-bg-primary` 背景色（取代 `bg-bg-secondary`），`border-border` 邊框色（取代 `border-border-subtle`），以對齊 Artifacts 側邊欄的視覺風格。

#### Scenario: 面板容器背景與邊框一致
- **WHEN** 使用者開啟 OpenSpec 面板
- **THEN** 面板容器的背景色 MUST 為 `bg-bg-primary`
- **THEN** 面板的桌面左邊框 MUST 使用 `border-border`（非 `border-border-subtle`）

### Requirement: Panel header layout
OpenSpec 面板 header SHALL 移除固定 `h-12` 高度，改用 `px-4 py-3` 間距和 `gap-2`（取代 `gap-3`），以對齊 Artifacts 側邊欄 header 的佈局。header 邊框 SHALL 使用 `border-border`。

#### Scenario: Header 高度和間距對齊 Artifacts
- **WHEN** 使用者開啟 OpenSpec 面板
- **THEN** header MUST 使用 `px-4 py-3 border-b border-border` 佈局
- **THEN** header 內元素間距 MUST 為 `gap-2`
- **THEN** header MUST NOT 使用固定 `h-12` 高度

### Requirement: Close button styling
OpenSpec 面板的 close 按鈕 SHALL 使用 `text-text-tertiary hover:text-text-primary hover:bg-bg-secondary` 色彩（取代 `hover:bg-bg-tertiary text-text-secondary`），close icon 大小 SHALL 為 16px（取代 14px），以對齊 Artifacts 側邊欄的 close 按鈕。

#### Scenario: Close 按鈕色彩對齊
- **WHEN** 使用者查看 OpenSpec 面板的 close 按鈕
- **THEN** 按鈕 MUST 使用 `text-text-tertiary` 預設色
- **THEN** hover 時 MUST 切換為 `text-text-primary` + `bg-bg-secondary`
- **THEN** icon 大小 MUST 為 16px

### Requirement: Navigation tab styling
OpenSpec 面板的 nav tab SHALL 使用描邊風格：active tab 為 `border-accent text-accent bg-accent/5 rounded-lg border`，inactive tab 為 `border-transparent text-text-secondary hover:bg-bg-secondary rounded-lg border`。此取代原本的填滿色風格（`bg-accent text-white`）。

#### Scenario: Active tab 描邊風格
- **WHEN** 使用者查看 active 狀態的 nav tab
- **THEN** tab MUST 顯示 `border-accent` 描邊 + `text-accent` 文字 + `bg-accent/5` 淺背景
- **THEN** tab MUST NOT 使用 `bg-accent text-white` 填滿色風格

#### Scenario: Inactive tab 樣式
- **WHEN** 使用者查看非 active 狀態的 nav tab
- **THEN** tab MUST 使用 `border-transparent` + `text-text-secondary`
- **THEN** hover 時 MUST 顯示 `bg-bg-secondary`

### Requirement: Change detail sub-tab styling
OpenSpecChangeDetail 中的子 tab（Tasks/Proposal/Design/Specs）SHALL 使用與主 nav tab 一致的描邊風格，取代原本的填滿色風格。

#### Scenario: 子 tab 風格一致
- **WHEN** 使用者進入 change detail 頁面
- **THEN** 子 tab 的 active 狀態 MUST 使用 `border-accent text-accent bg-accent/5` 描邊風格
- **THEN** 子 tab 的 inactive 狀態 MUST 使用 `border-transparent text-text-secondary hover:bg-bg-secondary`

### Requirement: Slide-in animation from global CSS
OpenSpec 面板的 slide-in 動畫 SHALL 使用全域 CSS 定義的 `.animate-slide-in-right` class，MUST NOT 使用 inline `<style>` 標籤。

#### Scenario: 動畫使用全域 class
- **WHEN** OpenSpec 面板開啟
- **THEN** 面板 MUST 使用 `animate-slide-in-right` CSS class
- **THEN** 面板 MUST NOT 渲染 inline `<style>` 標籤

### Requirement: Refresh button styling
OpenSpec 面板 header 的 refresh 按鈕 SHALL 使用 `text-text-tertiary hover:text-text-primary hover:bg-bg-secondary` 色彩以對齊 close 按鈕風格。

#### Scenario: Refresh 按鈕色彩一致
- **WHEN** 使用者查看 refresh 按鈕
- **THEN** 按鈕 MUST 使用 `text-text-tertiary` 預設色
- **THEN** hover 時 MUST 切換為 `text-text-primary` + `bg-bg-secondary`

### Requirement: Internal border consistency
OpenSpec 面板內部所有 sub-component 的邊框色 SHALL 統一使用 `border-border`，MUST NOT 使用 `border-border-subtle`。

#### Scenario: 內部邊框統一
- **WHEN** 使用者瀏覽 OpenSpec 面板的任何子頁面（overview、changes、specs、change detail）
- **THEN** 所有可見邊框 MUST 使用 `border-border` 色彩
- **THEN** MUST NOT 出現 `border-border-subtle`
