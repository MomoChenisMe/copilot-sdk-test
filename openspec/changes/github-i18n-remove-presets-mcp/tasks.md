## 1. i18n 缺失修復（快捷鍵、刪除確認、MCP placeholder）

- [x] 1.1 撰寫 i18n key 完整性測試：驗證 `shortcuts.*`（14 個 key）、`common.*`（3 個 key）、`sidebar.deleteConfirm`、`sidebar.deleteConversation`、`mcp.argsPlaceholder` 在 en.json 和 zh-TW.json 中都存在
- [x] 1.2 在 `frontend/src/locales/en.json` 新增 `shortcuts.*`、`common.*`、`sidebar.deleteConfirm`、`sidebar.deleteConversation`、`mcp.argsPlaceholder` 翻譯 key
- [x] 1.3 在 `frontend/src/locales/zh-TW.json` 新增對應的繁體中文翻譯
- [x] 1.4 修改 `frontend/src/components/settings/McpTab.tsx:165`，將硬編碼 `"comma-separated"` 替換為 `t('mcp.argsPlaceholder')`
- [x] 1.5 驗證所有測試通過，確認 ShortcutsPanel、ConversationPopover、McpTab 在 zh-TW 語系下正確顯示中文

## 2. 移除預設模板功能 — 前端

- [x] 2.1 撰寫測試：驗證 SettingsPanel 不渲染 Presets 分頁、settings tabs 列表不包含 "presets"
- [x] 2.2 修改 `frontend/src/components/settings/SettingsPanel.tsx`：移除 Presets 分頁的 tab 定義和整個 PresetsTab 區塊（含 Export/Import/toggle/edit/delete 邏輯）
- [x] 2.3 修改 `frontend/src/store/index.ts`：移除 `activePresets: string[]` 狀態和 `togglePreset` action
- [x] 2.4 修改 `frontend/src/lib/prompts-api.ts`：移除 `listPresets`、`putPreset`、`deletePreset`、`exportPresets`、`importPresets` API 函式
- [x] 2.5 修改 `frontend/src/hooks/useTabCopilot.ts`：移除向 WebSocket 訊息傳遞 `activePresets` 的邏輯
- [x] 2.6 從 `frontend/src/locales/en.json` 和 `zh-TW.json` 移除 `settings.tabs.presets` key
- [x] 2.7 更新 `frontend/tests/components/settings/SettingsPanel.test.tsx`：移除 presets 相關測試
- [x] 2.8 更新 `frontend/tests/hooks/useTabCopilot.test.ts`：移除 activePresets 相關測試
- [x] 2.9 驗證前端編譯成功且所有前端測試通過

## 3. 移除預設模板功能 — 後端

- [x] 3.1 撰寫測試：驗證 `/api/prompts/presets` 路由不存在（回傳 404）
- [x] 3.2 修改 `backend/src/prompts/routes.ts`：移除所有 `/presets/*` 路由（list、get、put、delete、export、import）
- [x] 3.3 修改 `backend/src/prompts/composer.ts`：從 `compose()` 函式移除 `activePresets` 參數和 preset 內容注入邏輯
- [x] 3.4 修改 `backend/src/copilot/stream-manager.ts`：更新 `compose()` 呼叫，移除 `activePresets` 引數
- [x] 3.5 修改 `backend/src/ws/handlers/copilot.ts`：移除從 WebSocket message 中讀取 `activePresets` 的邏輯
- [x] 3.6 更新 `backend/tests/prompts/routes.test.ts`：移除 presets 路由測試
- [x] 3.7 更新 `backend/tests/copilot/stream-manager.test.ts`：更新 compose 呼叫相關測試
- [x] 3.8 更新 `backend/tests/ws/handlers/copilot.test.ts`：移除 activePresets 相關測試
- [x] 3.9 驗證後端編譯成功且所有後端測試通過

## 4. GitHub 倉庫選擇 — 後端 API

- [x] 4.1 撰寫 `backend/tests/github/routes.test.ts` 測試：涵蓋 status、repos、clone 三個 endpoint 的正常和異常流程
- [x] 4.2 建立 `backend/src/github/routes.ts`：實作 `GET /api/github/status` — 檢查 `gh` CLI 可用性（`execFile('gh', ['auth', 'status'])`）
- [x] 4.3 實作 `GET /api/github/repos` — 透過 `gh repo list --json` 取得倉庫列表
- [x] 4.4 實作 `POST /api/github/clone` — 驗證 `nameWithOwner` 格式、檢查目標路徑是否已存在、執行 `gh repo clone` 搭配 `--depth 1`、設定 60 秒超時
- [x] 4.5 實作 command injection 防護：使用 `execFile`（非 `exec`）、驗證 `nameWithOwner` 僅包含 `[a-zA-Z0-9._-/]`
- [x] 4.6 修改 `backend/src/index.ts`：在 auth middleware 後註冊 `/api/github` 路由
- [x] 4.7 驗證所有 GitHub routes 測試通過

## 5. GitHub 倉庫選擇 — 前端 API Client

- [x] 5.1 撰寫 `frontend/tests/lib/github-api.test.ts` 測試：涵蓋 status、listRepos、cloneRepo 的 API 呼叫
- [x] 5.2 建立 `frontend/src/lib/github-api.ts`：實作 `githubApi.status()`、`githubApi.listRepos()`、`githubApi.cloneRepo(nameWithOwner)` 三個 API 函式
- [x] 5.3 驗證 API client 測試通過

## 6. GitHub 倉庫選擇 — DirectoryPicker UI

- [x] 6.1 撰寫 `frontend/tests/components/copilot/DirectoryPicker.test.tsx` 測試：涵蓋頁籤切換、GitHub 倉庫列表載入、搜尋過濾、選擇觸發 clone、gh 不可用降級
- [x] 6.2 修改 `frontend/src/components/copilot/DirectoryPicker.tsx`：新增 Local/GitHub 頁籤切換 UI
- [x] 6.3 實作 GitHub 頁籤：載入倉庫列表、搜尋過濾、Private 標記、Loading/Empty 狀態
- [x] 6.4 實作倉庫選擇流程：點擊 → clone API → cloning 狀態 → 成功設 CWD / 失敗顯示錯誤
- [x] 6.5 實作 gh CLI 不可用降級：偵測 status API 結果，顯示提示訊息
- [x] 6.6 驗證所有 DirectoryPicker 測試通過

## 7. GitHub 功能 i18n

- [x] 7.1 在 `frontend/src/locales/en.json` 新增 `github.*` 命名空間的所有翻譯 key（11 個 key）
- [x] 7.2 在 `frontend/src/locales/zh-TW.json` 新增對應的繁體中文翻譯
- [x] 7.3 撰寫 i18n 完整性測試驗證 `github.*` key 在雙語檔案中都存在
- [x] 7.4 驗證所有測試通過

## 8. 整合驗證

- [x] 8.1 執行全部後端測試 `npm -w backend test`，確認全部通過
- [x] 8.2 執行全部前端測試 `npm -w frontend test`，確認全部通過
- [x] 8.3 啟動開發伺服器，手動驗證：zh-TW 語系下快捷鍵面板、刪除確認、MCP placeholder 顯示中文
- [x] 8.4 手動驗證：設定頁面不再顯示「預設模板」頁籤
- [x] 8.5 手動驗證：CWD 選擇器的 GitHub 頁籤可列出 repos、選擇 repo 可 clone 並設為 CWD
