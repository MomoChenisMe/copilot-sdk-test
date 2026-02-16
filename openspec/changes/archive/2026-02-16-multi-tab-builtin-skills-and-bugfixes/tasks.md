## 1. 批次 1：Bug 修復 — 串流事件洩漏

- [x] 1.1 撰寫 `stream-manager.processEvent()` 事件注入 conversationId 測試（`backend/tests/copilot/stream-manager.test.ts`）：驗證 eventBuffer 和 broadcast 的事件 data 包含 `conversationId` 欄位
- [x] 1.2 實作 `stream-manager.ts` 事件注入：在 `processEvent()` 的 buffer/broadcast 前建立 `enrichedMsg`，注入 `conversationId: stream.conversationId`
- [x] 1.3 撰寫 `useCopilot` 事件過濾測試（`frontend/tests/hooks/useCopilot.test.ts`）：驗證非活躍對話的 conversation-scoped 事件被丟棄，全域事件正常處理
- [x] 1.4 實作 `useCopilot.ts` 事件過濾：在 switch 前加入 `conversationId` guard，scopedEvents 不匹配 `activeConversationId` 時 return
- [x] 1.5 執行後端和前端全部測試，確認無 regression

## 2. 批次 2：模型選擇記憶

- [x] 2.1 撰寫 `lastSelectedModel` store 測試（`frontend/tests/store/settings.test.ts`）：驗證 `setLastSelectedModel` 更新 state 和 localStorage，初始化時從 localStorage 讀取
- [x] 2.2 實作 Store 新增 `lastSelectedModel` state 和 `setLastSelectedModel` action（`frontend/src/store/index.ts`）
- [x] 2.3 修改 `AppShell.tsx`：`handleNewConversation` 使用 `lastSelectedModel` 優先，`handleModelChange` 額外呼叫 `setLastSelectedModel`，`defaultModel` 使用 `lastSelectedModel`
- [x] 2.4 執行前端測試，確認模型記憶功能正常

## 3. 批次 3：內建系統技能 — 後端

- [x] 3.1 撰寫 `BuiltinSkillStore` 測試（`backend/tests/skills/builtin-store.test.ts`）：驗證 listSkills、readSkill、getSkillDirectories 回傳帶 `builtin: true` 的結果
- [x] 3.2 建立 `backend/src/skills/builtin-store.ts`，實作 `BuiltinSkillStore` 類別，從 `backend/src/skills/builtin/` 讀取技能
- [x] 3.3 建立 8 個內建技能目錄和 SKILL.md 檔案（`backend/src/skills/builtin/{name}/SKILL.md`），從 GitHub repos 和 `.claude/skills/` 取得內容
- [x] 3.4 撰寫 Skills Routes 更新測試（`backend/tests/skills/routes.test.ts`）：驗證 GET 合併回傳、PUT builtin 返回 403、DELETE builtin 返回 403
- [x] 3.5 修改 `backend/src/skills/routes.ts`：接受 `builtinStore` 參數，合併列表回傳，保護 builtin 寫入/刪除
- [x] 3.6 修改 `backend/src/index.ts`：初始化 `BuiltinSkillStore`，傳入 routes 和 StreamManager
- [x] 3.7 執行後端全部測試，確認無 regression

## 4. 批次 3：內建系統技能 — 前端

- [x] 4.1 修改 `frontend/src/lib/prompts-api.ts`：`SkillItem` 介面新增 `builtin: boolean` 欄位
- [x] 4.2 撰寫 SkillsTab 分區 UI 測試（`frontend/tests/components/settings/SettingsPanel.test.tsx`）：驗證系統技能區和使用者技能區分開顯示，系統技能無 Edit/Delete
- [x] 4.3 修改 `frontend/src/components/settings/SettingsPanel.tsx`：SkillsTab 分「系統技能」和「使用者技能」兩區，系統技能唯讀 + toggle
- [x] 4.4 新增 i18n key 到 `frontend/src/locales/en.json` 和 `zh-TW.json`：`settings.skills.system`、`settings.skills.user`、`settings.skills.systemBadge`、`settings.skills.cannotModifyBuiltin`
- [x] 4.5 執行前端全部測試，確認無 regression

## 5. 批次 4：Tab UI — Store 重構

