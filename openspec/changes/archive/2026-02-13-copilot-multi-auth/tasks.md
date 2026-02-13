## 1. Config 擴充

- [x] 1.1 撰寫 `config.test.ts` 新增測試：`githubToken` 和 `githubClientId` 選填、有值時正確讀取
- [x] 1.2 實作 `config.ts` 新增 `githubToken` 和 `githubClientId` 選填欄位
- [x] 1.3 更新 `.env.example` 新增 `GITHUB_TOKEN` 和 `GITHUB_CLIENT_ID` 說明
- [x] 1.4 驗證：`npm test -w backend` 全部通過

## 2. ClientManager 多重認證

- [x] 2.1 撰寫 `client-manager.test.ts` 新增測試：無 token → 不帶 githubToken 建立 client
- [x] 2.2 撰寫 `client-manager.test.ts` 新增測試：有 githubToken → 以 `{ githubToken }` 建立 client
- [x] 2.3 撰寫 `client-manager.test.ts` 新增測試：`getAuthStatus()` 正確呼叫 SDK 並回傳結果
- [x] 2.4 撰寫 `client-manager.test.ts` 新增測試：`setGithubToken()` 停掉舊 client，下次 getClient 用新 token
- [x] 2.5 實作 `client-manager.ts`：建構子接收 config、`getClient()` 根據 token 決定參數
- [x] 2.6 實作 `client-manager.ts`：新增 `getAuthStatus()` 和 `setGithubToken()` 方法
- [x] 2.7 更新 `index.ts`：`new ClientManager(config)` 傳入 config
- [x] 2.8 更新 `index.test.ts`：配合 ClientManager 建構子變更
- [x] 2.9 驗證：`npm test -w backend` 全部通過

## 3. Device Flow 模組

- [x] 3.1 撰寫 `device-flow.test.ts` 測試：`startDeviceFlow()` 正確 POST GitHub API 並解析回應
- [x] 3.2 撰寫 `device-flow.test.ts` 測試：`pollDeviceFlow()` 輪詢成功取得 token
- [x] 3.3 撰寫 `device-flow.test.ts` 測試：`pollDeviceFlow()` 超時拋錯
- [x] 3.4 撰寫 `device-flow.test.ts` 測試：`pollDeviceFlow()` 使用者拒絕拋錯
- [x] 3.5 實作 `copilot/device-flow.ts`：`startDeviceFlow()` 和 `pollDeviceFlow()` 函式
- [x] 3.6 驗證：`npm test -w backend` 全部通過

## 4. Copilot Auth REST API

- [x] 4.1 撰寫 `auth-routes.test.ts` 測試：`GET /auth/status` 回傳認證狀態
- [x] 4.2 撰寫 `auth-routes.test.ts` 測試：`POST /device-flow/start` 成功啟動回傳 userCode
- [x] 4.3 撰寫 `auth-routes.test.ts` 測試：`POST /device-flow/start` 無 clientId 回 400
- [x] 4.4 撰寫 `auth-routes.test.ts` 測試：`POST /device-flow/complete` 成功完成設定 token
- [x] 4.5 撰寫 `auth-routes.test.ts` 測試：`POST /device-flow/complete` 缺少 deviceCode 回 400
- [x] 4.6 實作 `copilot/auth-routes.ts`：建立 Router 含三個端點
- [x] 4.7 更新 `index.ts`：掛載 copilot auth routes 到 `/api/copilot/auth`
- [x] 4.8 更新 `index.test.ts`：配合新 route 的 mock
- [x] 4.9 驗證：`npm test -w backend` 全部通過
