## 1. 修復 Scroll-to-bottom 按鈕過早出現

- [x] 1.1 撰寫 ChatView auto-scroll useEffect 的測試：驗證 DOM 未掛載時不遞增 unreadCount、內容未溢出時不顯示按鈕、自動捲動後內容未溢出時重置按鈕狀態
- [x] 1.2 修改 `frontend/src/components/copilot/ChatView.tsx` 的 auto-scroll useEffect：增加 `if (!el) return` 早期退出、auto-scroll 後檢查 `scrollHeight <= clientHeight + threshold` 重置按鈕、else 分支增加 `scrollHeight > clientHeight` 守衛
- [x] 1.3 執行測試驗證所有 scroll-to-bottom 相關場景通過

## 2. 重構技能管理 UI 佈局

- [x] 2.1 撰寫 SkillsTab 佈局測試：驗證安裝區（ZIP/URL/AI）顯示在使用者技能列表下方、「新增技能」按鈕不存在、手動建立表單不存在、空狀態時直接顯示安裝區
- [x] 2.2 修改 `frontend/src/components/settings/SettingsPanel.tsx` 的 SkillsTab：將 install section 從頂部移至 User Skills section 底部
- [x] 2.3 刪除「新增技能」按鈕（`new-skill-button`）和手動建立表單（`showCreate` 相關 JSX）
- [x] 2.4 刪除相關 state 和 callback：`showCreate`、`newName`、`newDescription`、`newContent`、`nameError`、`handleCreate`
- [x] 2.5 修改空狀態渲染：將原本的「新增技能」按鈕改為直接顯示 install section
- [x] 2.6 執行測試驗證 SkillsTab 佈局和功能正確

## 3. 修復 SDK 版本檢測錯誤

- [x] 3.1 撰寫 `SdkUpdateChecker.getInstalledVersion()` 測試：驗證 resolve 主入口 → 向上查找策略、package.json exports 不導出 `./package.json` 時不報錯、fallback 到候選路徑
- [x] 3.2 修改 `backend/src/copilot/sdk-update.ts` 的 Strategy 1：改用 `require.resolve('@github/copilot-sdk')` resolve 主入口，再 `dirname` 向上遍歷查找 `package.json`（驗證 `pkg.name`）
- [x] 3.3 執行後端測試和啟動驗證，確認不再出現 `ERR_PACKAGE_PATH_NOT_EXPORTED` 警告

## 4. 優化 Plan/Act Mode 系統提示詞

- [x] 4.1 撰寫 DEFAULT_SYSTEM_PROMPT 內容測試：驗證包含 Act Mode 四個子區段（Doing Tasks、Executing Actions with Care、Tool Usage、Response Guidelines）、Plan Mode 四步驟工作流程、無獨立重複的 `## Tool Usage` 和 `## Response Guidelines` 頂層區段
- [x] 4.2 修改 `backend/src/prompts/defaults.ts`：替換 `## Modes of Operation` 區段為結構化的 Act Mode + Plan Mode 內容
- [x] 4.3 刪除或合併原有獨立的 `## Tool Usage` 和 `## Response Guidelines` 區段（避免重複）
- [x] 4.4 執行測試驗證系統提示詞內容正確

## 5. 整合驗證

- [x] 5.1 執行全部前端測試（`npm run test -w frontend`）
- [x] 5.2 執行全部後端測試（`npm run test -w backend`）
- [x] 5.3 啟動開發伺服器手動驗證：scroll 按鈕行為、技能管理佈局、無 SDK 警告、系統提示詞內容
