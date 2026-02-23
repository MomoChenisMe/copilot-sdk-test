## ADDED Requirements

### Requirement: OpenSpec CLI 可用性檢測

後端 MUST 提供 static 方法 `OpenSpecService.isCliAvailable()` 檢測系統是否安裝 `openspec` CLI。檢測方式 MUST 使用 `execSync('command -v openspec')` 並捕獲例外。回傳 `boolean`。

#### Scenario: CLI 已安裝

- **WHEN** 系統已全域安裝 openspec（`command -v openspec` 成功）
- **THEN** `isCliAvailable()` MUST 回傳 `true`

#### Scenario: CLI 未安裝

- **WHEN** 系統未安裝 openspec（`command -v openspec` 失敗）
- **THEN** `isCliAvailable()` MUST 回傳 `false`

### Requirement: OpenSpec 初始化 API 端點

後端 MUST 提供 `POST /api/openspec/init?cwd=<absolute-path>` 端點。該端點 MUST：
1. 驗證 `cwd` query parameter 為絕對路徑，否則回傳 400
2. 檢查 CLI 可用性，不可用時回傳 503 + 安裝說明
3. 使用 `child_process.spawn('openspec', ['init'], { cwd })` 執行初始化
4. 成功時回傳 `{ ok: true }`，失敗時回傳 500 + 錯誤訊息
5. 該端點 MUST 受 auth middleware 保護

#### Scenario: 成功初始化

- **WHEN** 已認證使用者發送 `POST /api/openspec/init?cwd=/path/to/project`
- **AND** openspec CLI 已安裝
- **AND** 該路徑下尚無 openspec/ 目錄
- **THEN** 回傳 200 `{ ok: true }`
- **AND** 指定路徑下 MUST 產生 openspec/ 目錄結構

#### Scenario: CLI 不可用

- **WHEN** 已認證使用者發送 `POST /api/openspec/init?cwd=/path/to/project`
- **AND** openspec CLI 未安裝
- **THEN** 回傳 503 `{ error: 'openspec CLI not found', detail: 'Install openspec globally: npm install -g openspec' }`

#### Scenario: cwd 參數無效

- **WHEN** 發送 `POST /api/openspec/init?cwd=relative/path` 或缺少 cwd
- **THEN** 回傳 400 `{ error: 'Absolute cwd query parameter is required' }`

#### Scenario: 初始化失敗

- **WHEN** `openspec init` 指令以非零 exit code 結束
- **THEN** 回傳 500 `{ error: '<stderr 或 stdout 內容>' }`

### Requirement: 前端 Init 按鈕 UI

OpenSpec 面板在「未找到 OpenSpec」狀態下 MUST 顯示「初始化 OpenSpec」按鈕。按鈕 MUST：
1. 使用 accent 色彩樣式，居中顯示於空狀態資訊下方
2. 點擊時呼叫 `POST /api/openspec/init?cwd=<activeCwd>`
3. 執行中 MUST 顯示「初始化中...」文字並 disable 按鈕
4. 成功後 MUST 自動呼叫 `refreshAll()` 刷新面板
5. 失敗時 MUST 在按鈕下方顯示錯誤訊息（紅色文字）
6. CLI 不可用時 MUST 顯示安裝指引文字

#### Scenario: 點擊初始化按鈕成功

- **WHEN** 使用者在「未找到 OpenSpec」狀態下點擊「初始化 OpenSpec」按鈕
- **AND** CLI 已安裝
- **THEN** 按鈕變為 disabled 顯示「初始化中...」
- **AND** 初始化成功後面板自動刷新顯示 overview

#### Scenario: CLI 未安裝時顯示安裝指引

- **WHEN** 使用者點擊初始化按鈕
- **AND** 後端回傳 503
- **THEN** 按鈕下方顯示紅色錯誤文字，內容包含安裝指令

#### Scenario: 初始化過程中不可重複點擊

- **WHEN** 初始化正在進行中
- **THEN** 按鈕 MUST 保持 disabled 狀態，不可重複觸發

### Requirement: 前端 Init API Client

`openspec-api.ts` MUST 新增 `initOpenspec(cwd: string)` 方法，呼叫 `POST /api/openspec/init?cwd=<cwd>`，回傳 `{ ok: boolean }`。

#### Scenario: API 呼叫格式

- **WHEN** 前端呼叫 `openspecApi.initOpenspec('/path/to/project')`
- **THEN** MUST 發送 `POST /api/openspec/init?cwd=%2Fpath%2Fto%2Fproject`
