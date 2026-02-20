## Why

目前應用程式有多個 UX 和 i18n 問題需要修正：快捷鍵面板與對話刪除確認的翻譯 key 缺失導致中文介面顯示英文 fallback；MCP 伺服器參數輸入的 placeholder 未翻譯且提示不夠清楚；預設模板功能使用者認為不需要，增加了不必要的介面複雜度。此外，因為使用 GitHub Copilot 訂閱制認證，希望整合 GitHub 倉庫選擇功能，讓使用者可以直接從 GitHub repos 中選擇專案作為工作目錄，更好地結合 GitHub 生態。

**目標使用者**：使用手機瀏覽器操控 AI Terminal 的個人開發者，有 GitHub Copilot 訂閱。

**使用情境**：
1. 在手機上快速切換到不同 GitHub 專案的工作目錄
2. 使用中文介面時，所有 UI 文字都正確顯示翻譯
3. 設定頁面精簡，移除不需要的預設模板功能

## What Changes

- **新增 GitHub 倉庫選擇**：在現有目錄選擇器中新增 GitHub 頁籤，透過 `gh` CLI 列出使用者的 repos，選擇後自動 clone 到預設目錄並設為 CWD
- **修復快捷鍵面板 i18n**：補齊 `shortcuts.*` 和 `common.close` 等 14 個缺失的翻譯 key
- **修復對話刪除 i18n**：補齊 `sidebar.deleteConfirm`、`common.delete`、`common.cancel` 等缺失的翻譯 key
- **改善 MCP 參數 placeholder**：將硬編碼的 "comma-separated" 替換為翻譯後的範例提示
- **移除預設模板功能**：移除設定頁面的「預設模板」頁籤和所有相關的前後端程式碼（**BREAKING**：移除 `/api/prompts/presets/*` 路由和 `activePresets` 狀態）

## Non-Goals（非目標）

- 不處理 GitHub OAuth 重新認證（復用現有 `gh` CLI 認證）
- 不支援在 UI 中建立 GitHub repo 或進行 GitHub 操作（僅選擇和 clone）
- 不修改現有的 Copilot SDK 認證流程
- 不遷移預設模板的資料（直接移除）
- 不重新設計 MCP 參數輸入方式（維持逗號分隔）

## Capabilities

### New Capabilities
- `github-repo-selector`: GitHub 倉庫選擇功能，包含後端 `gh` CLI 整合 API 和前端目錄選擇器的 GitHub 頁籤

### Modified Capabilities
- `i18n`: 補齊快捷鍵面板、對話刪除確認、MCP 參數 placeholder 的缺失翻譯 key，以及新增 GitHub 功能的翻譯
- `directory-picker`: 新增 GitHub 頁籤，支援從 GitHub repos 選擇並 clone 為工作目錄
- `settings-full-page`: 移除預設模板（Presets）頁籤
- `system-prompts`: 移除 `activePresets` 參數和 preset 注入邏輯

## Impact

**後端：**
- 新增 `backend/src/github/routes.ts`（GitHub API 路由）
- 修改 `backend/src/index.ts`（註冊 GitHub 路由）
- 修改 `backend/src/prompts/routes.ts`（移除 presets 路由）
- 修改 `backend/src/prompts/composer.ts`（移除 activePresets）
- 修改 `backend/src/copilot/stream-manager.ts`（移除 activePresets 傳遞）
- 修改 `backend/src/ws/handlers/copilot.ts`（移除 activePresets 讀取）

**前端：**
- 新增 `frontend/src/lib/github-api.ts`（GitHub API client）
- 修改 `frontend/src/components/copilot/DirectoryPicker.tsx`（GitHub 頁籤）
- 修改 `frontend/src/components/settings/SettingsPanel.tsx`（移除 presets 頁籤）
- 修改 `frontend/src/components/settings/McpTab.tsx`（翻譯 placeholder）
- 修改 `frontend/src/store/index.ts`（移除 activePresets）
- 修改 `frontend/src/hooks/useTabCopilot.ts`（移除 activePresets）
- 修改 `frontend/src/lib/prompts-api.ts`（移除 presets API）
- 修改 `frontend/src/locales/en.json` 和 `zh-TW.json`（新增/移除翻譯）

**Breaking Changes：**
- 移除 `/api/prompts/presets/*` REST API 路由
- 移除 WebSocket 訊息中的 `activePresets` 欄位
