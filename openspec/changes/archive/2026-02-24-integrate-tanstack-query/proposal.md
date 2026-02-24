## Why

CodeForge 前端的單一 Zustand store（1,144 行、60+ 欄位、62 個 actions）同時管理伺服器狀態與客戶端 UI 狀態，導致三個問題：(1) 每個 API 呼叫都要手寫 `isLoading` / `try/catch` 樣板碼；(2) 切換 tab 時資料重複 fetch，無快取機制；(3) store 職責混雜、過於肥大。引入 TanStack Query 作為伺服器狀態快取層，與 Zustand（純客戶端 UI 狀態）形成清晰分工，可同時解決這三個問題。

## What Changes

- **新增 `@tanstack/react-query` 依賴**，建立 `QueryClient` 設定、集中式 query key factory、測試用 wrapper
- **建立 8 個 query hooks** 取代現有的手動 fetch 邏輯：`useModelsQuery`、`useSkillsQuery`、`useSdkCommandsQuery`、`useSettingsQuery`、`useQuotaQuery`、`useConfigQuery`、`useConversationsQuery`（含 mutation hooks）、`useMessagesQuery`
- **刪除 4 個舊 hooks**：`useModels.ts`、`useSkills.ts`、`useQuota.ts`、`useConversations.ts`
- **瘦身 Zustand store**：移除 ~16 個 server state 欄位和 ~20 個 actions，將 `models`、`conversations`、`messages`、`skills`、`sdkCommands`、`settings`、`premiumQuota`、`webSearchAvailable` 搬到 TanStack Query
- **建立 WebSocket-to-Query bridge**（`ws-query-bridge.ts`），讓 WebSocket 完成事件透過 `setQueryData` / `invalidateQueries` 同步到 Query 快取
- **保留 Zustand** 管理 tab 狀態、streaming 狀態、theme/language、UI 開關、toasts 等純客戶端狀態
- **WebSocket 即時串流不變** — 高頻 delta 事件仍走 Zustand，不進 TanStack Query

### Non-Goals（非目標）

- **不引入 TanStack Router** — tab-based 桌面型 SPA 不適合 URL routing
- **不改動後端 API** — 現有 REST 端點與 WebSocket 協議完全不變
- **不重寫 WebSocket 串流邏輯** — `useTabCopilot` 的核心串流處理維持現狀
- **不做 Zustand store 拆分（slice pattern）** — 只移除 server state，不重構剩餘的 client state 架構
- **不加入 SSR / prefetching** — 個人工具，無 SEO 需求

## Capabilities

### New Capabilities

- `tanstack-query-infra`: TanStack Query 基礎建設（QueryClient 設定、query key factory、QueryClientProvider 整合、測試 wrapper）
- `query-hooks`: 8 個 server state query hooks（models、skills、sdkCommands、settings、quota、config、conversations、messages），含 mutation hooks 和 optimistic updates
- `ws-query-bridge`: WebSocket 事件到 TanStack Query 快取的同步橋接模組

### Modified Capabilities

- `chat-ui`: ChatView 改為雙源合併顯示 — TanStack Query 提供已提交的歷史訊息，Zustand 提供當前串流內容
- `conversation-management`: 對話 CRUD 從手動 useState/Zustand 改為 TanStack Query mutation + cache invalidation
- `usage-tracking`: Quota 從手動 `setInterval` 改為 TanStack Query `refetchInterval`，WebSocket 更新透過 bridge 同步

## Impact

**前端依賴：**
- 新增：`@tanstack/react-query`、`@tanstack/react-query-devtools`（dev）

**前端檔案（新增）：**
- `frontend/src/lib/query-client.ts`
- `frontend/src/lib/query-keys.ts`
- `frontend/src/lib/ws-query-bridge.ts`
- `frontend/src/hooks/queries/` — 8 個 query hook 檔案
- `frontend/src/test-utils/query-wrapper.tsx`

**前端檔案（修改）：**
- `frontend/src/main.tsx` — 加入 `QueryClientProvider`
- `frontend/src/store/index.ts` — 移除 ~16 欄位、~20 actions
- `frontend/src/components/layout/AppShell.tsx` — 替換所有舊 hooks
- `frontend/src/hooks/useTabCopilot.ts` — 增加 bridge 呼叫
- 多個元件改用 query hooks：`ModelSelector`、`CronConfigPanel`、`SettingsPanel`、`ChatView`、`MessageBlock`、`OpenSpecPanel`、`MobileToolbarPopup`

**前端檔案（刪除）：**
- `frontend/src/hooks/useModels.ts`
- `frontend/src/hooks/useSkills.ts`
- `frontend/src/hooks/useQuota.ts`
- `frontend/src/hooks/useConversations.ts`

**後端：** 不受影響，所有 REST API 端點和 WebSocket 協議不變。
**資料庫：** 不受影響，無 schema 變更。
