## ADDED Requirements

### Requirement: SDK 版本檢查
系統 SHALL 提供 `GET /api/copilot/sdk-version` endpoint，回傳當前安裝的 `@github/copilot-sdk` 版本與 npm registry 上的最新版本。版本資訊 MUST 快取 1 小時以避免頻繁查詢 npm registry。

#### Scenario: 查詢版本資訊
- **WHEN** 前端發送 `GET /api/copilot/sdk-version`
- **THEN** 回傳 JSON：`{current: "0.1.23", latest: "0.2.0", updateAvailable: true}`

#### Scenario: 版本相同
- **WHEN** 當前版本與最新版本相同
- **THEN** 回傳 `{current: "0.1.23", latest: "0.1.23", updateAvailable: false}`

#### Scenario: 快取機制
- **WHEN** 在 1 小時內多次呼叫版本檢查
- **THEN** 第二次及後續呼叫回傳快取結果，不再查詢 npm registry

#### Scenario: npm registry 查詢失敗
- **WHEN** npm registry 無法連線
- **THEN** 回傳當前版本，latest 為 null，updateAvailable 為 false，附帶錯誤訊息

### Requirement: SDK 一鍵更新
系統 SHALL 提供 `POST /api/copilot/sdk-update` endpoint，執行 `npm update @github/copilot-sdk` 更新 SDK。更新流程 MUST：(1) abort 所有活躍串流並 persist 資料、(2) 執行 npm update、(3) graceful shutdown（關閉 HTTP server + WebSocket）、(4) `process.exit(0)` 讓 process manager 重啟。

#### Scenario: 正常更新流程
- **WHEN** 前端發送 `POST /api/copilot/sdk-update`
- **THEN** 系統回傳 202 Accepted，開始非同步更新流程：abort streams → npm update → shutdown → exit

#### Scenario: npm update 成功
- **WHEN** `npm update @github/copilot-sdk` 執行成功
- **THEN** 系統進行 graceful shutdown，process manager（pm2/systemd）自動重啟後端

#### Scenario: npm update 失敗
- **WHEN** `npm update` 執行失敗（例如網路錯誤或權限問題）
- **THEN** 系統記錄錯誤日誌，不進行 shutdown，回傳錯誤狀態；透過 WebSocket 通知前端更新失敗

#### Scenario: 更新期間前端體驗
- **WHEN** 更新流程開始
- **THEN** 前端顯示 "更新中..." spinner；WebSocket 斷線後自動重連（WS client 已有重連機制）；重連後版本檢查確認更新成功

### Requirement: SDK 更新通知 Banner
前端 SHALL 在偵測到新版 SDK 時顯示 `SdkUpdateBanner` 元件，位於頁面頂部。Banner MUST 顯示當前版本與最新版本，提供 "Update Now" 按鈕。Banner MUST 可被關閉（dismissed），關閉後 24 小時內不再顯示。

#### Scenario: 偵測到更新
- **WHEN** 前端啟動或每日定時檢查發現 `updateAvailable: true`
- **THEN** 頂部顯示 banner：`"SDK 更新可用：v0.1.23 → v0.2.0"` + [Update Now] + [Dismiss] 按鈕

#### Scenario: 使用者點擊更新
- **WHEN** 使用者點擊 "Update Now" 按鈕
- **THEN** 前端呼叫 `POST /api/copilot/sdk-update`，按鈕變為 spinner，顯示 "更新中..."

#### Scenario: 使用者關閉 banner
- **WHEN** 使用者點擊 dismiss 按鈕
- **THEN** Banner 消失，在 localStorage 記錄 dismiss 時間戳，24 小時內不再顯示

#### Scenario: 更新完成後自動重連
- **WHEN** 後端更新完成並重啟
- **THEN** 前端 WebSocket 自動重連，重新查詢版本確認更新成功，banner 消失

### Requirement: Settings SDK 版本卡片
前端 SettingsPanel 的 General tab SHALL 顯示 SDK 版本卡片，包含當前版本、最新版本、更新按鈕。

#### Scenario: 版本卡片顯示
- **WHEN** 使用者開啟 Settings 的 General tab
- **THEN** 顯示 SDK 版本卡片：當前版本、最新版本（或 "Checking..."）、更新狀態

#### Scenario: 已是最新版
- **WHEN** 當前版本等於最新版本
- **THEN** 卡片顯示 "Up to date" 綠色標籤，更新按鈕 disabled
