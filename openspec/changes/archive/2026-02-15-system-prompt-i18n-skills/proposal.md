## Why

目前系統缺少高品質的預設系統提示詞模板（system prompt），使用者必須從零開始撰寫 PROFILE.md 和 AGENT.md 才能有效指導 AI 行為。同時，Settings 面板包含硬編碼的中英文字串，尚未整合現有的 i18n 系統。此外，Copilot SDK 原生支援 `skillDirectories` 和 `disabledSkills` 參數，但專案完全未利用此能力——使用者無法管理可重用的 AI 技能。

**目標使用者**：專案擁有者（單人使用），透過手機瀏覽器操作 AI Terminal。
**使用情境**：使用者開箱即有高品質的 AI 行為指引，可在 Settings 中微調系統提示詞、管理 Skills 技能，並在任何語言設定下獲得一致的 UI 體驗。

## What Changes

- **新增預設系統提示詞模板**：在 `data/prompts/SYSTEM_PROMPT.md` 建立英文預設模板，涵蓋 Identity、Safety、Response Guidelines、Tool Usage、Workspace Context 五大區塊。使用者可在 Settings 中編輯並重置為預設值。
- **Settings 面板全面 i18n**：將 SettingsPanel 所有硬編碼字串遷移至 i18next 翻譯系統，新增 `settings.*` 命名空間的翻譯鍵。
- **Skills 編輯器**：新增完整的 Skills 管理功能，包含後端 SkillFileStore + REST API、前端 Settings Skills tab（建立/編輯/預覽/刪除/啟用停用），並將 `skillDirectories` 和 `disabledSkills` 傳遞給 Copilot SDK。
- **Bug Fix**：修復 `useCopilot.ts` 中 `sendMessage` 未傳送 `activePresets` 至後端的問題。

## 非目標 (Non-Goals)

- 不實作多語系的系統提示詞模板（模板僅提供英文版本，使用者可自行修改為其他語言）
- 不實作 Skill marketplace 或 Skill 匯入/匯出功能
- 不修改 Copilot SDK 的 `mode: 'replace'` 模式（維持 `mode: 'append'`）
- 不實作 Settings 面板以外的 i18n 缺口（其他元件已完成 i18n）
- 不實作 Skill 的版本控制或歷史紀錄

## Capabilities

### New Capabilities

- `skills-management`: Skills 技能的完整生命週期管理——後端 SkillFileStore（`data/skills/` 目錄結構）、REST API CRUD、前端 Skills tab（建立/編輯/預覽/刪除/啟用停用）、Copilot SDK `skillDirectories` 和 `disabledSkills` 整合

### Modified Capabilities

- `system-prompts`: 新增 SYSTEM_PROMPT.md 作為 PromptComposer 的第一個段落；新增 system-prompt API 端點（GET/PUT/POST reset）；新增 Settings System Prompt tab
- `i18n`: 擴展 i18n 涵蓋範圍至 SettingsPanel 的所有 UI 文字，新增 `settings.*` 翻譯鍵

## Impact

**後端檔案**：
- `backend/src/prompts/` — 新增 `defaults.ts`；修改 `file-store.ts`、`composer.ts`、`routes.ts`
- `backend/src/skills/` — 新增 `file-store.ts`、`routes.ts`
- `backend/src/config.ts` — 新增 `skillsPath` 設定
- `backend/src/index.ts` — 掛載 skills 路由、傳遞 skillStore
- `backend/src/copilot/session-manager.ts` — 新增 skillDirectories/disabledSkills 選項
- `backend/src/copilot/stream-manager.ts` — 整合 SkillFileStore
- `backend/src/ws/handlers/copilot.ts` — 提取 disabledSkills payload

**前端檔案**：
- `frontend/src/locales/en.json`、`zh-TW.json` — 新增 settings 翻譯鍵
- `frontend/src/components/settings/SettingsPanel.tsx` — 新增 2 個 tab、全面 i18n
- `frontend/src/lib/prompts-api.ts` — 新增 systemPrompt 和 skills API
- `frontend/src/store/index.ts` — 新增 disabledSkills 狀態
- `frontend/src/hooks/useCopilot.ts` — 傳送 activePresets + disabledSkills

**API 新端點**：
- `GET/PUT /api/prompts/system-prompt`
- `POST /api/prompts/system-prompt/reset`
- `GET/PUT/DELETE /api/skills/:name`
- `GET /api/skills`

**依賴**：無新增外部依賴，全部使用現有 stack。
