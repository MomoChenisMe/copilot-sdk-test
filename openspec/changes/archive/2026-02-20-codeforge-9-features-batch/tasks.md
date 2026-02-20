## 1. Phase 1A — 品牌重塑：重命名為 CodeForge

- [x] 1.1 撰寫 localStorage 遷移函式測試（`ai-terminal:*` → `codeforge:*` key 遷移、舊 key 刪除、無舊 key 時不報錯）
- [x] 1.2 實作 localStorage 遷移函式於 `frontend/src/store/index.ts`，在 store 初始化最前端執行
- [x] 1.3 更新 `package.json`（root: `codeforge`、backend: `codeforge-backend`、frontend: `codeforge-frontend`）
- [x] 1.4 更新後端品牌引用：`backend/src/index.ts` log message、`backend/src/prompts/defaults.ts` 所有 "AI Terminal" → "CodeForge"
- [x] 1.5 撰寫 PromptComposer `.codeforge.md` fallback 測試（優先讀 `.codeforge.md`、不存在時 fallback `.ai-terminal.md`）
- [x] 1.6 實作 `backend/src/prompts/composer.ts` 支援 `.codeforge.md`（含 `.ai-terminal.md` backward compat）
- [x] 1.7 更新前端 i18n：`frontend/src/locales/en.json` 和 `zh-TW.json` 所有 "AI Terminal" → "CodeForge"
- [x] 1.8 更新 `frontend/src/store/index.ts` 所有 localStorage key 前綴 `'ai-terminal:'` → `'codeforge:'`
- [x] 1.9 更新 `README.md` 標題和描述
- [x] 1.10 執行全套測試驗證：`npm run test --workspace=backend && npm run test --workspace=frontend`

## 2. Phase 1B — Bash 歷史持久化修復

- [x] 2.1 撰寫 `bash-exec.ts` 擴展回調簽名測試：`onBashComplete` 應傳遞 `meta: { user, hostname, gitBranch }`
- [x] 2.2 實作 `backend/src/ws/handlers/bash-exec.ts` 擴展 `onBashComplete` 回調，傳遞 `user`、`hostname`、`gitBranch`
- [x] 2.3 撰寫 bash 雙訊息持久化測試：每次 bash 執行應存 user 訊息（純指令）+ assistant 訊息（輸出 + 完整 metadata）
- [x] 2.4 實作 `backend/src/index.ts` 修改 `onBashComplete` 回調，存兩筆訊息（user command + assistant output）
- [x] 2.5 撰寫 MessageBlock bash 向後相容測試：舊格式（content 以 `$ ` 開頭的 user message）strip 前綴避免雙重 `$`
- [x] 2.6 實作 `frontend/src/components/copilot/MessageBlock.tsx` 修復 user bash 渲染邏輯
- [x] 2.7 執行測試驗證：`npm run test --workspace=backend && npm run test --workspace=frontend`

## 3. Phase 1C — 模型選擇器 Premium Multiplier

- [x] 3.1 撰寫 `model-multipliers.ts` 映射表測試：已知模型回傳正確倍率、未知模型回傳 null
- [x] 3.2 建立 `backend/src/copilot/model-multipliers.ts` 靜態映射表
- [x] 3.3 撰寫 models-route 倍率 enrich 測試：API 回傳應包含 `premiumMultiplier` 欄位
- [x] 3.4 實作 `backend/src/copilot/models-route.ts` enrich 模型資料加入 multiplier
- [x] 3.5 更新 `frontend/src/store/index.ts` ModelInfo interface 新增 `premiumMultiplier?: number | null`
- [x] 3.6 撰寫 ModelSelector 倍率 badge 渲染測試：各色彩區間正確、null 時不顯示
- [x] 3.7 實作 `frontend/src/components/copilot/ModelSelector.tsx` 倍率 badge UI
- [x] 3.8 執行測試驗證

## 4. Phase 2A — 系統提示詞重新設計

- [x] 4.1 撰寫 DEFAULT_SYSTEM_PROMPT 測試：應包含 "CodeForge"、不含 "AI Terminal"、包含所有功能關鍵字
- [x] 4.2 重寫 `backend/src/prompts/defaults.ts` DEFAULT_SYSTEM_PROMPT（涵蓋 multi-tab、plan mode、skills、memory、MCP、artifacts、tasks、bash、web search）
- [x] 4.3 執行後端測試驗證

## 5. Phase 2B — /context 指令

- [x] 5.1 撰寫 `GET /api/copilot/context` API 測試：回傳 systemPrompt layers、skills、mcp、model、sdkVersion
- [x] 5.2 建立 `backend/src/copilot/context-route.ts` 實作 context API
- [x] 5.3 在 `backend/src/index.ts` 註冊 context route
- [x] 5.4 撰寫前端 `/context` slash command 測試：命令應觸發 API 呼叫並插入格式化系統訊息
- [x] 5.5 實作 `frontend/src/components/copilot/ChatView.tsx` 新增 `/context` 到 slash commands 列表和處理邏輯
- [x] 5.6 新增 i18n key：`slashCommand.contextDesc`、context 結果的各 section 標籤
- [x] 5.7 執行測試驗證

## 6. Phase 2C — 技能管理改善

