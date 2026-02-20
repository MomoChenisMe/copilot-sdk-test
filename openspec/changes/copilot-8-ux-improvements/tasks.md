## 1. Premium Quota API（後端 + 全局 Store 基礎設施）

- [ ] 1.1 撰寫 StreamManager quota cache 測試：`quotaCache` 初始為 null、`updateQuotaCache()` 更新、`getQuota()` 回傳
- [ ] 1.2 實作 StreamManager quota cache：新增 `quotaCache` 私有屬性、`updateQuotaCache()` 和 `getQuota()` 方法
- [ ] 1.3 撰寫 `GET /api/copilot/quota` endpoint 測試：有 cache 回傳資料、無 cache 回傳 null
- [ ] 1.4 實作 quota endpoint：在 `backend/src/index.ts` 註冊路由，回傳 `streamManager.getQuota()`
- [ ] 1.5 撰寫 event-relay quota 事件更新 cache 的測試
- [ ] 1.6 修改 event-relay 在發送 `copilot:quota` 事件時同步呼叫 `streamManager.updateQuotaCache()`
- [ ] 1.7 驗證後端測試全部通過：`npm test --prefix backend`

## 2. Premium Quota 前端（useQuota hook + 全局 Store）

- [ ] 2.1 撰寫 Zustand store `premiumQuota` 狀態測試：初始 null、`setPremiumQuota()` 更新
- [ ] 2.2 實作 store 新增 `premiumQuota` 和 `setPremiumQuota` action
- [ ] 2.3 撰寫 `copilotApi.getQuota()` API client（`frontend/src/lib/api.ts`）
- [ ] 2.4 撰寫 `useQuota` hook 測試：初始化 fetch、30 秒刷新、fetch 失敗保留既有資料
- [ ] 2.5 實作 `useQuota` hook（`frontend/src/hooks/useQuota.ts`），模仿 `useModels` 模式
- [ ] 2.6 在 `AppShell.tsx` 中呼叫 `useQuota()`
- [ ] 2.7 撰寫 `useTabCopilot` 雙寫全局 store 測試：`copilot:quota` 事件同時更新 per-tab + 全局
- [ ] 2.8 修改 `useTabCopilot.ts` 的 `copilot:quota` handler 雙寫 `setPremiumQuota()`
- [ ] 2.9 驗證前端測試通過：`npm test --prefix frontend`

## 3. UsageBar Premium 移除 + Premium Badge 獨立顯示

- [ ] 3.1 撰寫 UsageBar 測試：折疊/展開視圖均不渲染 PR 資訊
- [ ] 3.2 修改 `UsageBar.tsx`：移除所有 premium request 相關 props 和渲染邏輯
- [ ] 3.3 修改 `ChatView.tsx`：移除傳給 UsageBar 的 PR 相關 props
- [ ] 3.4 撰寫 Premium badge 測試：從全局 store 讀取資料、null 時不渲染、unlimited 格式
- [ ] 3.5 在 ChatView 的 UsageBar 旁新增 Premium badge inline 渲染
- [ ] 3.6 驗證前端測試通過

## 4. 技能即時載入（SkillsTab 全局 Store 同步）

- [ ] 4.1 撰寫 SkillsTab 同步測試：新增/編輯/刪除技能後全局 store 更新
- [ ] 4.2 修改 `SettingsPanel.tsx` SkillsTab：在 `handleCreate()`、`handleSave()`、`handleDeleteConfirm()`、`refreshSkills()` 中加入 `useAppStore.getState().setSkills()` 呼叫
- [ ] 4.3 驗證測試通過

## 5. Slash Command 下拉框改版（雙行佈局 + 使用者技能分區）

- [ ] 5.1 撰寫 SlashCommandMenu 雙行佈局測試：名稱獨立一行、描述第二行、寬度 w-80
- [ ] 5.2 修改 `SlashCommandMenu.tsx` 佈局：從單行 flex 改為雙行堆疊，調整寬度和高度
- [ ] 5.3 擴充 `SlashCommand` 介面：新增 `builtin?: boolean` 欄位
- [ ] 5.4 撰寫使用者技能分區測試：builtin/user 技能分別顯示在不同 section
- [ ] 5.5 修改 `SlashCommandMenu.tsx`：將 skillCommands 拆分為 builtinSkills + userSkills 兩個 section
- [ ] 5.6 修改 `ChatView.tsx`：組裝 skillCmds 時帶入 `builtin` 旗標
- [ ] 5.7 驗證測試通過

## 6. 新 Tab 自動聚焦輸入框

- [ ] 6.1 撰寫 Input forwardRef 測試：暴露 `focus()` 方法、呼叫後 textarea 獲得焦點
- [ ] 6.2 修改 `Input.tsx`：改為 `forwardRef`，透過 `useImperativeHandle` 暴露 `focus()`
- [ ] 6.3 撰寫 ChatView auto-focus 測試：新 Tab（messages 為空）時自動呼叫 focus
- [ ] 6.4 修改 `ChatView.tsx`：新增 `inputRef` 和 `useEffect([tabId, messages.length])` 聚焦邏輯
- [ ] 6.5 驗證測試通過

## 7. `/context` 可視化卡片

- [ ] 7.1 撰寫 ContextCard 組件測試：渲染 header、system prompt layers、skills、MCP servers、SDK version
- [ ] 7.2 實作 `ContextCard.tsx`：帶有進度條、分類統計、樹狀子項目的可視化卡片
- [ ] 7.3 撰寫 MessageBlock context 分支測試：`metadata.type === 'context'` 時渲染 ContextCard
- [ ] 7.4 修改 `MessageBlock.tsx`：新增 context 訊息偵測，渲染 ContextCard
- [ ] 7.5 撰寫 ChatView `/context` handler 測試：API 回傳存入 metadata.contextData
- [ ] 7.6 修改 `ChatView.tsx` `/context` handler：將原始 JSON 存入 metadata 取代 markdown 拼接
- [ ] 7.7 驗證測試通過

## 8. i18n 更新

- [ ] 8.1 新增 `en.json` 翻譯鍵：slashCommand.systemSkills、slashCommand.userSkills、context.* 系列
- [ ] 8.2 新增 `zh-TW.json` 對應翻譯
- [ ] 8.3 驗證所有前端和後端測試通過：`npm test --prefix frontend && npm test --prefix backend`
