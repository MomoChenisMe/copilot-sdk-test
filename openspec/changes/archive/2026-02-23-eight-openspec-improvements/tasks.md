## 1. 修復 Task Checkbox Toggle Bug

- [x] 1.1 撰寫 `OpenSpecChangeDetail` checkbox toggle 測試：驗證 `handleTaskToggle` 傳送 `line.text` 而非 `line.raw`
- [x] 1.2 修改 `OpenSpecChangeDetail.tsx` 三處：line 139 `line.raw` → `line.text`、line 300 batch mark `t.raw` → `t.text`、line 307 batch reset `t.raw` → `t.text`
- [x] 1.3 驗證測試通過 + 手動測試勾選/取消勾選、批次全部完成/重置
## 2. 修復差異規格頁面 — 後端 API

- [x] 2.1 撰寫 `getDeltaSpecFile()` 單元測試：驗證讀取 `changes/{name}/specs/{specName}/spec.md` 內容
- [x] 2.2 在 `openspec-service.ts` 實作 `getDeltaSpecFile(changeName, specName)` 方法
- [x] 2.3 撰寫 `GET /changes/:name/specs/:specName` 路由測試：驗證 200 回傳內容、404 不存在
- [x] 2.4 在 `openspec-routes.ts` 新增 `GET /changes/:name/specs/:specName` 路由（放在 `GET /changes/:name` 之前）
- [x] 2.5 驗證後端測試全部通過

## 3. 修復差異規格頁面 — 前端 Accordion UI

- [x] 3.1 在 `openspec-api.ts` 新增 `getDeltaSpec(changeName, specName, cwd?)` API 方法
- [x] 3.2 撰寫 `DeltaSpecsView` 元件測試：驗證 accordion 展開/摺疊、載入/快取行為
- [x] 3.3 重構 `DeltaSpecsView` 元件：新增 `changeName`、`cwd` props，實作 accordion 展開/摺疊 + 按需載入 + 內容快取 + Markdown 渲染
- [x] 3.4 修改 `OpenSpecChangeDetail` 傳入 `changeName` 和 `cwd` props 到 `DeltaSpecsView`
- [x] 3.5 新增 i18n keys：`openspecPanel.detail.loadingSpec`、`openspecPanel.detail.specLoadError`（en.json + zh-TW.json）
- [x] 3.6 驗證前端測試通過 + 視覺確認 accordion 展開顯示 spec 內容

## 4. OpenSpec Init 按鈕 + CLI 檢測

- [x] 4.1 撰寫 `isCliAvailable()` 單元測試：驗證 CLI 存在/不存在時的回傳
- [x] 4.2 在 `openspec-service.ts` 實作 static `isCliAvailable()` 和 `initOpenspec(cwd)` 方法
- [x] 4.3 撰寫 `POST /api/openspec/init` 路由測試：驗證 200 成功、400 無效 cwd、503 CLI 不可用
- [x] 4.4 在 `openspec-routes.ts` 新增 `POST /init` 路由
- [x] 4.5 在 `openspec-api.ts` 新增 `initOpenspec(cwd)` API 方法
- [x] 4.6 撰寫 Init 按鈕 UI 測試：驗證按鈕顯示、disable 狀態、錯誤訊息
- [x] 4.7 在 `OpenSpecPanel.tsx` 的 `noOpenspecAtCwd` 區塊新增 Init 按鈕 UI（state + handler + 錯誤顯示）
- [x] 4.8 新增 i18n keys：`openspecPanel.initButton`、`initializing`、`cliNotFound`（en.json + zh-TW.json）
- [x] 4.9 驗證所有測試通過 + 手動測試初始化流程

## 5. LLM 語言獨立設定 — 後端

- [x] 5.1 撰寫 `SettingsStore` 測試：驗證 `llmLanguage` 欄位的讀取、PATCH、null 處理
- [x] 5.2 在 `settings-store.ts` 的 `AppSettings` interface 新增 `llmLanguage?: string`
- [x] 5.3 撰寫 `PromptComposer` locale 擴充測試：驗證新增語言代碼和自訂語言名稱的 fallback
- [x] 5.4 在 `composer.ts` 擴充 `LOCALE_NAMES` map（新增 es、fr、de、pt）
- [x] 5.5 驗證後端測試通過

