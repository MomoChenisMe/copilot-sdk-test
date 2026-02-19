## ADDED Requirements

### Requirement: 預設模板匯出功能
系統 SHALL 提供 `GET /api/prompts/presets/export` endpoint，將所有預設模板匯出為 JSON 格式。回傳的 JSON MUST 包含陣列，每個元素為 `{name: string, content: string}`。前端 SettingsPanel 的 Presets tab SHALL 提供 "Export" 按鈕，觸發下載 `presets.json` 檔案。

#### Scenario: 匯出所有預設
- **WHEN** 前端發送 `GET /api/prompts/presets/export`
- **THEN** 回傳 JSON 陣列包含所有預設模板的 name 和 content

#### Scenario: 前端下載 JSON
- **WHEN** 使用者點擊 "Export" 按鈕
- **THEN** 瀏覽器下載 `presets.json` 檔案，內容為所有預設模板的 JSON

#### Scenario: 無預設模板
- **WHEN** 系統中無任何預設模板
- **THEN** 回傳空陣列 `[]`

### Requirement: 預設模板匯入功能
系統 SHALL 提供 `POST /api/prompts/presets/import` endpoint，接受 JSON 陣列格式的預設模板匯入。每個元素 MUST 驗證 `name`（非空 string）和 `content`（非空 string）。同名預設 MUST 覆寫（upsert）。前端 SettingsPanel 的 Presets tab SHALL 提供 "Import" 按鈕和檔案選擇器。

#### Scenario: 匯入有效 JSON
- **WHEN** 前端發送 `POST /api/prompts/presets/import` 包含 `[{name: "coding", content: "You are a coding assistant"}]`
- **THEN** 系統建立或更新名為 "coding" 的預設模板，回傳 200 和匯入數量

#### Scenario: 同名覆寫
- **WHEN** 匯入的 JSON 包含已存在的預設名稱
- **THEN** 該預設的 content 被更新為匯入的新值

#### Scenario: 無效 JSON 格式
- **WHEN** 匯入的檔案不是合法 JSON 或元素缺少必要欄位
- **THEN** 回傳 400 錯誤，包含驗證錯誤訊息

#### Scenario: 前端檔案選擇
- **WHEN** 使用者點擊 "Import" 按鈕
- **THEN** 顯示檔案選擇器（accept=".json"），選擇檔案後自動上傳並匯入
