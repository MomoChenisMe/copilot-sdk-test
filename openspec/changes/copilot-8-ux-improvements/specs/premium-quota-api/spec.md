## ADDED Requirements

### Requirement: Premium Quota REST Endpoint

系統 SHALL 提供 `GET /api/copilot/quota` endpoint，回傳當前 premium request 配額資訊。

#### Scenario: 有 quota 快取時回傳資料

- **WHEN** 後端已收到至少一次 `copilot:quota` streaming 事件
- **THEN** API SHALL 回傳 HTTP 200 和 `{ quota: { used: number, total: number, resetDate: string | null, unlimited: boolean, updatedAt: string } }`

#### Scenario: 無 quota 快取（冷啟動）

- **WHEN** 後端從未收到 `copilot:quota` 事件（如 server 剛啟動）
- **THEN** API SHALL 回傳 HTTP 200 和 `{ quota: null }`

#### Scenario: Quota 快取更新

- **WHEN** 任何 session 的 streaming 觸發 `copilot:quota` 事件
- **THEN** StreamManager MUST 更新全局 `quotaCache` 為最新的 quota 資料
- **AND** `updatedAt` MUST 設為當前 ISO 8601 時間戳

### Requirement: Premium Quota 全局 Store

前端 Zustand store SHALL 維護全局 `premiumQuota` 狀態，獨立於 per-tab usage。

#### Scenario: Store 初始狀態

- **WHEN** App 啟動時
- **THEN** `premiumQuota` MUST 為 `null`

#### Scenario: API 取得後更新

- **WHEN** `useQuota` hook 成功 fetch `GET /api/copilot/quota` 且 quota 非 null
- **THEN** store 的 `premiumQuota` MUST 更新為 `{ used, total, resetDate, unlimited }`

#### Scenario: WebSocket 事件即時更新

- **WHEN** `copilot:quota` WebSocket 事件在任何 tab 中觸發
- **THEN** 全局 store 的 `premiumQuota` MUST 同步更新（雙寫：per-tab + 全局）

### Requirement: useQuota Hook 主動查詢

前端 SHALL 在 AppShell 初始化時透過 `useQuota` hook 主動查詢 quota，並定期刷新。

#### Scenario: 初始化載入

- **WHEN** AppShell 掛載且 `useQuota` hook 首次執行
- **THEN** hook MUST fetch `GET /api/copilot/quota` 並更新全局 store

#### Scenario: 定期刷新

- **WHEN** 距離上次 fetch 超過 30 秒
- **THEN** hook MUST 自動重新 fetch `GET /api/copilot/quota`

#### Scenario: Fetch 失敗

- **WHEN** `GET /api/copilot/quota` 回傳錯誤
- **THEN** hook MUST 保留現有 store 狀態不變，不清除已有的 quota 資料
