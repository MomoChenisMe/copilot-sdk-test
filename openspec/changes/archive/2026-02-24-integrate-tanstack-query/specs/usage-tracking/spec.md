## MODIFIED Requirements

### Requirement: Premium Badge 獨立顯示

系統 SHALL 在輸入框內部（附件按鈕左側）顯示獨立的 premium request badge，資料來源改為 TanStack Query 的 `useQuotaQuery` hook，透過 Input 組件的 `statusText` prop 傳入。

#### Scenario: Badge 基本顯示

- **WHEN** `useQuotaQuery()` returns data with `unlimited === false`
- **THEN** MUST 在輸入框內附件按鈕左側顯示 `{used}/{total} PR` 格式的 badge
- **AND** 樣式 MUST 為 `text-[10px] text-text-muted tabular-nums`

#### Scenario: Unlimited 顯示

- **WHEN** `useQuotaQuery()` returns data with `unlimited === true`
- **THEN** badge MUST 顯示 `{used} PR`（不含 total）

#### Scenario: 無 quota 資料

- **WHEN** `useQuotaQuery()` returns `null` data
- **THEN** MUST NOT 渲染 premium badge

#### Scenario: 即時更新

- **WHEN** streaming 觸發 `copilot:quota` WebSocket 事件
- **THEN** the WebSocket bridge MUST call `setQuotaInCache()` to update the TanStack Query cache
- **AND** premium badge MUST 即時反映最新的 `used` 數值 via reactive query data

## ADDED Requirements

### Requirement: Quota Polling via TanStack Query

The quota polling mechanism SHALL use TanStack Query's `refetchInterval` instead of manual `setInterval`.

#### Scenario: Automatic polling

- **WHEN** `useQuotaQuery()` is mounted
- **THEN** it MUST poll `GET /api/copilot/quota` every 30 seconds via `refetchInterval: 30000`
- **AND** there MUST NOT be a manual `setInterval` in any hook or component

#### Scenario: Polling stops when unmounted

- **WHEN** no component is using `useQuotaQuery()`
- **THEN** polling MUST stop automatically (TanStack Query handles this)

#### Scenario: Stale quota after WebSocket update

- **WHEN** the WebSocket bridge updates the quota cache via `setQuotaInCache()`
- **THEN** the next poll cycle MUST still proceed normally
- **AND** the poll result SHALL overwrite the WebSocket-provided data if different
