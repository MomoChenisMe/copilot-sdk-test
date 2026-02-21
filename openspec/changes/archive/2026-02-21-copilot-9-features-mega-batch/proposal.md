## Why

目前系統存在多個架構與 UX 問題：前端設定僅存於 localStorage（跨裝置無法同步）、提示詞設定分散於三處（個人檔案、Agent 規則、記憶偏好）造成使用者混淆、多個下拉選單在手機上溢出螢幕、tool use 區塊在淺色主題下仍顯示深色背景、bash 工具執行時因 undefined `.map()` 而崩潰。此外，缺少輸入歷史回溯和聊天建立 cron jobs 的能力，影響了操作效率。

## Non-Goals（非目標）

- 不重新設計整體 UI/視覺風格
- 不新增多人協作或多帳號支援
- 不變更 WebSocket 協議或 SDK 整合方式
- 不遷移資料庫（仍使用 SQLite + 檔案系統）

## What Changes

- **設定持久化**：新增後端 Settings API (`/api/settings`)，將 theme、language、model、disabledSkills、openTabs 從 localStorage 遷移至後端 JSON 檔案儲存
- **輸入歷史**：聊天與命令輸入框支援 ArrowUp/ArrowDown 鍵翻閱歷史訊息
- **AI Cron 工具**：新增 `manage_cron_jobs` 內建工具，讓 AI 可在對話中建立、修改、刪除排程任務
- **下拉選單 RWD**：ConversationPopover、DirectoryPicker、ModelSelector 加入 viewport boundary 檢測，防止手機溢出
- **Header 自適應**：CwdSelector、ModelSelector 觸發按鈕在小螢幕上縮減寬度
- **提示詞合併**：將個人檔案 (PROFILE.md) + Agent 規則 (AGENT.md) + 記憶偏好 (preferences.md) 合併為統一的 PROFILE.md，Agent 規則 tab 移除，OpenSpec SDD toggle 獨立為新 OpenSpec tab
- **記憶簡化**：移除「專案」和「解決方案」記憶子類別，僅保留自動記憶 + LLM Intelligence
- **Bug Fix**：修復 `toolRecords.map()` 的 undefined 錯誤
- **Bug Fix**：修復淺色主題下 code block / tool use 區塊背景色錯誤，highlight.js 依主題切換

## Capabilities

### New Capabilities

- `backend-settings-api`: 後端設定儲存 API，支援 GET/PATCH/PUT 操作，檔案型 JSON 持久化
- `input-history`: 聊天與命令輸入框的歷史訊息回溯功能（ArrowUp/Down 鍵導航）
- `cron-chat-tool`: AI 內建 `manage_cron_jobs` 工具，支援透過自然語言對話管理排程任務

### Modified Capabilities

- `system-prompts`: 合併 AGENT.md 和 memory/preferences.md 到 PROFILE.md，composer 從 7 段縮減為 5 段，新增啟動遷移邏輯
- `settings-full-page`: 移除 Agent 規則 tab，簡化記憶 tab（移除偏好/專案/解決方案），Profile tab 擴充
- `directory-picker`: 加入 viewport boundary 檢測，max-width 響應式限制
- `app-layout`: Header toolbar 元件寬度響應式調整
- `tool-result-ui`: 修復淺色主題 CSS variables、highlight.js 主題切換、toolRecords null safety
- `design-system`: 更新 code block 淺色主題色票 (--color-code-bg, --color-code-header-bg)

## Impact

**Backend**：
- 新增 `backend/src/settings/` 模組 (settings-store.ts, routes.ts)
- 新增 `backend/src/copilot/tools/cron-tools.ts`
- 修改 `backend/src/prompts/composer.ts` — 移除 AGENT.md 和 preferences 段落
- 修改 `backend/src/prompts/routes.ts` — agent endpoint 降級為相容 shim
- 修改 `backend/src/index.ts` — 掛載 settings routes、cron tools、遷移邏輯
- 修改 `backend/src/prompts/memory-routes.ts` — 移除 projects/solutions routes

**Frontend**：
- 新增 `frontend/src/lib/settings-api.ts`
- 修改 `frontend/src/styles/globals.css` — 淺色主題 code 色票修正
- 修改 `frontend/src/store/index.ts` — 設定同步後端
- 修改 `frontend/src/components/settings/SettingsPanel.tsx` — 移除 agent tab、簡化 memory
- 修改 `frontend/src/components/copilot/ChatView.tsx` — toolRecords null safety
- 修改 `frontend/src/components/copilot/DirectoryPicker.tsx` — RWD fix
- 修改 `frontend/src/components/shared/Input.tsx` — 輸入歷史
- 修改 `frontend/src/locales/en.json`, `zh-TW.json` — i18n 更新

**API 變更**：
- 新增：`GET/PATCH/PUT /api/settings`
- 降級：`GET/PUT /api/prompts/agent` → 相容 shim
- 降級：`GET/PUT /api/memory/preferences` → 相容 shim
- 移除：`/api/memory/projects/*`, `/api/memory/solutions/*`
