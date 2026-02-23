## ADDED Requirements

### Requirement: Global fadeScaleIn animation keyframe
全域 CSS SHALL 定義 `fadeScaleIn` keyframe 和 `.animate-fade-scale-in` utility class，提供 fade + scale 進入動畫（opacity 0→1 + scale 0.95→1，200ms ease-out）。

#### Scenario: fadeScaleIn class 可用
- **WHEN** 任何元件使用 `animate-fade-scale-in` class
- **THEN** 元件 MUST 播放從 opacity:0 + scale(0.95) 到 opacity:1 + scale(1) 的動畫
- **THEN** 動畫持續時間 MUST 為 200ms
- **THEN** timing function MUST 為 ease-out

### Requirement: Global slideInRight animation keyframe
全域 CSS SHALL 定義 `slideInRight` keyframe 和 `.animate-slide-in-right` utility class，提供從右側滑入動畫（translateX 100%→0，200ms ease-out）。此 MUST 取代 OpenSpecPanel 中的 inline `<style>` 定義。

#### Scenario: slideInRight class 可用
- **WHEN** 任何元件使用 `animate-slide-in-right` class
- **THEN** 元件 MUST 播放從 translateX(100%) 到 translateX(0) 的滑入動畫
- **THEN** 動畫持續時間 MUST 為 200ms（0.2s）
- **THEN** timing function MUST 為 ease-out

#### Scenario: 不再有 inline style 定義
- **WHEN** 檢視整個前端程式碼
- **THEN** MUST NOT 存在 inline `<style>` 標籤定義 slideInRight keyframe
