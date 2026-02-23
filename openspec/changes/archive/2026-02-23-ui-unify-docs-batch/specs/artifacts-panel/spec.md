## MODIFIED Requirements

### Requirement: Slide-in animation source
Artifacts 面板若使用 slide-in 動畫，SHALL 引用全域 CSS 定義的 `.animate-slide-in-right` class，MUST NOT 使用 inline `<style>` 或元件內嵌的 keyframe 定義。

#### Scenario: 動畫 class 來自全域 CSS
- **WHEN** Artifacts 面板需要 slide-in 動畫
- **THEN** MUST 使用全域 CSS 中定義的 `animate-slide-in-right` class
- **THEN** MUST NOT 在元件內定義 keyframe
