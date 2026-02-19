## ADDED Requirements

### Requirement: Copilot 訂閱偵測
前端 SHALL 根據是否收到 quota data 來判斷使用者是否為 Copilot 訂閱者。當任何對話的 `copilot:quota` 事件回報了 `quotaSnapshots` 且 `premiumRequestsTotal > 0` 或 `premiumUnlimited === true`，系統 MUST 視為 Copilot 訂閱者，並在 UsageBar 顯示 Premium Requests 區段。若從未收到 quota data，MUST 隱藏 Premium Requests 區段。

#### Scenario: 有 Copilot 訂閱
- **WHEN** 收到 `copilot:quota` 且 `premiumRequestsTotal > 0`
- **THEN** UsageBar 顯示 Premium Requests 區段

#### Scenario: 無 Copilot 訂閱
- **WHEN** 整個 session 從未收到任何 quota 事件
- **THEN** UsageBar 不顯示 Premium Requests 區段

#### Scenario: Unlimited 訂閱
- **WHEN** 收到 `copilot:quota` 且 `premiumUnlimited: true`
- **THEN** UsageBar 顯示 Premium Requests 為 "X PR (Unlimited)"

## MODIFIED Requirements

### Requirement: Premium request forwarding
Backend SHALL 轉發 `assistant.usage` 的 quotaSnapshots 為即時快照。每次 `copilot:quota` 事件的 premium request 數字 MUST 被視為帳戶級別的最新全域快照（非累加值）。前端 MUST 使用最後一次收到的快照值，不做跨對話加總或本地持久化。

#### Scenario: Quota 即時快照
- **WHEN** 收到 `copilot:quota` 且 `premiumRequestsUsed: 42, premiumRequestsTotal: 100`
- **THEN** UsageBar 顯示 `42/100 PR`（取代任何先前的值）

#### Scenario: 跨對話一致
- **WHEN** 對話 A 回報 `premiumRequestsUsed: 42`，切換到對話 B 後回報 `premiumRequestsUsed: 43`
- **THEN** UsageBar 顯示最新的 43（帳戶級別快照）

#### Scenario: 頁面重整後
- **WHEN** 使用者重整頁面
- **THEN** Premium request 計數歸零，直到下一次 quota 事件到達才更新（不從本地儲存恢復）

### Requirement: Collapsed state display
Collapsed 狀態 MUST 分離顯示：Token 用量（`formatNumber(totalTokens) tokens`）永遠顯示；Premium Requests 數字（`X/Y PR` 或 `X PR`）僅在偵測到 Copilot 訂閱時顯示。Context window mini bar 維持不變。

#### Scenario: 有訂閱的 collapsed 顯示
- **WHEN** 使用者有 Copilot 訂閱且 UsageBar 為 collapsed 狀態
- **THEN** 顯示順序：`42/100 PR` | `12,345 tokens` | [context bar] | ▾

#### Scenario: 無訂閱的 collapsed 顯示
- **WHEN** 使用者無 Copilot 訂閱（未收到 quota data）
- **THEN** 顯示順序：`12,345 tokens` | [context bar] | ▾（無 PR 區段）
