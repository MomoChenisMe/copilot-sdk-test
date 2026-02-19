## ADDED Requirements

### Requirement: Model 列表 TTL cache
後端 MUST 為 `client.listModels()` 結果建立 TTL cache，有效期為 5 分鐘。在 cache 有效期內的重複請求 MUST 回傳快取結果，不呼叫 Copilot API。cache 過期後的下一次請求 MUST 重新查詢 API 並更新 cache。

#### Scenario: 首次查詢
- **WHEN** 首次呼叫 listModels 且 cache 為空
- **THEN** 呼叫 Copilot API 取得 model 列表，結果存入 cache，設定 TTL 5 分鐘

#### Scenario: Cache 命中
- **WHEN** 在 cache 有效期內（< 5 分鐘）再次查詢 model 列表
- **THEN** 直接回傳 cache 結果，不呼叫 API

#### Scenario: Cache 過期
- **WHEN** cache 已過期（> 5 分鐘）且收到查詢請求
- **THEN** 重新呼叫 API，更新 cache 內容和 TTL

#### Scenario: API 查詢失敗時
- **WHEN** cache 已過期但 API 呼叫失敗
- **THEN** 回傳舊的 cache 結果（stale-while-error），記錄警告日誌

### Requirement: Model 列表定期刷新
前端 MUST 每 30 分鐘自動刷新 model 列表。`useModels` hook SHALL 移除 `if (models.length > 0) return` guard，改為基於 timestamp 的刷新邏輯。hook SHALL 暴露 `refreshModels()` function 供手動觸發刷新。

#### Scenario: 自動刷新
- **WHEN** 上次 model 列表取得時間超過 30 分鐘
- **THEN** 前端自動重新取得 model 列表

#### Scenario: 手動刷新
- **WHEN** 使用者呼叫 `refreshModels()`
- **THEN** 立即重新取得 model 列表，不受 30 分鐘限制

#### Scenario: 初次載入
- **WHEN** 前端首次啟動
- **THEN** 立即取得 model 列表（不等 30 分鐘）
