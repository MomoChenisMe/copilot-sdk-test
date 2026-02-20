## MODIFIED Requirements

### Requirement: UsageBar 折疊視圖

UsageBar 折疊視圖 SHALL 僅顯示 token 統計和 context window 進度條，不再顯示 premium request 資訊。

#### Scenario: 折疊視圖內容

- **WHEN** UsageBar 以折疊狀態顯示
- **THEN** MUST 顯示 token 總數（如 "408,028 tokens"）
- **AND** MUST 顯示 context window 進度條和百分比
- **AND** MUST NOT 顯示 premium request 資訊（如 "X/Y PR"）

#### Scenario: 展開視圖內容

- **WHEN** 使用者點擊 UsageBar 展開
- **THEN** MUST 顯示 token 分項（Input/Output/Cache Read/Cache Write）
- **AND** MUST 顯示 context window 百分比和進度條
- **AND** MUST 顯示 model 名稱
- **AND** MUST NOT 顯示 premium request 相關區段

## ADDED Requirements

### Requirement: Premium Badge 獨立顯示

系統 SHALL 在 UsageBar 的 token 計數旁顯示獨立的 premium request badge，資料來源為全局 store 的 `premiumQuota`。

#### Scenario: Badge 基本顯示

- **WHEN** 全局 store 的 `premiumQuota` 不為 null 且 `unlimited === false`
- **THEN** MUST 在 UsageBar 同一行右側顯示 `{used}/{total} PR` 格式的 badge
- **AND** 樣式 MUST 為 `text-[10px] text-text-muted tabular-nums`

#### Scenario: Unlimited 顯示

- **WHEN** 全局 store 的 `premiumQuota.unlimited === true`
- **THEN** badge MUST 顯示 `{used} PR`（不含 total）

#### Scenario: 無 quota 資料

- **WHEN** 全局 store 的 `premiumQuota` 為 null
- **THEN** MUST NOT 渲染 premium badge

#### Scenario: 即時更新

- **WHEN** streaming 觸發 `copilot:quota` 事件更新全局 store
- **THEN** premium badge MUST 即時反映最新的 `used` 數值
