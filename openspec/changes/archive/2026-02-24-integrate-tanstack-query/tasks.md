## 1. Phase 0 — 基礎建設

- [x] 1.1 安裝 `@tanstack/react-query` 和 `@tanstack/react-query-devtools` 依賴（`frontend/package.json`）
- [x] 1.2 建立 `frontend/src/lib/query-client.ts` — QueryClient singleton，含預設 `staleTime`/`gcTime`/`retry`/`refetchOnWindowFocus` 設定
- [x] 1.3 建立 `frontend/src/lib/query-keys.ts` — 集中式 query key factory（models、conversations、skills、sdkCommands、settings、quota、config）
- [x] 1.4 修改 `frontend/src/main.tsx` — 用 `QueryClientProvider` 包裹 `<App />`，開發模式加入 ReactQueryDevtools
- [x] 1.5 建立 `frontend/src/test-utils/query-wrapper.tsx` — `createTestQueryClient()` + `createWrapper()` 測試工具
- [x] 1.6 撰寫 query-client 和 query-keys 的單元測試（`frontend/tests/lib/query-client.test.ts`、`frontend/tests/lib/query-keys.test.ts`）
- [x] 1.7 執行 `npm run build` + `npm run test` 驗證無破壞性變更

## 2. Phase 1a — Models 遷移

- [x] 2.1 撰寫 `useModelsQuery` hook 測試（`frontend/tests/hooks/queries/useModelsQuery.test.tsx`）— 測試 fetch、快取 30 分鐘 staleTime、error 狀態、lastSelectedModel 驗證
- [x] 2.2 實作 `frontend/src/hooks/queries/useModelsQuery.ts` — `queryFn: apiGet('/api/copilot/models')`、`staleTime: 30min`、`lastSelectedModel` 驗證邏輯
- [x] 2.3 更新 `frontend/src/components/layout/AppShell.tsx` — 移除 `useModels()` 呼叫，改用 `useModelsQuery()`
- [x] 2.4 更新消費元件：`ModelSelector.tsx`、`CronConfigPanel.tsx`、`SettingsPanel.tsx`、`MobileToolbarPopup.tsx` — 改用 `useModelsQuery()` 取代 `useAppStore(s => s.models/modelsLoading/modelsError)`
- [x] 2.5 從 `frontend/src/store/index.ts` 移除 `models`、`modelsLoading`、`modelsError`、`modelsLastFetched` 欄位和 `setModels`、`setModelsLoading`、`setModelsError`、`setModelsLastFetched` actions
- [x] 2.6 刪除 `frontend/src/hooks/useModels.ts`
- [x] 2.7 執行 `npm run build` + `npm run test` 驗證

## 3. Phase 1b — Skills 與 SDK Commands 遷移

- [x] 3.1 撰寫 `useSkillsQuery` hook 測試（`frontend/tests/hooks/queries/useSkillsQuery.test.tsx`）— 測試 fetch、`staleTime: Infinity`、error 處理
- [x] 3.2 實作 `frontend/src/hooks/queries/useSkillsQuery.ts` — `queryFn: skillsApi.list()`、`staleTime: Infinity`
- [x] 3.3 撰寫 `useSdkCommandsQuery` hook 測試（`frontend/tests/hooks/queries/useSdkCommandsQuery.test.tsx`）
- [x] 3.4 實作 `frontend/src/hooks/queries/useSdkCommandsQuery.ts` — `queryFn: copilotApi.listCommands()`、`staleTime: Infinity`
- [x] 3.5 更新 `AppShell.tsx` — 移除 `useSkills()` 呼叫，改用 `useSkillsQuery()` + `useSdkCommandsQuery()`
- [x] 3.6 更新消費元件：`ChatView.tsx`、`MessageBlock.tsx` — 改用 query hooks 取代 `useAppStore(s => s.skills/sdkCommands)`
- [x] 3.7 從 `frontend/src/store/index.ts` 移除 `skills`、`skillsLoaded`、`sdkCommands`、`sdkCommandsLoaded` 欄位和對應 actions
- [x] 3.8 刪除 `frontend/src/hooks/useSkills.ts`
- [x] 3.9 執行 `npm run build` + `npm run test` 驗證

## 4. Phase 1c — Settings 遷移

- [x] 4.1 撰寫 `useSettingsQuery` hook 測試（`frontend/tests/hooks/queries/useSettingsQuery.test.tsx`）— 測試 fetch、`staleTime: 10min`
- [x] 4.2 實作 `frontend/src/hooks/queries/useSettingsQuery.ts` — `queryFn: settingsApi.get()`、`staleTime: 10min`
- [x] 4.3 更新 `AppShell.tsx` 和其他讀取 `useAppStore(s => s.settings)` 的元件（改為 `openspecEnabled` 直接欄位）
- [x] 4.4 從 `frontend/src/store/index.ts` 移除 `settings`/`setSettings`，改為 `openspecEnabled`/`setOpenspecEnabled`
- [x] 4.5 執行 `npm run build` + `npm run test` 驗證

## 5. Phase 2 — Quota 與 Config 遷移

