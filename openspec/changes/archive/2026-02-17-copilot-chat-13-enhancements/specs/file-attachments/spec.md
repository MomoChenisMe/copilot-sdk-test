## ADDED Requirements

### Requirement: 模型能力 Gating
附件上傳功能 SHALL 依據目前模型的能力決定是否啟用。

#### Scenario: 支援附件的模型
- **WHEN** 目前模型 `modelSupportsAttachments()` 回傳 true
- **THEN** 上傳按鈕 SHALL 可點擊

#### Scenario: 不支援附件的模型
- **WHEN** 目前模型 `modelSupportsAttachments()` 回傳 false
- **THEN** 上傳按鈕 SHALL disabled，opacity 降低，title 顯示原因

#### Scenario: 切換模型時更新
- **WHEN** 使用者切換到不同模型
- **THEN** 上傳按鈕狀態 SHALL 立即更新
