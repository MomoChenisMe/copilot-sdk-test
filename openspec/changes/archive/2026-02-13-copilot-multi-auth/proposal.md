## Why

目前 `ClientManager` 建立 `CopilotClient()` 不傳任何認證參數，僅依賴 SDK 預設的 `useLoggedInUser: true`（讀取 `gh` CLI 儲存的 token）。這代表部署前必須在 VPS 上手動執行 `gh auth login`，且沒有備用方案——如果 `gh` CLI 未安裝或 token 過期，系統就無法連接 Copilot。

需要支援多種認證方式，讓使用者依環境靈活選擇，並在認證失敗時有明確的備用路徑。

## Non-Goals

- 不實作多用戶認證/權限系統（仍為單人工具）
- 不實作 GitHub OAuth Web Flow（需要 redirect URI，手機 + VPS 場景不適合）
- 不變動現有的 Web 認證（密碼登入 + session cookie）

## What Changes

- `config.ts` 新增 `GITHUB_TOKEN`（選填）和 `GITHUB_CLIENT_ID`（選填）環境變數
- `ClientManager` 支援三種認證方式，依優先順序自動選擇：
  1. **環境變數 Token** — `GITHUB_TOKEN` 設定時直接傳給 SDK
  2. **gh CLI 已登入** — SDK 預設行為，讀取本機 `gh auth` 的 token
  3. **Device Flow** — 前端引導使用者到 GitHub 完成 OAuth 授權
- 新增 `getAuthStatus()` 方法，暴露當前認證狀態
- 新增 `setGithubToken()` 方法，支援 Device Flow 完成後動態設定 token
- 新增 REST API 端點，供前端查詢認證狀態和觸發 Device Flow
- 更新 `.env.example`

## Capabilities

### New Capabilities
- `copilot-auth`: Copilot SDK 多重認證策略（環境變數 Token、gh CLI、Device Flow）+ 認證狀態 API

### Modified Capabilities
- `copilot-agent`: `ClientManager` 建構子接收 config 參數，影響 client 初始化邏輯

## Impact

- **後端**：`config.ts`、`copilot/client-manager.ts`、`index.ts` 修改；新增 `copilot/device-flow.ts`、`copilot/auth-routes.ts`
- **API**：新增 `/api/copilot/auth/status`、`/api/copilot/auth/device-flow/start`、`/api/copilot/auth/device-flow/complete`
- **環境變數**：新增 `GITHUB_TOKEN`（選填）、`GITHUB_CLIENT_ID`（選填）
- **依賴**：無新依賴（使用 Node.js 內建 `fetch`）