- [x] 5.1 撰寫 `useQuotaQuery` hook 測試（`frontend/tests/hooks/queries/useQuotaQuery.test.tsx`）— 測試 fetch、`refetchInterval: 30s`、select transform
- [x] 5.2 實作 `frontend/src/hooks/queries/useQuotaQuery.ts` — `queryFn: apiGet('/api/copilot/quota')`、`refetchInterval: 30000`、`select` 轉換 quota data
- [x] 5.3 撰寫 `useConfigQuery` / `useBraveApiKeyQuery` hook 測試（`frontend/tests/hooks/queries/useConfigQuery.test.tsx`）
- [x] 5.4 實作 `frontend/src/hooks/queries/useConfigQuery.ts` — `useBraveApiKeyQuery` 從 `configApi.getBraveApiKey()` 取值
- [x] 5.5 更新 `AppShell.tsx`、`ChatView.tsx` — 改用 `useQuotaQuery()` 和 `useBraveApiKeyQuery()` 取代 `useAppStore(s => s.premiumQuota/webSearchAvailable)`
- [x] 5.6 從 `frontend/src/store/index.ts` 移除 `premiumQuota`、`webSearchAvailable` 欄位和對應 actions
- [x] 5.7 刪除 `frontend/src/hooks/useQuota.ts`
- [x] 5.8 執行 `npm run build` + `npm run test` 驗證

## 6. Phase 3 — Conversations 遷移

- [x] 6.1 撰寫 `useConversationsQuery` 和 mutation hooks 測試（`frontend/tests/hooks/queries/useConversationsQuery.test.tsx`）— 測試 list fetch、create mutation + cache prepend、update mutation + cache update、delete mutation + cache filter、search query
- [x] 6.2 實作 `frontend/src/hooks/queries/useConversationsQuery.ts` — `useConversationsQuery()`、`useConversationSearchQuery()`、`useCreateConversation()`、`useUpdateConversation()`、`useDeleteConversation()`
- [x] 6.3 更新 `AppShell.tsx` — 移除 `useConversations()` 呼叫和 `useEffect` sync to store，改用 query hooks
- [x] 6.4 更新消費元件：`OpenSpecPanel.tsx`、`ChatView.tsx` — 改用 `useConversationsQuery()` 取代 `useAppStore(s => s.conversations)`
- [x] 6.5 從 `frontend/src/store/index.ts` 移除 `conversations` 欄位和 `setConversations`、`addConversation`、`updateConversation`、`removeConversation` actions（保留 `activeConversationId` 作為 UI state）
- [x] 6.6 從 store 移除 `Conversation` import，清理 conversation CRUD actions
- [x] 6.7 刪除 `frontend/src/hooks/useConversations.ts`
- [x] 6.8 執行 `npm run build` + `npm run test` 驗證

## 7. Phase 4 — Messages 遷移

- [x] 7.1 撰寫 `useMessagesQuery` hook 測試（`frontend/tests/hooks/queries/useMessagesQuery.test.tsx`）— 測試 fetch by conversationId、`enabled: false` when null、cache hit on tab switch
- [x] 7.2 實作 `frontend/src/hooks/queries/useMessagesQuery.ts` — `queryKey: conversations.messages(id)`、`enabled: !!conversationId`、`staleTime: 5min`、`select: fixStaleToolRecords`
- [x] 7.3 更新 `ChatView.tsx` — 實作雙源合併（TanStack Query 歷史訊息 + Zustand pendingMessages + tab.messages fallback），處理 loading state
- [x] 7.4 新增 `pendingMessages` 到 `TabState`，加入 `addPendingMessage`/`clearPendingMessages` actions；保留 `messages` 作為串流暫存（useTabCopilot 仍寫入），改為由 query 作為主要資料來源
- [x] 7.5 執行 `npm run build` + `npm run test` 驗證（60/60 ChatView tests + 5/5 ContextCommand tests 通過）

## 8. Phase 5 — WebSocket-to-Query Bridge

- [x] 8.1 撰寫 `ws-query-bridge` 單元測試（`frontend/tests/lib/ws-query-bridge.test.ts`）— 12 個測試覆蓋所有 bridge 方法（含 dedup、invalidation）
- [x] 8.2 實作 `frontend/src/lib/ws-query-bridge.ts` — `setMessagesInCache`、`appendMessageToCache`（含 dedup）、`updateConversationInCache`、`addConversationToCache`、`setQuotaInCache`、`invalidateConversations`、`invalidateSkills`、`invalidateSdkCommands`、`invalidateMessages`、`clearMessagesCache`
- [x] 8.3 更新 `useTabCopilot.ts` — `copilot:idle` + reconnect 用 `setMessagesInCache()`；`copilot:quota` 用 `setQuotaInCache()`；auto-title 用 `updateConversationInCache()`
- [x] 8.4 更新 `SettingsPanel.tsx` skill install/delete/save 流程 — 改用 `invalidateSkillsCache()` 取代 `queryClient.setQueryData`；移除 `useQueryClient` + `queryKeys` import
- [x] 8.5 更新 `AppShell.tsx` — `handleClearConversation` 用 `clearMessagesCache()`；`onCronSaved` 用 `invalidateConversations()`
- [x] 8.6 執行 `npm run test` 全量驗證 — 1101 passed / 6 pre-existing failures