## 6. LLM 語言獨立設定 — 前端

- [x] 6.1 在 `store/index.ts` 新增 `llmLanguage: string | null` state 和 `setLlmLanguage` setter
- [x] 6.2 修改 `useTabCopilot.ts` 的 locale 取值：`llmLanguage || language`
- [x] 6.3 撰寫 `LlmLanguageSelector` 元件測試：驗證下拉選單選擇、自訂輸入、null fallback
- [x] 6.4 在 `SettingsPanel.tsx` General tab 新增「LLM 回應語言」section + `LlmLanguageSelector` 元件
- [x] 6.5 新增 i18n keys：`settings.general.llmLanguage`、`llmLanguageDesc`、`llmLangAuto`、`llmLangCustom`（en.json + zh-TW.json）
- [x] 6.6 驗證前端測試通過 + 手動測試語言切換影響 AI 回應

## 7. Prompt Injection 基礎防護

- [x] 7.1 撰寫 `DEFAULT_SYSTEM_PROMPT` 測試：驗證包含 `## Security Boundaries` 段落
- [x] 7.2 在 `defaults.ts` 的 `## Safety & Ethics` 段落後新增 `## Security Boundaries` 段落
- [x] 7.3 撰寫 `PromptComposer` XML 分隔符測試：驗證 `.codeforge.md` 用 `<project-instructions>` 包裹、memory 用 `<memory-context>` 包裹
- [x] 7.4 修改 `composer.ts`：`.codeforge.md` 內容用 `<project-instructions>` 標籤包裹、memory 用 `<memory-context>` 標籤包裹
- [x] 7.5 驗證所有後端測試通過

## 8. chokidar + WebSocket 即時檔案監聽 — 後端

- [x] 8.1 安裝 chokidar 依賴：`cd backend && npm install chokidar`
- [x] 8.2 撰寫 `OpenSpecWatcher` 單元測試：驗證 watch/stop、debounce 合併、隱藏檔案過濾
- [x] 8.3 新增 `backend/src/openspec/openspec-watcher.ts` 實作 `OpenSpecWatcher` class
- [x] 8.4 撰寫 `broadcast` 函數測試：驗證遍歷 OPEN clients 發送訊息
- [x] 8.5 修改 `ws/server.ts`：`createWsServer` 回傳 `{ wss, broadcast }` + 實作 `broadcast` 函數
- [x] 8.6 修改 `index.ts`：解構 `{ wss, broadcast }`、初始化 OpenSpecWatcher、加入 graceful shutdown
- [x] 8.7 驗證後端測試通過

## 9. chokidar + WebSocket 即時檔案監聽 — 前端

- [x] 9.1 在 WebSocket 訊息處理處新增 `openspec:changed` → `CustomEvent` dispatch
- [x] 9.2 撰寫 `OpenSpecPanel` file watcher 訂閱測試：驗證 open 時監聽、close 時移除、debounce 後 refreshAll
- [x] 9.3 在 `OpenSpecPanel.tsx` 新增 `useEffect` 監聯 `openspec:changed` CustomEvent（debounce 300ms → refreshAll）
- [x] 9.4 驗證前端測試通過 + 手動測試：終端修改 openspec 檔案後面板自動刷新

## 10. TopBar OpenSpec 按鈕狀態指示器

- [x] 10.1 撰寫 `TopBar` OpenSpec badge 測試：驗證 `openSpecActive` 為 true 時顯示圓點、false 時不顯示
- [x] 10.2 修改 `TopBar.tsx`：新增 `openSpecActive?: boolean` prop，在 OpenSpec 按鈕上新增 accent 小圓點 badge（參照 Artifacts badge 模式）
- [x] 10.3 修改 `AppShell.tsx`：根據 overview API 的 `resolvedPath` 非 null 計算 `openSpecActive`，傳入 TopBar
- [x] 10.4 驗證測試通過 + 視覺確認圓點指示器在有/無 OpenSpec 時的顯示
