## ADDED Requirements

### Requirement: ToggleSwitch 共用元件
系統 SHALL 提供可複用的 `ToggleSwitch` 元件（`frontend/src/components/shared/ToggleSwitch.tsx`）。元件 props MUST 包含 `checked: boolean`、`onChange: (checked: boolean) => void`、`disabled?: boolean`、`size?: 'sm' | 'md'`。啟用狀態 track 顏色 MUST 為 `bg-emerald-500`（綠色），停用狀態為 `bg-bg-tertiary`。尺寸為 iOS 風格比例：md 為 `w-9 h-5` track + `w-3.5 h-3.5` thumb，sm 為 `w-7 h-4` track + `w-3 h-3` thumb。過渡動畫 MUST 使用 `transition-colors duration-200`。

#### Scenario: 啟用狀態
- **WHEN** `checked` 為 true
- **THEN** track 顯示 `bg-emerald-500` 綠色，thumb 滑至右側

#### Scenario: 停用狀態
- **WHEN** `checked` 為 false
- **THEN** track 顯示 `bg-bg-tertiary` 灰色，thumb 在左側

#### Scenario: Disabled 狀態
- **WHEN** `disabled` 為 true
- **THEN** 元件 opacity 降為 50%，不回應點擊事件

#### Scenario: Toggle 互動
- **WHEN** 使用者點擊 ToggleSwitch
- **THEN** 觸發 `onChange(!checked)`，track 顏色和 thumb 位置平滑過渡

### Requirement: SettingsPanel toggle 統一替換
前端 SettingsPanel 中所有 inline toggle switch 實作 SHALL 替換為 `ToggleSwitch` 元件。包含但不限於：自動批准 toggle、串流回應 toggle、其他 boolean 設定項。

#### Scenario: Settings 中的 toggle 使用共用元件
- **WHEN** SettingsPanel 渲染任何 boolean 設定的 toggle
- **THEN** 使用 `ToggleSwitch` 元件，啟用時顯示綠色

#### Scenario: 視覺一致性
- **WHEN** 檢視所有 Settings 頁面的 toggle
- **THEN** 所有 toggle 使用相同的綠色/灰色配色和 iOS 風格比例

### Requirement: PlanActToggle outline 風格
PlanActToggle 元件的 active 狀態 SHALL 從 solid accent 背景（`bg-accent text-white`）改為 outline 風格（`border-accent text-accent bg-accent/10`），inactive 狀態維持 `border-border text-text-secondary`。

#### Scenario: Plan mode active
- **WHEN** 當前模式為 Plan
- **THEN** Plan 按鈕使用 `border-accent text-accent bg-accent/10`，Act 按鈕使用 `border-border text-text-secondary`

#### Scenario: Act mode active
- **WHEN** 當前模式為 Act
- **THEN** Act 按鈕使用 `border-accent text-accent bg-accent/10`，Plan 按鈕使用 `border-border text-text-secondary`
