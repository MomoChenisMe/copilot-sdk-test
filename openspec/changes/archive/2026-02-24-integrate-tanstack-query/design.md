## Context

CodeForge 前端目前使用單一 Zustand store（`frontend/src/store/index.ts`，1,144 行）同時管理伺服器狀態（models、conversations、messages、skills、settings、quota）與客戶端 UI 狀態（tabs、streaming、theme、toasts）。所有 API 呼叫透過手動 `fetch()` + `useState` 或 Zustand actions 處理，無快取、無自動重新驗證、每個 API 都需手寫 loading/error 狀態管理。

WebSocket 用於即時串流（copilot:delta、copilot:message 等高頻事件），且已良好運作。

## Goals / Non-Goals

**Goals:**

- 引入 TanStack Query 作為伺服器狀態快取層，自動管理 loading/error 狀態、快取、背景重新驗證
- 將 ~16 個 server state 欄位和 ~20 個 actions 從 Zustand 遷出至 TanStack Query
- 建立 WebSocket-to-Query bridge，讓 WS 完成事件同步到 Query 快取
- 漸進式遷移，每個 domain 獨立搬遷，確保任何階段可獨立運作

**Non-Goals:**

- 不引入 TanStack Router（tab-based 桌面型 SPA 不適合 URL routing）
- 不改動後端 API 或 WebSocket 協議
- 不重寫 WebSocket 高頻串流邏輯（仍走 Zustand）
- 不做 Zustand slice pattern 拆分
- 不引入 SSR / prefetching

## Decisions

### Decision 1: 使用 TanStack Query v5 作為 server state 管理層

**選擇：** `@tanstack/react-query` v5

**替代方案：**
- **SWR**：較輕量但功能較少（缺乏 mutation optimistic update、query invalidation 語意不如 TanStack Query 明確）。不適合本專案有大量 CRUD mutation 的需求。
- **自建快取層**：成本高、維護負擔大，且難以達到 TanStack Query 的成熟度（stale-while-revalidate、gc、deduplication、devtools）。

**理由：** TanStack Query 是 React 生態系中 server state 管理的事實標準，v5 支援 React 19，API 穩定，且與 Zustand 共存無衝突。

### Decision 2: QueryClient 全域 singleton

**選擇：** 在 `lib/query-client.ts` 匯出全域 `queryClient` instance，於 `main.tsx` 透過 `QueryClientProvider` 注入。

**替代方案：**
- 在元件內建立 `useQueryClient()`：無法在 React tree 外使用（如 WebSocket handler 中）。

**理由：** WebSocket bridge 需要在 React 元件外直接操作 query cache（`queryClient.setQueryData()`），因此必須有可直接 import 的 singleton。

### Decision 3: 集中式 query key factory

**選擇：** `lib/query-keys.ts` 匯出型別安全的 key factory object。

**替代方案：**
- 各 hook 自行定義 key string：容易拼錯、跨 hook invalidation 困難。

**理由：** 集中管理確保 query key 的一致性，避免 invalidation 失效。

### Decision 4: WebSocket 串流資料保留在 Zustand

**選擇：** `streamingText`、`toolRecords`、`turnSegments`、`reasoningText` 等高頻暫態資料留在 Zustand per-tab state。

**替代方案：**
- 全部搬到 TanStack Query：TanStack Query 不適合每 50ms 更新一次的高頻資料，`setQueryData` 的通知機制會造成不必要的 re-render。

**理由：** TanStack Query 設計用於 request-response 模式，非高頻串流。Zustand 的直接 state update 更適合此場景。

### Decision 5: WebSocket-to-Query bridge 模組

**選擇：** 建立獨立的 `lib/ws-query-bridge.ts` 模組，提供命名方法供 `useTabCopilot` 呼叫。

**替代方案：**
- 直接在 `useTabCopilot` 中 import `queryClient`：可行但散落各處，不利於測試和追蹤所有同步點。

**理由：** 集中管理所有 WS → Query 的同步邏輯，方便測試、調試和未來擴展。

### Decision 6: ChatView 雙源合併

**選擇：** 已提交的歷史訊息從 TanStack Query 取得，當前串流內容從 Zustand per-tab state 取得，ChatView 合併兩者顯示。

**替代方案：**
- 只用 TanStack Query（串流完成才顯示）：使用者體驗退化，失去即時顯示。
- 只用 Zustand（完全不遷移 messages）：store 仍然臃腫。

**理由：** 這是唯一能同時保持即時體驗和架構清晰的方案。

### Decision 7: 漸進式遷移策略（5 個 Phase）

**選擇：** Phase 0（基礎建設）→ Phase 1（低風險：models/skills/settings）→ Phase 2（quota/config）→ Phase 3（conversations）→ Phase 4（messages + bridge）

**替代方案：**
- Big bang 一次全改：風險極高，無法漸進驗證。

**理由：** TanStack Query 可與 Zustand 完美共存，逐步遷移允許每階段獨立測試和回滾。

## Risks / Trade-offs

**[雙源資料不一致]** → ChatView 合併 TanStack Query（歷史訊息）和 Zustand（串流）時，可能出現短暫的資料不一致。**緩解：** `copilot:idle` 事件時同時更新 Query cache 和清除 Zustand 串流狀態，確保最終一致性。

**[遷移期間的混合存取]** → 遷移過程中，部分元件用 TanStack Query、部分仍用 Zustand，增加心智負擔。**緩解：** 每個 Phase 完成後執行完整測試，且同一 domain 的欄位一次性遷完（不會同一 domain 半新半舊）。

**[新依賴增加 bundle size]** → `@tanstack/react-query` 約 ~12KB gzipped。**緩解：** 對此類個人工具而言 bundle size 影響極小；且可移除 4 個自建 hooks 的程式碼。

**[WebSocket bridge 增加複雜度]** → 新增 WS → Query 同步路徑。**緩解：** Bridge 模組集中管理、有明確的方法命名（`appendMessageToCache`、`invalidateConversations`），且每個方法都可獨立單元測試。

**[`queryClient` 全域 singleton 影響測試隔離]** → 測試間可能共享 cache 狀態。**緩解：** 測試使用 `createTestQueryClient()`（retry: false, gcTime: 0），每個測試獨立建立 client。

## Migration Plan

### Phase 0：基礎建設（無行為變更）
1. `npm install @tanstack/react-query @tanstack/react-query-devtools`
2. 建立 `query-client.ts`、`query-keys.ts`、`test-utils/query-wrapper.tsx`
3. `main.tsx` 加入 `QueryClientProvider`
4. 驗證：`npm run build` + `npm run test` 通過，應用行為不變

### Phase 1-4：逐步遷移
每個 Phase 的步驟：
1. 建立新的 query hook(s)
2. 更新消費元件，從 `useAppStore(s => s.xxx)` 改為 `useXxxQuery()`
3. 從 Zustand store 移除對應的 fields 和 actions
4. 刪除被替代的舊 hook 檔案
5. 更新受影響的測試（加入 `createWrapper()`）
6. `npm run build` + `npm run test` 通過

### Rollback 策略
- 每個 Phase 獨立可回滾（`git revert` 對應 commit 即可）
- Phase 0 完全 additive，移除 `QueryClientProvider` 即回到原始狀態
- 高風險 Phase（3, 4）可透過 feature flag 控制新舊路徑切換

## Open Questions

（無 — 所有設計決策已在 brainstorming 階段與使用者確認完畢）
