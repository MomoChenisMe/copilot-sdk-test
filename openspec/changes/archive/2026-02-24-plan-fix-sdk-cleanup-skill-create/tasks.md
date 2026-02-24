## 1. Backend — 移除 SDK 自動更新功能

- [x] 1.1 撰寫 `sdk-update.ts` 簡化測試：更新 `backend/tests/copilot/sdk-update.test.ts`，移除 `getLatestVersion`、`checkForUpdate`、`getChangelog`、`performUpdate` 測試套件，只保留 `getInstalledVersion` 測試，驗證測試通過
- [x] 1.2 簡化 `SdkUpdateChecker` class：修改 `backend/src/copilot/sdk-update.ts`，移除 `latestVersionCache` 屬性、`NPM_REGISTRY_URL`/`GITHUB_RELEASES_URL`/`CACHE_TTL_MS` 常數、`getLatestVersion()`/`checkForUpdate()`/`getChangelog()`/`performUpdate()` 方法、`exec`/`child_process` import，只保留 `getInstalledVersion()`
- [x] 1.3 撰寫 `sdk-update-route.ts` 簡化測試：更新 `backend/tests/copilot/sdk-update-route.test.ts`，移除 `/sdk-changelog` 和 `/sdk-update` 測試，修改 `/sdk-version` 測試驗證回傳 `{ currentVersion }` 格式
- [x] 1.4 簡化 SDK 版本 route：修改 `backend/src/copilot/sdk-update-route.ts`，移除 `GET /sdk-changelog` 和 `POST /sdk-update` endpoint，修改 `GET /sdk-version` 呼叫 `getInstalledVersion()` 回傳 `{ currentVersion }`
- [x] 1.5 執行 backend 測試驗證：`cd backend && npx vitest run tests/copilot/sdk-update` 確認全部通過

## 2. Frontend — 移除 SDK 更新 UI

- [x] 2.1 刪除 `SdkUpdateBanner` 測試：刪除 `frontend/tests/components/copilot/SdkUpdateBanner.test.tsx`
- [x] 2.2 刪除 `SdkUpdateBanner` 元件：刪除 `frontend/src/components/copilot/SdkUpdateBanner.tsx`
- [x] 2.3 清理 `AppShell.tsx`：修改 `frontend/src/components/layout/AppShell.tsx`，移除 `SdkUpdateBanner` import（line 27）、`settings:analyzeChanges` event listener useEffect（lines 579-589）、`<SdkUpdateBanner />` 元件使用（line 689）
- [x] 2.4 撰寫 `SettingsPanel` 簡化測試：更新 `frontend/tests/components/settings/SettingsPanel.test.tsx`，移除 SDK Analyze Changes 測試套件，更新 `/api/copilot/sdk-version` mock 回傳 `{ currentVersion }` 格式
- [x] 2.5 簡化 `SettingsPanel` SDK 區段：修改 `frontend/src/components/settings/SettingsPanel.tsx`，移除 `sdkLatestVersion`/`sdkUpdateAvailable`/`analyzingChanges`/`checking`/`updatingSdk` state，簡化 `fetchVersionInfo` 只取 `{ currentVersion }`，移除 `handleCheckForUpdates`/`handleUpdateSdk`/`handleAnalyzeChanges` handler，將 SDK UI 區段改為只顯示版本號
- [x] 2.6 清理 locale 檔案：修改 `frontend/src/locales/en.json` 和 `frontend/src/locales/zh-TW.json`，將 `sdk` 區段只保留 `versionUnknown` key
- [x] 2.7 執行 frontend 測試驗證：`cd frontend && npx vitest run` 確認全部通過

## 3. Backend — Plan 模式 prompt 與內容解析

- [x] 3.1 撰寫 `extractPlanContent` 測試：新增或更新 `backend/tests/copilot/plan-writer.test.ts`，涵蓋以下場景：有對話前言 + heading、直接以 heading 開頭、無 heading、空字串、heading level 1-3
- [x] 3.2 實作 `extractPlanContent` 函式：修改 `backend/src/copilot/plan-writer.ts`，新增 export function `extractPlanContent(raw: string): string`
- [x] 3.3 撰寫 stream-manager plan 內容過濾測試：更新 `backend/tests/copilot/stream-manager.test.ts`，驗證 plan mode idle 事件會使用 `extractPlanContent` 過濾 plan content
- [x] 3.4 整合 `extractPlanContent` 到 stream-manager：修改 `backend/src/copilot/stream-manager.ts`，在 import 加入 `extractPlanContent`（line 13），在 `copilot:idle` handler（line 953）使用 `extractPlanContent()` 處理 plan content
- [x] 3.5 修改 `DEFAULT_PLAN_PROMPT`：修改 `backend/src/prompts/defaults.ts`，在 `DEFAULT_PLAN_PROMPT` 的 Plan Mode Rules 區段後新增 Output Format Rules 區段
- [x] 3.6 執行 backend 測試驗證：`cd backend && npx vitest run tests/copilot/plan-writer tests/copilot/stream-manager` 確認全部通過

## 4. Skill — 建立 SDK 更新分析技能

- [x] 4.1 建立技能目錄結構：建立 `.claude/skills/sdk-update-analyzer/` 和 `.claude/skills/sdk-update-analyzer/references/` 目錄
- [x] 4.2 撰寫 SKILL.md：建立 `.claude/skills/sdk-update-analyzer/SKILL.md`，包含 YAML frontmatter（name + description）和 6 步驟分析工作流、輸出格式定義
- [x] 4.3 撰寫整合點參考文件：建立 `.claude/skills/sdk-update-analyzer/references/project-integration-points.md`，記錄所有 SDK 整合點（client-manager、stream-manager、event-relay、session-manager、permission、sdk-update）及高敏感區域

## 5. 全面驗證

- [x] 5.1 執行完整 backend 測試套件：`cd backend && npx vitest run`
- [x] 5.2 執行完整 frontend 測試套件：`cd frontend && npx vitest run`
- [x] 5.3 手動驗證：確認 Settings 只顯示版本號、無 SdkUpdateBanner、Plan 模式 artifact 品質正常

## 6. 追加修復 — Plan 模式語言強制

- [x] 6.1 在 `DEFAULT_PLAN_PROMPT` 的 Output Format Rules 新增語言遵循規則：修改 `backend/src/prompts/defaults.ts`，要求 plan 文件必須遵循系統 prompt 中的 Language 指令