- [x] 6.1 安裝 `adm-zip` 依賴：`npm install adm-zip --workspace=backend && npm install @types/adm-zip -D --workspace=backend`
- [x] 6.2 撰寫 skill-installer 測試：ZIP 解壓、SKILL.md 驗證、路徑穿越拒絕、大小限制
- [x] 6.3 建立 `backend/src/skills/skill-installer.ts` 實作 ZIP 解壓安裝
- [x] 6.4 撰寫 `POST /api/skills/upload` route 測試：multipart upload → 安裝成功
- [x] 6.5 實作 `backend/src/skills/routes.ts` 新增 upload 端點
- [x] 6.6 撰寫 `POST /api/skills/install-url` route 測試：URL 下載 → 安裝成功、GitHub URL 轉換
- [x] 6.7 實作 `backend/src/skills/routes.ts` 新增 install-url 端點
- [x] 6.8 撰寫前端技能上傳 UI 測試：拖放上傳區域、URL 輸入框、「AI 建立技能」按鈕
- [x] 6.9 實作 `frontend/src/components/settings/SettingsPanel.tsx` SkillsTab 新增上傳/URL/AI 建立 UI
- [x] 6.10 新增 i18n key：`skills.upload`、`skills.installFromUrl`、`skills.createWithAI`、相關進度和錯誤訊息
- [x] 6.11 執行測試驗證

## 7. Phase 2D — SDK 升級優化建議

- [x] 7.1 撰寫 `SdkUpdateChecker.getChangelog` 測試：GitHub API 成功、fallback npm registry、兩者失敗回傳 null
- [x] 7.2 實作 `backend/src/copilot/sdk-update.ts` 新增 `getChangelog(from, to)` 方法
- [x] 7.3 撰寫 changelog route 測試
- [x] 7.4 實作 `backend/src/copilot/sdk-update-route.ts` 擴展回傳 changelog 或新增 changelog 端點
- [x] 7.5 撰寫前端「分析更新內容」按鈕測試
- [x] 7.6 實作 SettingsPanel GeneralTab 新增「分析更新內容」按鈕和邏輯（關閉設定 → 發送 copilot 訊息）
- [x] 7.7 新增 i18n key：`sdk.analyzeChanges`、`sdk.changelogUnavailable`
- [x] 7.8 執行測試驗證

## 8. Phase 3A — Plan Mode Markdown 檔案輸出

- [x] 8.1 撰寫 plan-writer 測試：檔案路徑格式、目錄建立、slug 生成、寫入內容正確
- [x] 8.2 建立 `backend/src/copilot/plan-writer.ts` 實作 `writePlanFile()`
- [x] 8.3 撰寫 DB migration 測試：conversations 表新增 `plan_file_path` 欄位
- [x] 8.4 實作 `backend/src/conversation/db.ts` schema migration 新增 `plan_file_path TEXT`
- [x] 8.5 實作 `backend/src/conversation/repository.ts` update/getById 支援 `planFilePath`
- [x] 8.6 撰寫 stream-manager plan mode idle 寫入測試：plan mode + idle → 呼叫 writePlanFile
- [x] 8.7 實作 `backend/src/copilot/stream-manager.ts` 在 `copilot:idle` 時寫入 plan 檔案
- [x] 8.8 更新 `frontend/src/store/index.ts` TabState 新增 `planFilePath: string | null`
- [x] 8.9 實作 `frontend/src/hooks/useTabCopilot.ts` 在 `copilot:idle` handler 提取 `planFilePath`
- [x] 8.10 撰寫前端 plan-complete prompt 顯示檔案路徑測試
- [x] 8.11 實作 `frontend/src/components/copilot/ChatView.tsx` plan-complete prompt 顯示 planFilePath
- [x] 8.12 新增 i18n key：`planMode.planSaved`
- [x] 8.13 執行測試驗證

## 9. Phase 3B — Plan Mode 執行流程

- [x] 9.1 撰寫 `copilot:execute_plan` WebSocket handler 測試：讀取 plan 檔案、清除 session、切換 act mode、啟動串流
- [x] 9.2 實作 `backend/src/ws/handlers/copilot.ts` 新增 `copilot:execute_plan` 訊息處理
- [x] 9.3 撰寫前端 plan-complete UI 測試：「繼續規劃」和「開始執行」按鈕行為
- [x] 9.4 實作 `frontend/src/components/copilot/ChatView.tsx` 替換 plan-complete prompt 按鈕
- [x] 9.5 新增 i18n key：`planMode.executePlan`、`planMode.continuePlanning`
- [x] 9.6 執行全套測試驗證：`npm run test --workspace=backend && npm run test --workspace=frontend`

## 10. 最終整合驗證

- [x] 10.1 全套測試驗證通過：990 backend + 931 frontend = 1,921 tests ALL PASS
- [x] 10.2 確認所有 UI 顯示 "CodeForge"（無任何 "AI Terminal" 殘留）— 自動搜尋通過，僅測試反向斷言殘留
- [x] 10.3 確認 bash 歷史在重啟後正確保留（BashPrompt + BashOutput 渲染）
- [x] 10.4 確認模型選擇器顯示正確的 premium multiplier badge
- [x] 10.5 確認 `/context` 指令回傳完整系統上下文
- [x] 10.6 確認技能上傳（ZIP）、URL 安裝、AI 建立三種路徑都能正常運作
- [x] 10.7 確認 plan mode 完成後 markdown 檔案正確寫入 `.codeforge/plans/`
- [x] 10.8 確認「開始執行」流程：context 清除 → 以 plan 內容開始新串流
