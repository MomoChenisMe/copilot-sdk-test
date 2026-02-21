## 1. Bug 修復：toolRecords Null Safety (Point 8)

- [x] 1.1 撰寫 ChatView toolRecords undefined 的測試 — 驗證 toolRecords 為 undefined 時 fallback 渲染不崩潰
- [x] 1.2 修復 `ChatView.tsx` 中 `toolRecords.map()` 和 `toolRecords.length` 的 null safety
- [x] 1.3 修復 `store/index.ts` 中 `updateToolRecord` 和 `updateTabToolRecord` 的 null safety
- [x] 1.4 搜尋 backend 中所有 `.map()` 呼叫確認 null safety（重點：`cron-tool-assembler.ts`）
- [x] 1.5 執行全部前端測試驗證不回歸

## 2. Bug 修復：Tool Use 主題跟隨系統 (Point 9)

- [x] 2.1 修復 `globals.css` 淺色主題 `--color-code-bg` 改為 `#F1F5F9`，`--color-code-header-bg` 改為 `#E2E8F0`
- [x] 2.2 移除 `globals.css` 中靜態引入的 `highlight.js/styles/github-dark.css`，改為依 `html[data-theme]` 切換 github.css / github-dark.css
- [x] 2.3 檢查 `ToolRecord.tsx`、`ToolResultBlock.tsx`、`Markdown.tsx` 中的文字色在淺色 code 背景下的可讀性，必要時調整
- [x] 2.4 視覺驗證：淺色/深色主題下 tool 結果和 code block 的顯示正確性

## 3. UI/RWD 修正：下拉選單 (Point 4)

- [x] 3.1 撰寫 ConversationPopover viewport boundary 測試
- [x] 3.2 修復 ConversationPopover 加入 viewport boundary 檢測和 `max-w-[calc(100vw-2rem)]`
- [x] 3.3 撰寫 DirectoryPicker 小螢幕不溢出測試
- [x] 3.4 修復 DirectoryPicker `w-80` 改為 `w-80 max-w-[calc(100vw-2rem)]`
- [x] 3.5 修復 ModelSelector 下拉選單 `min-w-48 max-w-[min(20rem,calc(100vw-2rem))]`
- [x] 3.6 在 375px 寬度下視覺驗證所有三個下拉選單

## 4. UI/RWD 修正：Header 自適應 (Point 5)

- [x] 4.1 修復 CwdSelector 觸發按鈕 `max-w-40 sm:max-w-56`
- [x] 4.2 修復 ModelSelector 觸發按鈕 `max-w-32 sm:max-w-52`
- [x] 4.3 在 375px 和 320px 寬度下視覺驗證 header toolbar 換行行為

## 5. 提示詞合併：Backend (Point 6)

- [x] 5.1 撰寫 PromptComposer 測試 — 驗證新的 5 段組合順序（不含 AGENT.md、preferences.md）
- [x] 5.2 修改 `composer.ts` — 移除 AGENT.md 和 memory/preferences.md 的讀取段落
- [x] 5.3 撰寫啟動遷移邏輯測試 — 驗證 AGENT.md 和 preferences.md 正確附加到 PROFILE.md 並產生 .bak
- [x] 5.4 實作啟動遷移邏輯（在 `index.ts` 或新檔中）
- [x] 5.5 撰寫 Agent API shim 測試 — GET 回傳空字串，PUT 附加到 PROFILE.md
- [x] 5.6 修改 `routes.ts` — agent endpoint 降級為 shim
- [x] 5.7 撰寫 Preferences API shim 測試
- [x] 5.8 修改 `memory-routes.ts` — preferences endpoint 降級為 shim
- [x] 5.9 執行所有 backend 測試驗證

## 6. 記憶簡化：Backend (Point 7)

- [x] 6.1 撰寫測試 — 驗證 projects/solutions routes 移除後回傳 404
- [x] 6.2 移除 `memory-routes.ts` 中的 projects 和 solutions CRUD routes
- [x] 6.3 執行 backend 測試驗證

