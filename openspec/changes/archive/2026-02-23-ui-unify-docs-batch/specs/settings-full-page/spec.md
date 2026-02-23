## MODIFIED Requirements

### Requirement: Settings panel open animation
SettingsPanel 開啟時 SHALL 播放 fade + scale 進入動畫：opacity 從 0 到 1 + scale 從 0.95 到 1，持續 200ms，使用 ease-out timing function。

#### Scenario: 設定頁面開啟有動畫
- **WHEN** 使用者點擊設定按鈕開啟 SettingsPanel
- **THEN** 面板 MUST 播放 fadeScaleIn 動畫
- **THEN** 動畫 MUST 從 opacity: 0 + scale(0.95) 開始
- **THEN** 動畫 MUST 在 200ms 後到達 opacity: 1 + scale(1)
- **THEN** 動畫 MUST 使用 ease-out timing

#### Scenario: 動畫使用全域 CSS class
- **WHEN** SettingsPanel render
- **THEN** 容器 MUST 包含 `animate-fade-scale-in` CSS class
- **THEN** 動畫 keyframe MUST 定義在全域 CSS（globals.css）中
