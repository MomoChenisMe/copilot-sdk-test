## ADDED Requirements

### Requirement: 模型能力偵測
系統 SHALL 維護一份模型能力對照表，支援 prefix matching。

#### Scenario: 已知模型查詢
- **WHEN** 查詢 "gpt-4o" 的能力
- **THEN** 系統 SHALL 回傳 supportsImageUpload: true, supportsFileUpload: true

#### Scenario: 未知模型查詢
- **WHEN** 查詢不在對照表中的模型
- **THEN** 系統 SHALL 回傳預設能力（supportsImageUpload: false, supportsFileUpload: true）

#### Scenario: Prefix matching
- **WHEN** 查詢 "gpt-4o-2024-11-20"
- **THEN** 系統 SHALL 匹配 "gpt-4o" 前綴的能力設定

### Requirement: 上傳功能 Gating
附件上傳按鈕 SHALL 依據目前模型能力決定是否可用。

#### Scenario: 模型支援附件
- **WHEN** 目前模型支援 file upload
- **THEN** 上傳按鈕 SHALL 正常可用

#### Scenario: 模型不支援附件
- **WHEN** 目前模型不支援 file upload
- **THEN** 上傳按鈕 SHALL 顯示為 disabled，tooltip 說明原因

#### Scenario: Terminal 模式
- **WHEN** Tab 為 terminal mode
- **THEN** 上傳按鈕 SHALL 不顯示（無論模型能力）