## 7. 提示詞合併 + 記憶簡化：Frontend (Points 6, 7)

- [x] 7.1 撰寫 SettingsPanel 測試 — 驗證不包含 Agent 規則 tab、包含 OpenSpec tab
- [x] 7.2 從 SettingsPanel 移除 Agent 規則 tab（TabId、TABS 陣列、渲染邏輯）
- [x] 7.3 建立獨立 OpenSpec tab — 將 OpenSpec SDD toggle + textarea 從舊 AgentTab 搬移到新 OpenSpecTab 元件
- [x] 7.4 撰寫 OpenSpecTab 測試 — 驗證 toggle 開關、啟用時顯示 textarea、切換 skills 啟停
- [x] 7.5 撰寫 MemoryTab 測試 — 驗證不包含偏好/專案/解決方案區段
- [x] 7.6 從 MemoryTab 移除偏好設定、專案、解決方案 UI 和相關 state/handlers
- [x] 7.7 更新 `prompts-api.ts` — 標記 deprecated functions，移除 projects/solutions API
- [x] 7.8 更新 `en.json` 和 `zh-TW.json` — 移除 agent tab i18n key、新增 openspec tab key、移除 memory 子區段 key
- [x] 7.9 執行全部前端測試驗證

## 8. 後端 Settings API (Point 1)

- [x] 8.1 撰寫 SettingsStore 測試 — read/write/patch 操作、預設值、檔案不存在
- [x] 8.2 實作 `backend/src/settings/settings-store.ts`
- [x] 8.3 撰寫 Settings Routes 測試 — GET/PATCH/PUT 端點、auth 保護
- [x] 8.4 實作 `backend/src/settings/routes.ts`
- [x] 8.5 在 `index.ts` 中掛載 `/api/settings` routes
- [x] 8.6 執行 backend 測試驗證

## 9. 前端 Settings 遷移 (Point 1)

- [x] 9.1 撰寫 settings-api 測試
- [x] 9.2 實作 `frontend/src/lib/settings-api.ts`
- [x] 9.3 撰寫 store 設定同步測試 — toggleTheme/setLanguage/toggleSkill 觸發 PATCH
- [x] 9.4 修改 `store/index.ts` — 設定變更時雙寫 localStorage + patchSettings
- [x] 9.5 撰寫 AppShell 啟動載入測試 — 成功載入和 fallback 場景
- [x] 9.6 修改 `AppShell.tsx` — mount 時從後端載入設定、一次性遷移
- [x] 9.7 執行全部前端測試驗證

## 10. AI Cron 工具 (Point 3)

- [x] 10.1 撰寫 `manage_cron_jobs` 工具測試 — list/create/update/delete/trigger/get 六個 action
- [x] 10.2 實作 `backend/src/copilot/tools/cron-tools.ts`
- [x] 10.3 在 `index.ts` 中將 cron tools 加入 self-control tools 陣列
- [x] 10.4 執行 backend 測試驗證

## 11. 輸入歷史 (Point 2)

- [x] 11.1 撰寫 Input 元件歷史導航測試 — ArrowUp/Down、草稿保存、送出重置
- [x] 11.2 修改 Input 元件 — 新增 `inputHistory` prop、historyIndex state、ArrowUp/Down handler
- [x] 11.3 撰寫 ChatView 歷史整合測試 — AI 模式和 Bash 模式分別提取正確歷史
- [x] 11.4 修改 ChatView — 從 messages 提取 inputHistory 並傳入 Input
- [x] 11.5 執行全部前端測試驗證

## 12. 最終驗證

- [x] 12.1 執行 `npm test` 全部 backend 測試通過
- [x] 12.2 執行 `npm test` 全部 frontend 測試通過
- [ ] 12.3 手動驗證：淺色/深色主題切換、tool use 顯示、下拉選單 RWD
- [ ] 12.4 手動驗證：設定面板結構（2 prompt tabs + 簡化記憶）、後端設定持久化
- [ ] 12.5 手動驗證：聊天建立 cron job、輸入歷史回溯
