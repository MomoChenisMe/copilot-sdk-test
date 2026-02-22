## MODIFIED Requirements

### Requirement: SDK 更新後 UI 流程
前端 SHALL 在設定頁「一般」分頁始終顯示 SDK 版本區塊，即使版本無法偵測也顯示 fallback 文字。

#### Scenario: 版本偵測成功
- **WHEN** `/api/copilot/sdk-version` 回傳有效的 `currentVersion`
- **THEN** 前端 SHALL 顯示 `v{currentVersion}`

#### Scenario: 版本偵測失敗
- **WHEN** `/api/copilot/sdk-version` 回傳 `currentVersion: null` 或 API 呼叫失敗
- **THEN** 前端 SHALL 顯示 fallback 文字（`t('sdk.versionUnknown')`），SDK 區塊仍然可見

#### Scenario: 更新成功後顯示按鈕
- **WHEN** SDK 更新流程成功完成（版本已從 `fromVersion` 升級至 `toVersion`）
- **THEN** 前端 SHALL 在更新成功訊息旁顯示 "Analyze Changes" 按鈕

#### Scenario: 點擊分析按鈕
- **WHEN** 使用者點擊 "Analyze Changes" 按鈕
- **THEN** 前端 SHALL 呼叫 `POST /api/copilot/analyze-changelog`，將 `fromVersion` 和 `toVersion` 作為參數

#### Scenario: 分析結果顯示
- **WHEN** Copilot 分析完成且成功回傳結果
- **THEN** 前端 SHALL 將分析結果作為 Copilot 訊息插入聊天，以 markdown 格式顯示最佳化建議

#### Scenario: 分析進行中
- **WHEN** changelog 分析正在進行
- **THEN** 前端 SHALL 在 "Analyze Changes" 按鈕顯示 loading 狀態，防止重複點擊

#### Scenario: 分析失敗
- **WHEN** `POST /api/copilot/analyze-changelog` 回傳錯誤
- **THEN** 前端 SHALL 顯示錯誤訊息，通知使用者 changelog 分析不可用

#### Scenario: 無更新時隱藏
- **WHEN** SDK 尚未執行更新或更新失敗
- **THEN** 前端 SHALL 不顯示 "Analyze Changes" 按鈕

#### Scenario: API 錯誤記錄
- **WHEN** `/api/copilot/sdk-version` API 呼叫失敗
- **THEN** 前端 SHALL 以 `console.warn` 記錄錯誤（不再靜默吞掉）

## ADDED Requirements

### Requirement: SDK 版本偵測路徑解析
`SdkUpdateChecker.getInstalledVersion()` SHALL 使用 `createRequire` 正確解析 npm hoisted 套件路徑。

#### Scenario: 套件被 npm hoisting 到專案根目錄
- **WHEN** `@github/copilot-sdk` 被安裝在專案根目錄的 `node_modules/`（非 `backend/node_modules/`）
- **THEN** `getInstalledVersion()` SHALL 透過 `createRequire(import.meta.url).resolve()` 正確找到套件並回傳版本號

#### Scenario: 套件在 backend/node_modules/
- **WHEN** `@github/copilot-sdk` 安裝在 `backend/node_modules/`
- **THEN** `getInstalledVersion()` SHALL 同樣正確解析並回傳版本號

#### Scenario: 套件不存在
- **WHEN** `@github/copilot-sdk` 未安裝
- **THEN** `getInstalledVersion()` SHALL 回傳 `null` 並以 `log.warn` 記錄錯誤

#### Scenario: createRequire fallback
- **WHEN** `createRequire` 解析失敗（例如 tsx 環境相容性問題）
- **THEN** 系統 SHALL fallback 到嘗試候選路徑（2 層 `../..` 和 3 層 `../../..` 上級目錄），至少有一個能成功

### Requirement: SDK 版本 i18n
系統 SHALL 提供 SDK 版本未知時的多語系翻譯。

#### Scenario: 英文翻譯
- **WHEN** 語系為 `en`
- **THEN** 版本未知時 SHALL 顯示 "Unknown"

#### Scenario: 繁體中文翻譯
- **WHEN** 語系為 `zh-TW`
- **THEN** 版本未知時 SHALL 顯示 "未知"