- [x] 5.1 撰寫 TabState 和 Tab 管理 action 測試（`frontend/tests/store/tabs.test.ts`）：驗證 openTab、closeTab、setActiveTab、reorderTabs、per-tab streaming actions
- [x] 5.2 在 `frontend/src/store/index.ts` 新增 `TabState` 介面和全域 Tab 狀態（`tabs`、`tabOrder`、`activeTabId`）
- [x] 5.3 實作 Tab 管理 actions：`openTab`、`closeTab`、`setActiveTab`、`reorderTabs`、`updateTabTitle`
- [x] 5.4 實作 per-tab streaming actions：`setTabMessages`、`addTabMessage`、`appendTabStreamingText`、`setTabIsStreaming`、`clearTabStreaming`、`addTabToolRecord`、`updateTabToolRecord`、`appendTabReasoningText`、`addTabTurnContentSegment`、`addTabTurnSegment`、`updateTabToolInTurnSegments`、`setTabCopilotError`
- [x] 5.5 實作 Tab 狀態 localStorage 持久化（`ai-terminal:openTabs`）和恢復邏輯
- [x] 5.6 執行 Store 測試，確認所有 Tab 操作正常

## 6. 批次 4：Tab UI — useTabCopilot Hook

- [x] 6.1 撰寫 `useTabCopilot` hook 測試（`frontend/tests/hooks/useTabCopilot.test.ts`）：驗證事件按 conversationId 路由到正確 Tab、無匹配 Tab 時丟棄、全域事件正常處理、per-conversation dedup、copilot:idle 整合邏輯
- [x] 6.2 建立 `frontend/src/hooks/useTabCopilot.ts`，實作事件路由、per-conversation dedup、idle 整合邏輯
- [x] 6.3 實作 Tab 關閉時 dedup Sets 清理
- [x] 6.4 執行 Hook 測試，確認事件路由和整合邏輯正確

## 7. 批次 4：Tab UI — TabBar 元件

- [x] 7.1 撰寫新 TabBar 元件測試（`frontend/tests/components/layout/TabBar.test.tsx`）：驗證 Tab 渲染、活躍 Tab 樣式、串流指示器、「+」按鈕、中鍵關閉、溢出捲動
- [x] 7.2 重寫 `frontend/src/components/layout/TabBar.tsx`：對話 Tab 頁籤欄，含標題、串流指示器、關閉按鈕、「+」新增、水平溢出捲動
- [x] 7.3 執行 TabBar 測試

## 8. 批次 4：Tab UI — AppShell 整合

- [x] 8.1 修改 `frontend/src/components/layout/AppShell.tsx`：移除 copilot/terminal 切換邏輯，改用 `useTabCopilot` 取代 `useCopilot`
- [x] 8.2 實作 Tab 管理函式：`handleNewTab`（建立對話 + openTab）、`handleSelectTab`（setActiveTab + 懶載入訊息）、`handleCloseTab`
- [x] 8.3 實作 WebSocket 重連時重新訂閱所有開啟 Tab 的活躍串流
- [x] 8.4 只渲染 `activeTabId` 的 ChatView，連接新 TabBar 元件
- [x] 8.5 執行整合測試，確認 Tab 管理流程

## 9. 批次 4：Tab UI — ChatView 和 Sidebar 適配

- [x] 9.1 修改 `frontend/src/components/copilot/ChatView.tsx`：接收 `tabId` props，從 `useAppStore(s => s.tabs[tabId])` 讀取狀態
- [x] 9.2 修改 `frontend/src/components/layout/Sidebar.tsx`：簡化為歷史瀏覽器，點擊歷史對話呼叫 `openTab`，已開啟 Tab 的對話顯示標記
- [x] 9.3 微調 `frontend/src/components/layout/TopBar.tsx`：配合 Tab 系統
- [x] 9.4 新增 Tab 相關 i18n key 到 `en.json` 和 `zh-TW.json`：`tabBar.newTab`、`tabBar.closeTab`、`tabBar.closeOthers`、`tabBar.rename`、`tabBar.tabLimit`
- [x] 9.5 刪除或棄用 `frontend/src/hooks/useCopilot.ts`（已被 `useTabCopilot` 取代）

## 10. 最終驗證

- [x] 10.1 執行後端全部測試（`cd backend && npm test`）
- [x] 10.2 執行前端全部測試（`cd frontend && npm test`）
- [x] 10.3 手動驗證批次 1：舊對話串流中開新對話，確認無事件洩漏
- [x] 10.4 手動驗證批次 2：選擇模型後開新對話，確認記憶模型
- [x] 10.5 手動驗證批次 3：Settings > Skills 確認系統/使用者分區，builtin 唯讀
- [x] 10.6 手動驗證批次 4：建立多個 Tab、並行串流、關閉 Tab、歷史對話開啟、頁面重載恢復
