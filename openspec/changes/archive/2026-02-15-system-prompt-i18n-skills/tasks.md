## 1. Settings i18n（無依賴，建立翻譯鍵模式）

- [x] 1.1 撰寫 SettingsPanel i18n 測試——驗證所有 tab 名稱、按鈕、toast 使用 `t()` 翻譯鍵（更新 `frontend/tests/components/settings/SettingsPanel.test.tsx`）
- [x] 1.2 新增 `settings.*` 翻譯鍵至 `frontend/src/locales/en.json`（settings.title, settings.tabs.*, settings.save, settings.toast.*, settings.memory.*, settings.deleteDialog.*, settings.systemPrompt.*, settings.skills.*）
- [x] 1.3 新增 `settings.*` 翻譯鍵至 `frontend/src/locales/zh-TW.json`（對應繁中翻譯）
- [x] 1.4 重構 `SettingsPanel.tsx` 將所有硬編碼字串替換為 `t()` 呼叫——TABS 陣列改用 `labelKey`，每個子元件加入 `useTranslation()`
- [x] 1.5 修改 tab 容器 CSS：加入 `overflow-x-auto`，tab 按鈕從 `flex-1` 改為 `shrink-0 px-3`
- [x] 1.6 執行 `cd frontend && npx vitest run` 驗證所有測試通過

## 2. 預設系統提示詞模板（後端）

- [x] 2.1 撰寫 `DEFAULT_SYSTEM_PROMPT` 常數測試——驗證內容非空、包含五大段落標題（新建 `backend/tests/prompts/defaults.test.ts`）
- [x] 2.2 實作 `backend/src/prompts/defaults.ts`——匯出 `DEFAULT_SYSTEM_PROMPT` 常數（英文，涵蓋 Identity & Role、Safety & Ethics、Response Guidelines、Tool Usage、Workspace Context）
- [x] 2.3 撰寫 PromptFileStore 測試——驗證 `ensureDirectories()` 在 SYSTEM_PROMPT.md 不存在時以預設內容建立（更新 `backend/tests/prompts/file-store.test.ts`）
- [x] 2.4 修改 `backend/src/prompts/file-store.ts` `ensureDirectories()` 新增 SYSTEM_PROMPT.md 初始化邏輯
- [x] 2.5 撰寫 PromptComposer 測試——驗證組裝順序為 SYSTEM_PROMPT → PROFILE → AGENT → Presets → Memory → .ai-terminal.md（更新 `backend/tests/prompts/composer.test.ts`）
- [x] 2.6 修改 `backend/src/prompts/composer.ts` `compose()` 在最前面插入 SYSTEM_PROMPT.md
- [x] 2.7 撰寫 system-prompt API 路由測試——GET/PUT/POST reset 三個端點（更新 `backend/tests/prompts/routes.test.ts`）
- [x] 2.8 修改 `backend/src/prompts/routes.ts` 新增 system-prompt 端點（GET、PUT、POST reset），import `DEFAULT_SYSTEM_PROMPT`
- [x] 2.9 執行 `cd backend && npx vitest run` 驗證所有測試通過

## 3. 預設系統提示詞模板（前端）

- [x] 3.1 撰寫前端 API 測試——驗證 `getSystemPrompt`、`putSystemPrompt`、`resetSystemPrompt` 方法（更新 `frontend/tests/lib/prompts-api.test.ts`）
- [x] 3.2 修改 `frontend/src/lib/prompts-api.ts` 新增 systemPrompt API 方法
- [x] 3.3 撰寫 SystemPromptTab 測試——驗證渲染、儲存、重置功能（更新 `frontend/tests/components/settings/SettingsPanel.test.tsx`）
- [x] 3.4 實作 `SystemPromptTab` 元件（textarea + Save + Reset to Default），新增為 SettingsPanel 第一個 tab
- [x] 3.5 執行 `cd frontend && npx vitest run` 驗證所有測試通過

## 4. Skills 編輯器（後端 — Store + API）

