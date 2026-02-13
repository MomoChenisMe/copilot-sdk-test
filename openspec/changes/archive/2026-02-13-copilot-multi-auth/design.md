## Context

目前 `ClientManager` 以無參數方式建立 `new CopilotClient()`，依賴 SDK 預設的 `useLoggedInUser: true` 讀取 `gh` CLI 的 token。這限制了部署彈性——VPS 上必須預裝 `gh` CLI 且手動登入。

SDK 提供的認證相關選項：
- `githubToken?: string` — 直接傳入 token（最高優先）
- `useLoggedInUser?: boolean` — 使用本機已登入的使用者（預設 true）
- `getAuthStatus()` — 查詢目前認證狀態及方式

SDK **不支援** Device Flow，需自行實作 GitHub OAuth Device Flow API。

## Goals / Non-Goals

**Goals:**
- 支援三種認證方式，依優先順序自動選擇
- 暴露認證狀態 API，前端可查詢
- 提供 Device Flow 備用路徑，無需安裝 `gh` CLI

**Non-Goals:**
- 不實作前端 Device Flow UI（本次僅做後端 API）
- 不實作 token 持久化存儲（重啟後需重新認證，除非用環境變數）
- 不變動現有 Web 認證機制

## Decisions

### D1: 認證優先順序策略

**決定：** 以 config 中的 `githubToken` 為最高優先，無則 fallback 到 SDK 預設（gh CLI），Device Flow 透過 `setGithubToken()` 動態注入。

**替代方案：** 在 `getClient()` 中自動偵測並嘗試多種認證方式（auto-detect chain）。
**取捨：** Auto-detect 增加複雜度和不可預測性。明確的優先順序更容易除錯和測試。

### D2: ClientManager 接收 config

**決定：** `ClientManager` 建構子接收 `{ githubToken?: string; githubClientId?: string }` 物件。`getClient()` 根據有無 `githubToken` 決定傳給 SDK 的參數。

**替代方案：** 把 config 存在 module 層級的全域變數。
**取捨：** 依賴注入更利於測試，符合現有 DI 模式（SessionManager 已接收 ClientManager）。

### D3: Device Flow 實作方式

**決定：** 獨立的 `device-flow.ts` 模組，純函式風格。`startDeviceFlow()` 發起請求，`pollDeviceFlow()` 輪詢結果。由 `auth-routes.ts` 組合這些函式。

**替代方案：** 把 Device Flow 邏輯內嵌到 auth-routes 裡。
**取捨：** 獨立模組可單獨測試 HTTP 互動邏輯，不需要 Express 環境。

### D4: Device Flow 輪詢機制

**決定：** `POST /device-flow/complete` 由後端輪詢 GitHub，使用 long-polling 模式。前端發起一次請求，後端持續輪詢直到成功、超時（5 分鐘）或使用者拒絕。

**替代方案：** 前端定時輪詢後端。
**取捨：** 後端輪詢減少前端複雜度，單一請求完成整個流程。但需注意 HTTP timeout 設定。

### D5: Token 動態更新

**決定：** 新增 `setGithubToken(token)` 方法。呼叫時停掉現有 client（如有），將 token 存入 instance 變數，下次 `getClient()` 使用新 token。

**替代方案：** 重建整個 ClientManager instance。
**取捨：** 原地更新更簡單，避免重新連接 SessionManager 等上游依賴。

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| Device Flow 的 `GITHUB_CLIENT_ID` 需要 GitHub OAuth App，使用者需自行建立 | 在 `.env.example` 和文件中說明建立步驟；Device Flow 是選填功能 |
| Device Flow token 不持久化，重啟失效 | 使用者可改用 `GITHUB_TOKEN` 環境變數做持久化認證 |
| 後端 long-polling `/device-flow/complete` 可能 HTTP timeout | 設定 Express request timeout 為 6 分鐘，pollDeviceFlow 內部 5 分鐘超時 |
| `getAuthStatus()` 需要先建立 client 才能呼叫 | 僅在 client 已建立時回傳 SDK 狀態，否則從 config 推斷認證方式 |
