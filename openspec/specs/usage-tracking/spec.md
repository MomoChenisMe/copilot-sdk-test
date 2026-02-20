## MODIFIED Requirements

### Requirement: ModelInfo Interface 擴充 premiumMultiplier

ModelInfo interface SHALL 新增 `premiumMultiplier?: number | null` 欄位，表示該模型每次請求消耗的 premium request 倍率。

#### Scenario: 後端回傳 premiumMultiplier

- **WHEN** 前端呼叫 `GET /api/copilot/models`
- **THEN** 回傳的每個 ModelInfo 物件 MUST 包含 `premiumMultiplier` 欄位
- **AND** 若模型有明確的倍率資訊，值 MUST 為正數（如 `0.5`、`1`、`9`）
- **AND** 若倍率資訊無法取得，值 MUST 為 `null`

#### Scenario: TypeScript 型別定義

- **WHEN** 前端 store 的 `ModelInfo` 型別被引用
- **THEN** 型別 MUST 包含 `premiumMultiplier?: number | null`
- **AND** 既有欄位（`id`、`name`）MUST 保持不變

### Requirement: Model Selector Multiplier Badge 顯示

Model selector dropdown 中每個模型選項 SHALL 顯示 premium multiplier badge，使用色彩編碼區分倍率等級。

#### Scenario: Multiplier badge 基本顯示

- **WHEN** model selector dropdown 展開
- **THEN** 每個模型名稱旁 MUST 顯示 multiplier badge（如 "0.5x"、"1x"、"9x"）
- **AND** badge 格式 MUST 為 `{value}x`
- **AND** 若 `premiumMultiplier` 為 `null`，MUST NOT 顯示 badge

#### Scenario: 當前選中模型的 badge

- **WHEN** model selector 顯示當前選中的模型名稱（collapsed 狀態）
- **THEN** 模型名稱旁 MUST 同樣顯示 multiplier badge（若有值）

## ADDED Requirements

### Requirement: Multiplier Badge 色彩編碼

Multiplier badge SHALL 根據倍率數值使用不同的色彩方案，幫助使用者快速識別模型的 premium request 消耗等級。

#### Scenario: 低倍率顯示 green（< 1x）

- **WHEN** 模型的 `premiumMultiplier` 值小於 1（如 `0.5`）
- **THEN** badge MUST 使用 green 色系（`bg-emerald-500/15 text-emerald-500`）
- **AND** 此色彩表示該模型為「經濟型」選擇

#### Scenario: 標準倍率顯示 gray（= 1x）

- **WHEN** 模型的 `premiumMultiplier` 值等於 1
- **THEN** badge MUST 使用 gray 色系（`bg-gray-500/15 text-gray-400`）
- **AND** 此色彩表示該模型為「標準型」消耗

#### Scenario: 高倍率顯示 amber（> 1x 且 < 9x）

- **WHEN** 模型的 `premiumMultiplier` 值大於 1 且小於 9
- **THEN** badge MUST 使用 amber 色系（`bg-amber-500/15 text-amber-500`）
- **AND** 此色彩表示該模型為「進階型」消耗

#### Scenario: 超高倍率顯示 red（>= 9x）

- **WHEN** 模型的 `premiumMultiplier` 值大於或等於 9
- **THEN** badge MUST 使用 red 色系（`bg-red-500/15 text-red-500`）
- **AND** 此色彩表示該模型為「高消耗型」，提醒使用者注意配額

#### Scenario: null 倍率不顯示 badge

- **WHEN** 模型的 `premiumMultiplier` 為 `null`
- **THEN** MUST NOT 渲染任何 badge 元素
- **AND** 模型名稱 MUST 正常顯示不受影響

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

### Requirement: Premium Badge 獨立顯示

系統 SHALL 在輸入框內部（附件按鈕左側）顯示獨立的 premium request badge，資料來源為全局 store 的 `premiumQuota`，透過 Input 組件的 `statusText` prop 傳入。

#### Scenario: Badge 基本顯示

- **WHEN** 全局 store 的 `premiumQuota` 不為 null 且 `unlimited === false`
- **THEN** MUST 在輸入框內附件按鈕左側顯示 `{used}/{total} PR` 格式的 badge
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