- [x] 4.1 撰寫 SkillFileStore 測試——CRUD 操作 + `getSkillDirectories()` + 空目錄處理（新建 `backend/tests/skills/file-store.test.ts`）
- [x] 4.2 實作 `backend/src/skills/file-store.ts`——SkillFileStore class（ensureDirectory、listSkills、readSkill、writeSkill、deleteSkill、getSkillDirectories）
- [x] 4.3 撰寫 Skills 路由測試——所有 CRUD 端點 + 名稱驗證（新建 `backend/tests/skills/routes.test.ts`）
- [x] 4.4 實作 `backend/src/skills/routes.ts`——createSkillsRoutes() factory function
- [x] 4.5 修改 `backend/src/config.ts` 新增 `skillsPath` 設定（預設 `'./data/skills'`，env `SKILLS_PATH`）
- [x] 4.6 修改 `backend/src/index.ts`——import SkillFileStore + createSkillsRoutes，建立 skillStore 並掛載 `/api/skills` 路由
- [x] 4.7 執行 `cd backend && npx vitest run` 驗證所有測試通過

## 5. Skills 編輯器（後端 — SDK 整合）

- [x] 5.1 撰寫 SessionManager 測試——驗證 `skillDirectories` 和 `disabledSkills` 傳遞至 sessionConfig（更新 `backend/tests/copilot/session-manager.test.ts`）
- [x] 5.2 修改 `backend/src/copilot/session-manager.ts`——CreateSessionOptions + GetOrCreateSessionOptions 新增 skillDirectories/disabledSkills，createSession() 中加入 sessionConfig
- [x] 5.3 撰寫 StreamManager 測試——驗證 skillStore 整合和 disabledSkills 傳遞（更新 `backend/tests/copilot/stream-manager.test.ts`）
- [x] 5.4 修改 `backend/src/copilot/stream-manager.ts`——StreamManagerDeps 新增 `skillStore?: SkillFileStore`，StartStreamOptions 新增 `disabledSkills`，startStream() 中傳遞 skill 配置
- [x] 5.5 撰寫 WS handler 測試——驗證 `copilot:send` 提取 disabledSkills（更新 `backend/tests/ws/handlers/copilot.test.ts`）
- [x] 5.6 修改 `backend/src/ws/handlers/copilot.ts`——提取 `payload.disabledSkills`，傳給 `streamManager.startStream()`
- [x] 5.7 修改 `backend/src/index.ts`——將 `skillStore` 傳給 `StreamManager.getInstance()`
- [x] 5.8 執行 `cd backend && npx vitest run` 驗證所有測試通過

## 6. Skills 編輯器（前端）

- [x] 6.1 撰寫前端 Skills API 測試——驗證 `skillsApi.list/get/put/delete` 方法（更新 `frontend/tests/lib/prompts-api.test.ts`）
- [x] 6.2 修改 `frontend/src/lib/prompts-api.ts` 新增 `SkillItem`、`SkillList` 型別和 `skillsApi` 物件
- [x] 6.3 撰寫 Zustand store 測試——驗證 `disabledSkills` 狀態和 `toggleSkill` action（更新 `frontend/tests/store/settings.test.ts`）
- [x] 6.4 修改 `frontend/src/store/index.ts` 新增 `disabledSkills` 和 `toggleSkill`（localStorage 持久化）
- [x] 6.5 撰寫 useCopilot 測試——驗證 `sendMessage` 包含 `activePresets` + `disabledSkills`（更新 `frontend/tests/hooks/useCopilot.test.ts`）
- [x] 6.6 修改 `frontend/src/hooks/useCopilot.ts` `sendMessage()`——從 store 取得並傳送 `activePresets` + `disabledSkills`
- [x] 6.7 撰寫 SkillsTab 測試——列表渲染、toggle、建立、編輯、預覽、刪除（更新 `frontend/tests/components/settings/SettingsPanel.test.tsx`）
- [x] 6.8 實作 `SkillsTab` 元件——列表 + toggle + 建立表單 + 編輯/預覽 + 刪除確認，加入 SettingsPanel 最後一個 tab
- [x] 6.9 執行 `cd frontend && npx vitest run` 驗證所有測試通過

## 7. 整合驗證

- [x] 7.1 執行全專案測試 `cd backend && npx vitest run && cd ../frontend && npx vitest run`
- [x] 7.2 手動驗證：Settings → System Prompt tab 顯示預設模板、編輯 → Save → 重新開啟確認、Reset to Default 恢復原始
- [x] 7.3 手動驗證：切換語言 en ↔ zh-TW，確認 Settings 所有文字正確切換
- [x] 7.4 手動驗證：Skills tab → 建立新 skill → toggle 啟用/停用 → 編輯/預覽 → 刪除 → 發送訊息確認 SDK 接收
