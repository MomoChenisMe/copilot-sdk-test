## 1. F1 — 頁簽關閉後無限 Loading Bug 修復

- [x] 1.1 撰寫 handleCloseTab lazy-load 觸發測試：驗證關閉 tab 後 handleSelectTab 被呼叫
- [x] 1.2 修改 `AppShell.tsx` handleCloseTab：替換手動 setActiveConversationId 為 handleSelectTab(newActiveTabId)
- [x] 1.3 撰寫 edge case 測試：關閉最後一個 tab 時 activeTabId 為 null 不呼叫 handleSelectTab
- [x] 1.4 驗證編譯通過 + 手動測試：開多個頁簽 → 關閉執行中頁簽 → 確認不卡 Loading

## 2. F2 — OpenSpec 總覽顯示 config.yaml

- [x] 2.1 修改 `openspec-api.ts` OverviewData interface：欄位名對齊後端（changesCount/specsCount/archivedCount）+ 新增 config 欄位
- [x] 2.2 撰寫 OpenSpecOverview config 顯示測試：驗證 Tab 切換卡片渲染 project_description 和 output_rules
- [x] 2.3 修改 `OpenSpecOverview.tsx`：修正 stats 欄位引用 + 新增 Tab 切換卡片（專案說明/產出規則）以 Markdown 渲染
- [x] 2.4 撰寫 config 為 null 和欄位缺失的 edge case 測試
- [x] 2.5 新增 i18n keys：en.json / zh-TW.json 加入 openspecPanel.overview.config 等翻譯
- [x] 2.6 驗證編譯通過 + 手動測試：OpenSpec 面板 → 總覽 → 確認 config 卡片正常顯示

## 3. F3 — AI/Bash 快捷切換 + Plan 模式 Disabled

- [x] 3.1 撰寫 Cmd/Ctrl+Shift+Tab toggle 測試：驗證 copilot↔terminal 模式切換
- [x] 3.2 修改 `useGlobalShortcuts.ts`：新增 onToggleAiBash action + Cmd/Ctrl+Shift+Tab handler，移除 onToggleAiMode/onToggleBashMode 及 Alt+Shift+A/B
- [x] 3.3 修改 `AppShell.tsx`：接線 onToggleAiBash handler，移除舊 onToggleAiMode/onToggleBashMode handler
- [x] 3.4 撰寫 Plan toggle terminal 模式阻擋測試：驗證 terminal 模式下 Shift+Tab 不切換 planMode
- [x] 3.5 修改 `AppShell.tsx` onTogglePlanMode handler：新增 `tab.mode === 'terminal'` 檢查
- [x] 3.6 撰寫 PlanActToggle disabled 測試：驗證 isTerminalMode 時 disabled={true}
- [x] 3.7 修改 `ChatView.tsx`：PlanActToggle disabled 條件加上 `|| isTerminalMode`
- [x] 3.8 更新 SHORTCUT_DEFINITIONS：移除 aiMode/bashMode，新增 toggleAiBash
- [x] 3.9 新增 i18n keys：shortcuts.toggleAiBash 翻譯
- [x] 3.10 驗證編譯通過 + 手動測試：Cmd+Shift+Tab 切換 → Bash 模式下 Plan toggle disabled
- [x] 3.11 修改 `ChatView.tsx`：terminal 模式下隱藏 WebSearchToggle 和排程按鈕（兩處 leftActions）
- [x] 3.12 修改 `MobileToolbarPopup`：terminal 模式下隱藏 Web Search toggle 區塊 + Plan/Act 按鈕 disabled
- [x] 3.13 驗證編譯通過 + 手動測試：切換 Bash 模式 → 確認搜尋和排程按鈕消失，切回 AI 模式 → 按鈕恢復

## 4. F4 — SDK 版本檢查與手動更新

- [x] 4.1 撰寫 SDK 版本比較顯示測試：驗證 current→latest 版本、badge、up-to-date 狀態
- [x] 4.2 撰寫「檢查更新」按鈕測試：驗證點擊觸發 GET /api/copilot/sdk-version
- [x] 4.3 撰寫「更新 SDK」按鈕測試：驗證點擊觸發 POST /api/copilot/sdk-update + toast 通知
- [x] 4.4 修改 `SettingsPanel.tsx` GeneralTab SDK 區塊：版本比較顯示 + 檢查更新按鈕 + 更新 SDK 按鈕
- [x] 4.5 新增 i18n keys：sdk.updateAvailable / sdk.upToDate / sdk.checkForUpdates / sdk.updateSdk / sdk.updateSuccess / sdk.updateFailed
- [x] 4.6 驗證編譯通過 + 手動測試：設定 → 一般 → 版本顯示 + 按鈕互動

## 5. F5 — OpenSpec 技能 UI 標記

- [x] 5.1 撰寫 SettingsPanel SkillsTab OpenSpec badge 測試：驗證 openspec-* 技能顯示紫色 badge
- [x] 5.2 修改 `SettingsPanel.tsx` SkillsTab：system skills 和 user skills 列表新增 OpenSpec badge
- [x] 5.3 撰寫 SlashCommandMenu OpenSpec badge 測試：驗證 openspec-* 指令顯示 badge
- [x] 5.4 修改 `SlashCommandMenu.tsx` CommandItem：新增 OpenSpec badge
- [x] 5.5 新增 i18n keys：settings.skills.openspecBadge 翻譯
- [x] 5.6 驗證編譯通過 + 手動測試：設定 → 技能 → 確認 badge 顯示；Slash command 選單同理

## 6. F6 — OpenSpec CWD 動態路徑解析

- [x] 6.1 修改後端 `openspec-routes.ts`：新增 `resolveService(req)` 函式，從 `?cwd=` query 解析 openspec 路徑，fallback 到 default
- [x] 6.2 修改後端 `openspec-routes.ts`：所有 route handler 改用 `resolveService(req)` 取得動態 service 實例
- [x] 6.3 修改後端 `index.ts`：傳入 `defaultBasePath` string 取代 service instance，移除 OpenSpecService import
- [x] 6.4 修改前端 `openspec-api.ts`：所有 API 函式新增 optional `cwd` 參數，附加到 URL query string + OverviewData 新增 resolvedPath
- [x] 6.5 修改前端 `OpenSpecPanel.tsx`：取得 active tab 對應的 conversation CWD，傳入所有 openspecApi 呼叫
- [x] 6.6 修改前端 `OpenSpecPanel.tsx`：當 active tab 切換時（CWD 變更），自動 refresh 面板資料（useRef + useEffect）
- [x] 6.7 修改前端 `OpenSpecPanel.tsx` header：顯示 resolvedPath 指示器 + Project/Default badge
- [x] 6.8 新增 i18n keys：openspecPanel.usingProject / openspecPanel.usingDefault（en.json + zh-TW.json）
- [x] 6.9 驗證編譯通過 + 手動測試：切換不同 CWD 的 tab → 確認 OpenSpec 面板顯示對應專案的 openspec 資料
