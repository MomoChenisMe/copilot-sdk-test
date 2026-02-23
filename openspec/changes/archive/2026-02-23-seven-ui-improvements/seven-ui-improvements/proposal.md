## Why

目前存在三個影響使用體驗的問題：
1. **Tab 啟用狀態不持久化** — 使用者切換到某個 tab 後重新載入頁面，系統總是回到第一個 tab，而非記住上次啟用的 tab。
2. **Tab 無法直接刪除對話** — 現有的 close 按鈕（hover 顯示的 X）只是關閉 tab 視窗，對話仍留在歷史中。使用者必須打開歷史下拉選單才能真正刪除對話，操作路徑過長。
3. **SDK 版本檢查產生不必要的 WARN 日誌** — `SdkUpdateChecker.getInstalledVersion()` 的 Strategy 1（`createRequire`）因 `@github/copilot-sdk` 的 `package.json` 沒有匯出 main entry 而必然失敗，產生 `ERR_PACKAGE_PATH_NOT_EXPORTED` 警告。Strategy 2（檔案系統尋找）實際上總是成功，此 WARN 是預期行為的噪音。

## What Changes

- **Tab 啟用狀態持久化**：在 `persistOpenTabs()` 中新增 `activeTabId` 儲存，在 `restoreOpenTabs()` 中讀取並還原上次啟用的 tab（若該 tab 仍存在於已還原的 tab 列表中）。
- **Tab 直接刪除對話**：在 tab close 按鈕旁新增「刪除對話」選項（右鍵選單或長按），讓使用者可以從 tab 直接刪除對應對話，而非僅關閉 tab。刪除後同時關閉 tab 並從對話歷史移除。
- **消除 SDK 版本檢查噪音**：將 Strategy 1 的失敗日誌從 `WARN` 降級為 `DEBUG`，因為這是預期的 fallback 行為。僅在兩個 strategy 都失敗時才使用 `WARN`。

## Non-Goals（非目標）

- 不改變 tab 的拖曳排序邏輯。
- 不實作 tab 的「釘選」功能。
- 不改變對話歷史下拉選單的現有刪除功能。
- 不修改 SDK 自動更新邏輯，僅調整日誌層級。

## Capabilities

### New Capabilities

- `tab-active-persistence`: 持久化並還原使用者最後啟用的 tab ID，跨頁面重新載入保持 tab 焦點。
- `tab-delete-conversation`: 從 tab 直接刪除對應對話的功能，包含確認對話框和 UI 入口。
- `sdk-version-log-cleanup`: 調整 SDK 版本檢查的日誌層級，消除預期 fallback 行為的噪音警告。

### Modified Capabilities

（無現有 spec 層級的行為變更）

## Impact

- **前端 store**：`persistOpenTabs()` 和 `restoreOpenTabs()` 函數修改，localStorage 格式新增 `activeTabId` 欄位。
- **前端 TabBar**：新增右鍵選單或刪除按鈕 UI。
- **前端 store**：新增 `deleteTabConversation()` action，整合 `closeTab()` + conversation API 刪除。
- **後端 `sdk-update.ts`**：`getInstalledVersion()` 方法的日誌層級調整。
- **後端 settings API**：`openTabs` 格式可能新增 `activeTabId`（向後相容）。
