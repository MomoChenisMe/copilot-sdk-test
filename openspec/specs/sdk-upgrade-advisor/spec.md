## ADDED Requirements

### Requirement: Changelog 取得
系統 SHALL 提供 `SdkUpdateChecker.getChangelog(fromVersion, toVersion)` 方法，取得版本間的 changelog。

#### Scenario: 從 GitHub Releases API 取得
- **WHEN** `getChangelog(fromVersion, toVersion)` 被呼叫且 GitHub Releases API 可用
- **THEN** 系統 SHALL 從 GitHub Releases API 取得指定版本範圍內的所有 release notes，合併為單一 changelog 字串回傳

#### Scenario: GitHub API 失敗，Fallback 至 npm Registry
- **WHEN** GitHub Releases API 呼叫失敗（網路錯誤或 HTTP 非 200）
- **THEN** 系統 SHALL fallback 至 npm registry，取得版本的 `readme` 或 `description` 欄位作為 changelog

#### Scenario: 兩個來源都失敗
- **WHEN** GitHub Releases API 和 npm registry 都無法取得 changelog
- **THEN** `getChangelog()` SHALL 回傳 `null`

#### Scenario: 版本範圍過濾
- **WHEN** GitHub Releases API 回傳多個 release
- **THEN** 系統 SHALL 只包含版本號介於 `fromVersion`（不含）和 `toVersion`（含）之間的 release notes

#### Scenario: API 呼叫 Timeout
- **WHEN** GitHub API 或 npm registry 呼叫超過 15 秒
- **THEN** 系統 SHALL 中斷該請求，嘗試下一個來源或回傳 `null`

### Requirement: Changelog 分析 API
系統 SHALL 提供 endpoint 供前端觸發 changelog 分析。

#### Scenario: 分析請求
- **WHEN** 前端呼叫 `POST /api/copilot/analyze-changelog` 帶有 `{ fromVersion, toVersion }`
- **THEN** 系統 SHALL 取得 changelog，透過 Copilot SDK 以 system prompt 指示分析最佳化建議，回傳分析結果

#### Scenario: Changelog 不可用
- **WHEN** `getChangelog()` 回傳 `null`
- **THEN** API SHALL 回傳 HTTP 404 `{ error: "Changelog not available for specified versions" }`

#### Scenario: 分析 Prompt 內容
- **WHEN** 系統將 changelog 送入 Copilot 分析
- **THEN** prompt SHALL 指示 Copilot 識別：新功能可利用的最佳化機會、breaking changes 的影響、建議的設定調整、deprecated API 的遷移步驟

### Requirement: SDK 更新後 UI 流程
前端 SHALL 在 SDK 更新成功後提供「分析變更」功能。

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
