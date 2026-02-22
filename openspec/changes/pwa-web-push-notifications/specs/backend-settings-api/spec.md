## MODIFIED Requirements

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
