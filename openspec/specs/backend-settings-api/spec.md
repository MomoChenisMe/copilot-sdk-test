## ADDED Requirements

### Requirement: Settings JSON 檔案儲存

系統 SHALL 在 `{promptsPath}/settings.json` 儲存使用者設定為 JSON 格式。設定物件 MUST 包含以下欄位：
- `theme`: `'light' | 'dark'`（預設 `'dark'`）
- `language`: `string`（預設 `'en'`）
- `lastSelectedModel`: `string | null`（預設 `null`）
- `disabledSkills`: `string[]`（預設 `[]`）
- `openTabs`: `Array<{ id: string; title: string; conversationId?: string }>`（預設 `[]`）
- `pushNotifications`: `PushNotificationSettings | undefined`（預設 `undefined`）

`PushNotificationSettings` 結構：
- `enabled`: `boolean`（預設 `false`）— 推播通知總開關
- `cronEnabled`: `boolean`（預設 `true`）— Cron 任務完成通知
- `streamEnabled`: `boolean`（預設 `true`）— AI 回覆完成通知

當檔案不存在時，SettingsStore MUST 回傳所有預設值。

#### Scenario: 首次讀取設定

- **WHEN** settings.json 不存在
- **THEN** 系統回傳包含所有預設值的完整設定物件，pushNotifications 為 undefined

#### Scenario: 讀取已存在的設定

- **WHEN** settings.json 存在且包含 `{ "theme": "light", "language": "zh-TW" }`
- **THEN** 系統回傳該物件，缺失欄位以預設值填充

#### Scenario: 讀取包含推播設定

- **WHEN** settings.json 包含 `{ "pushNotifications": { "enabled": true, "cronEnabled": true, "streamEnabled": false } }`
- **THEN** 系統回傳完整物件，pushNotifications 欄位正確解析

#### Scenario: PATCH 推播設定

- **WHEN** 發送 `PATCH /api/settings` body 為 `{ "pushNotifications": { "cronEnabled": false } }`
- **THEN** pushNotifications 物件與現有值合併更新，其他設定不變

### Requirement: GET /api/settings 端點

系統 SHALL 提供 `GET /api/settings` 端點，回傳完整的設定 JSON 物件。
此端點 MUST 受 auth middleware 保護。

#### Scenario: 成功取得設定

- **WHEN** 已認證使用者發送 `GET /api/settings`
- **THEN** 回傳 200 狀態碼和完整設定 JSON

#### Scenario: 未認證請求

- **WHEN** 未認證使用者發送 `GET /api/settings`
- **THEN** 回傳 401 狀態碼

### Requirement: PATCH /api/settings 端點

系統 SHALL 提供 `PATCH /api/settings` 端點，接受部分設定物件進行合併更新。
只有提供的欄位會被更新，其餘保持不變。

#### Scenario: 部分更新主題

- **WHEN** 發送 `PATCH /api/settings` body 為 `{ "theme": "light" }`
- **THEN** 只更新 theme 欄位為 "light"，其餘不變，回傳 200 和更新後的完整設定

#### Scenario: 更新多個欄位

- **WHEN** 發送 `PATCH /api/settings` body 為 `{ "theme": "dark", "language": "zh-TW" }`
- **THEN** 同時更新 theme 和 language，回傳 200 和更新後的完整設定

### Requirement: PUT /api/settings 端點

系統 SHALL 提供 `PUT /api/settings` 端點，完整替換整個設定物件。

#### Scenario: 完整替換設定

- **WHEN** 發送 `PUT /api/settings` body 為完整設定物件
- **THEN** 完整替換 settings.json 內容，回傳 200 和新設定

### Requirement: 前端啟動時從後端載入設定

前端 MUST 在 AppShell mount 時呼叫 `GET /api/settings`，並以後端回傳值初始化 Zustand store。
若 API 呼叫失敗，MUST fallback 到 localStorage 的值。

#### Scenario: 成功從後端載入

- **WHEN** AppShell mount 且 API 回傳 `{ "theme": "light" }`
- **THEN** store 的 theme 設為 "light"，覆蓋 localStorage 的值

#### Scenario: API 失敗時 fallback

- **WHEN** AppShell mount 但 `GET /api/settings` 回傳 500
- **THEN** 使用 localStorage 中的設定值初始化 store

### Requirement: 設定變更雙寫

前端 MUST 在每次設定變更時同時更新 localStorage 和呼叫 `PATCH /api/settings`。
PATCH 呼叫為 fire-and-forget（不等待回應不阻塞 UI）。

#### Scenario: 切換主題時雙寫

- **WHEN** 使用者切換主題為 "light"
- **THEN** localStorage 立即更新為 "light"，同時發送 `PATCH /api/settings { "theme": "light" }`

### Requirement: 一次性 localStorage 遷移

首次啟動時，若後端回傳的設定全為預設值但 localStorage 有非預設值，前端 MUST 將 localStorage 的值 PATCH 到後端。

#### Scenario: localStorage 有值但後端是預設

- **WHEN** 後端回傳 `{ "theme": "dark" }`（預設）且 localStorage 有 `theme: "light"`
- **THEN** 自動發送 `PATCH /api/settings { "theme": "light" }` 將 localStorage 值遷移到後端
