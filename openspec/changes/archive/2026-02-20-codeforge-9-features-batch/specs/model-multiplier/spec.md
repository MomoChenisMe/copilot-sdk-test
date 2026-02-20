## ADDED Requirements

### Requirement: Backend Premium Multiplier 資料
Backend SHALL 在模型列表中為每個模型附帶 `premiumMultiplier` 欄位。

#### Scenario: 靜態 Mapping Table
- **WHEN** 系統啟動載入模型列表
- **THEN** 系統 SHALL 維護一份靜態模型 premium multiplier mapping table，將已知模型名稱對應到 multiplier 數值（如 `gpt-4o-mini: 0.33`、`claude-sonnet-4: 1`、`o1-pro: 12`）

#### Scenario: 模型列表回傳 multiplier
- **WHEN** 前端呼叫模型列表 API
- **THEN** 每個模型物件 SHALL 包含 `premiumMultiplier`（number）欄位

#### Scenario: Mapping Table 命中
- **WHEN** 模型名稱存在於靜態 mapping table 中
- **THEN** `premiumMultiplier` SHALL 使用 mapping table 中的對應值

#### Scenario: SDK 資料 Fallback
- **WHEN** 模型名稱不在靜態 mapping table 中，但 SDK 回傳的模型資料包含 multiplier 資訊
- **THEN** `premiumMultiplier` SHALL 使用 SDK 提供的值

#### Scenario: 無資料時預設值
- **WHEN** 模型名稱既不在 mapping table 中，SDK 也未提供 multiplier 資訊
- **THEN** `premiumMultiplier` SHALL 回傳 `null`，表示無法確定

### Requirement: Model Selector Multiplier Badge
前端 model selector dropdown SHALL 在模型名稱旁顯示 premium multiplier badge。

#### Scenario: Badge 顯示格式
- **WHEN** 模型具有 `premiumMultiplier` 值
- **THEN** 前端 SHALL 在模型名稱右側顯示 badge，文字為 `{multiplier}x`（如 `0.33x`、`1x`、`5x`）

#### Scenario: 綠色 Badge（低於 1x）
- **WHEN** `premiumMultiplier < 1`
- **THEN** badge SHALL 使用綠色（green）背景色

#### Scenario: 灰色 Badge（等於 1x）
- **WHEN** `premiumMultiplier === 1`
- **THEN** badge SHALL 使用灰色（gray）背景色

#### Scenario: 琥珀色 Badge（大於 1x，小於 9x）
- **WHEN** `premiumMultiplier > 1` 且 `premiumMultiplier < 9`
- **THEN** badge SHALL 使用琥珀色（amber）背景色

#### Scenario: 紅色 Badge（9x 或以上）
- **WHEN** `premiumMultiplier >= 9`
- **THEN** badge SHALL 使用紅色（red）背景色

#### Scenario: 無 Multiplier 資料
- **WHEN** `premiumMultiplier` 為 `null`
- **THEN** 前端 SHALL 不顯示任何 badge

#### Scenario: Dropdown 和已選模型一致
- **WHEN** 使用者在 dropdown 中瀏覽模型列表和查看已選模型
- **THEN** multiplier badge 的顏色和數值 SHALL 在兩處保持一致
