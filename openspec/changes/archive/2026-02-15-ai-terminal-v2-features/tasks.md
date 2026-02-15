## 1. 全系統字體 — Noto Sans TC（Feature 2）

- [x] 1.1 撰寫字體載入測試：驗證 `index.html` 包含 Google Fonts preconnect 和 Noto Sans TC link 標籤
- [x] 1.2 撰寫 Tailwind `--font-sans` 測試：驗證 `globals.css` 的 `@theme` 包含 `--font-sans` 定義且字體堆疊正確
- [x] 1.3 實作 `frontend/index.html` 字體載入：加入 preconnect + Google Fonts `<link>` 標籤（Noto Sans TC 400/500/700, `display=swap`）
- [x] 1.4 實作 `frontend/src/styles/globals.css` 字體設定：`@theme` 加入 `--font-sans`，body `font-family` 首位加 `'Noto Sans TC'`
- [x] 1.5 驗證字體變更：確認 `--font-mono` 未受影響，code block 仍使用 monospace 字體

## 2. WebSocket Heartbeat Timeout 修復（Feature 4）

- [x] 2.1 撰寫後端 heartbeat 測試：驗證 `HEARTBEAT_TIMEOUT` 為 180s，且所有 WS 訊息類型都重置 heartbeat timer
- [x] 2.2 實作後端 `backend/src/ws/server.ts` heartbeat 修改：timeout 60s→180s，所有入站訊息重置 timer
- [x] 2.3 撰寫前端 Page Visibility API 測試：驗證 `visibilitychange` 事件觸發立即 ping 或重連
- [x] 2.4 實作前端 `frontend/src/lib/ws-client.ts` Visibility 整合：`setupVisibilityHandler()` 回到前景立即 ping，5s 無 pong 則跳過 backoff 立即重連
- [x] 2.5 撰寫前端 ping 間隔測試：驗證 ping 間隔從 30s 調整為 25s
- [x] 2.6 實作前端 ping 間隔調整：修改 ws-client 的 ping interval 為 25s
- [x] 2.7 驗證 heartbeat 修改：編譯 backend + frontend 無錯誤

## 3. ToolResultBlock 卡片化重設計（Feature 1）

- [x] 3.1 撰寫 ToolResultBlock 單元測試：驗證卡片結構（header + body），status icon 顯示（Check/X/Loader），toolName 渲染
- [x] 3.2 撰寫 ToolResultBlock copy 功能測試：驗證 `navigator.clipboard.writeText` 呼叫和 icon 切換回饋
- [x] 3.3 撰寫 ToolResultBlock 展開/折疊測試：驗證 >500 行截斷為 200 行並顯示展開按鈕
- [x] 3.4 實作 `frontend/src/components/copilot/ToolResultBlock.tsx` 重構：卡片容器（`rounded-xl border`）、header bar（status icon + toolName + copy 按鈕）、body（`<pre>` mono 字體 + `max-h-96`）
- [x] 3.5 實作錯誤狀態樣式：`border-l-4 border-l-error`、紅色 X icon、`text-error` body 文字
- [x] 3.6 實作 copy to clipboard 功能：`navigator.clipboard.writeText()`，成功後 icon 暫切為 Check 2 秒
- [x] 3.7 實作展開/折疊邏輯：>500 行截斷為 200 行，「展開全部（共 N 行）」/「收合」按鈕
- [x] 3.8 驗證 ToolResultBlock 與 Markdown.tsx hljs 程式碼區塊隔離：ToolResultBlock `<pre>` 不含 hljs class
- [x] 3.9 驗證所有 ToolResultBlock 測試通過

## 4. WsHandler 介面擴展與 Router 斷線通知（Feature 5 基礎）

- [x] 4.1 撰寫 WsHandler `onDisconnect` 介面測試：驗證 `WsHandler` 介面包含 optional `onDisconnect` 方法
- [x] 4.2 撰寫 Router 斷線通知測試：驗證 WS `close` 事件遍歷所有 handler 呼叫 `onDisconnect`，單一 handler 錯誤不中斷其餘
- [x] 4.3 實作 `backend/src/ws/types.ts` 修改：`WsHandler` 加 `onDisconnect?: (send: SendFn) => void`
- [x] 4.4 實作 `backend/src/ws/router.ts` 修改：WS `close` 事件遍歷 handler 呼叫 `onDisconnect`，try/catch 保護
- [x] 4.5 實作 `backend/src/ws/server.ts` 修改：加 disconnect 通知機制
- [x] 4.6 驗證 WsHandler 擴展測試通過

## 5. StreamManager 核心架構（Feature 5 主體）

- [x] 5.1 撰寫 StreamManager singleton 測試：驗證 `getInstance()` 回傳同一 instance
- [x] 5.2 撰寫 `startStream` 測試：正常啟動串流、已有串流時拋錯、並行上限拒絕、預設 maxConcurrency=3
- [x] 5.3 撰寫 `subscribe` 測試：訂閱進行中串流、eventBuffer catch-up 回放、訂閱不存在串流回傳 null、unsubscribe 後不再接收
- [x] 5.4 撰寫 `abortStream` 測試：中止進行中串流（持久化+abort session+idle 事件）、中止不存在或已 idle 串流靜默忽略
- [x] 5.5 撰寫事件流轉測試：SDK 事件依序經 relay→accumulation→eventBuffer→subscribers；無訂閱者時僅 buffer 不丟棄；idle 觸發持久化
- [x] 5.6 撰寫 `shutdownAll` 測試：SIGTERM 持久化所有 running stream、超時 10s 強制結束、shutdown 期間拒絕新 startStream
- [x] 5.7 實作 `backend/src/copilot/stream-manager.ts`：`StreamManager` 類別（extends EventEmitter），`ConversationStream` 結構，`startStream`/`subscribe`/`abortStream`/`getActiveStreamIds`/`shutdownAll` 方法
- [x] 5.8 實作 accumulatingSend 邏輯遷移：將現有 handler 的累積邏輯（content segments、tool records、reasoning、turnSegments、dedup sets）搬入 per-conversation ConversationStream
- [x] 5.9 實作 eventBuffer 機制：事件推入 buffer、subscribe 時 catch-up replay、idle 後清除 buffer
- [x] 5.10 實作 StreamManager 並行限制：`maxConcurrency` 可配置、running stream 計數、超限拒絕
- [x] 5.11 實作 graceful shutdown 整合：`setupGracefulShutdown` 加入 `streamManager.shutdownAll()`
- [x] 5.12 更新 `backend/src/config.ts`：加入 `maxConcurrency` 設定項
- [x] 5.13 更新 `backend/src/index.ts`：建立 StreamManager instance 並傳入 copilot handler
- [x] 5.14 驗證所有 StreamManager 測試通過

## 6. Copilot Handler 重構 — 委派 StreamManager（Feature 5）

- [x] 6.1 撰寫 handler 委派測試：驗證 `copilot:send` 呼叫 `streamManager.startStream()` + 自動 `subscribe`
- [x] 6.2 撰寫 handler subscribe/unsubscribe 測試：驗證 `copilot:subscribe` 呼叫 `streamManager.subscribe()` + catch-up、`copilot:unsubscribe` 呼叫 unsubscribe
- [x] 6.3 撰寫 handler status 測試：驗證 `copilot:status` 回傳 `copilot:active-streams`
- [x] 6.4 撰寫 handler abort 測試：帶 conversationId 呼叫 `streamManager.abortStream()`；無 conversationId 的 fallback 行為
- [x] 6.5 撰寫 handler onDisconnect 測試：WS 斷線時清理所有訂閱但不停止串流
- [x] 6.6 重構 `backend/src/ws/handlers/copilot.ts`：移除閉包狀態（activeSession/accumulation/dedup sets），改為薄路由層委派 StreamManager
- [x] 6.7 實作 `copilot:subscribe` handler 邏輯：呼叫 `streamManager.subscribe()`，回傳 `copilot:stream-status`
- [x] 6.8 實作 `copilot:unsubscribe` handler 邏輯
- [x] 6.9 實作 `copilot:status` handler 邏輯：呼叫 `streamManager.getActiveStreamIds()`，回傳 `copilot:active-streams`
- [x] 6.10 實作 `copilot:abort` 修改：接受 `conversationId` 參數，無時 fallback + deprecation warning
- [x] 6.11 實作 handler `onDisconnect` 回呼：清理 per-connection `activeSubscriptions` Map
- [x] 6.12 驗證 handler 重構測試通過，handler 不直接持有 session reference

## 7. 前端背景串流支援（Feature 5 前端）

- [x] 7.1 撰寫 Zustand store `activeStreams` 測試：驗證 `activeStreams: Map<string, string>` 狀態和更新方法
- [x] 7.2 撰寫 useCopilot subscribe/unsubscribe 測試：驗證對話切換時自動 subscribe/unsubscribe，reconnect 時查詢 status
- [x] 7.3 撰寫 Sidebar 串流指示器測試：驗證 running 顯示 pulse dot、idle 移除、error 顯示紅點
- [x] 7.4 實作 `frontend/src/store/index.ts` 修改：加入 `activeStreams` state 和 `setActiveStreams`/`updateStreamStatus` actions
- [x] 7.5 實作 `frontend/src/hooks/useCopilot.ts` 修改：對話切換 `useEffect` 自動 subscribe/unsubscribe，reconnect 時 `copilot:status` 查詢
- [x] 7.6 實作 `frontend/src/components/copilot/ChatView.tsx` 修改：處理 catch-up 事件（subscribe 後的 eventBuffer replay）
- [x] 7.7 實作 `frontend/src/components/layout/Sidebar.tsx` 修改：`activeStreams` 中的對話顯示脈衝指示器（`w-2 h-2 rounded-full bg-accent animate-pulse`）
- [x] 7.8 實作前端 `copilot:abort` 修改：payload 加入 `conversationId`
- [x] 7.9 驗證前端背景串流功能測試通過

## 8. System Prompts 後端 — 檔案存儲 + REST API（Feature 3 Phase 1a）

- [x] 8.1 撰寫 PromptFileStore 測試：`ensureDirectories` 建立正確目錄結構、readFile/writeFile/deleteFile 正常運作、sanitize 函式防護 path traversal
- [x] 8.2 撰寫 PromptComposer 測試：組裝順序（PROFILE→AGENT→presets→preferences→.ai-terminal.md）、空區段跳過、全空回傳空字串、超長截斷
- [x] 8.3 撰寫 Prompts REST API 測試：GET/PUT profile 和 agent、GET/PUT/DELETE presets/:name、404 不存在的 preset、400 非法名稱
- [x] 8.4 實作 `backend/src/prompts/file-store.ts`：`PromptFileStore` 類別，sanitize 函式，ensureDirectories，CRUD 操作
- [x] 8.5 實作 `backend/src/prompts/composer.ts`：`PromptComposer` 類別，`compose(activePresets)` 方法，組裝順序，空值跳過，超長截斷
- [x] 8.6 實作 `backend/src/prompts/routes.ts`：Express Router，profile/agent/presets REST API 端點
- [x] 8.7 更新 `backend/src/config.ts`：加入 `promptsPath` 設定和 `maxPromptLength` 設定
- [x] 8.8 更新 `backend/src/index.ts`：註冊 prompts 模組和路由
- [x] 8.9 驗證所有 prompts 後端測試通過

## 9. Cross-Conversation Memory 後端（Feature 3 Phase 1b）

- [x] 9.1 撰寫 Memory REST API 測試：GET/PUT preferences、GET/PUT/DELETE projects/:name、GET/PUT/DELETE solutions/:name、列表查詢、404、400 非法名稱
- [x] 9.2 撰寫 Memory 目錄初始化測試：驗證 `ensureDirectories` 建立 `memory/preferences.md`、`memory/projects/`、`memory/solutions/`
- [x] 9.3 實作 Memory REST API 端點：擴展 `backend/src/prompts/routes.ts` 或新建 memory routes，preferences/projects/solutions CRUD
- [x] 9.4 實作 Memory 檔案名稱安全驗證：共用 sanitize 函式，防護 path traversal、空名稱、特殊字元
- [x] 9.5 驗證 memory API 測試通過

## 10. SDK Session 整合 System Prompt（Feature 3 Phase 1c）

- [x] 10.1 撰寫 session-manager systemMessage 測試：驗證 `createSession` 和 `resumeSession` 傳入 `systemMessage: { mode: 'append', content }`
- [x] 10.2 撰寫 StreamManager 整合 PromptComposer 測試：`startStream` 時呼叫 `promptComposer.compose(activePresets)` 並注入 session
- [x] 10.3 實作 `backend/src/copilot/session-manager.ts` 修改：`createSession`/`resumeSession` 接受 `systemMessage` 參數
- [x] 10.4 實作 StreamManager 整合 PromptComposer：`startStream` 時組合 system prompt 並傳入 session config
- [x] 10.5 實作 `copilot:send` payload 的 `activePresets` 傳遞：handler 解析 activePresets 傳給 StreamManager
- [x] 10.6 驗證 system prompt 整合測試通過

## 11. 前端設定面板 — SettingsPanel（Feature 3 Phase 2a）

- [x] 11.1 撰寫 prompts-api 前端 API client 測試：驗證 GET/PUT profile、agent、presets、memory 端點呼叫
- [x] 11.2 撰寫 SettingsPanel 元件測試：slide-over 開啟/關閉、三分頁（Profile/Agent/Presets）結構、textarea 編輯和儲存
- [x] 11.3 撰寫 Zustand store activePresets 測試：toggle preset、localStorage 持久化和還原
- [x] 11.4 實作 `frontend/src/lib/prompts-api.ts`：prompts 和 memory API client 函式
- [x] 11.5 實作 `frontend/src/lib/api.ts` 修改：加入 `apiPut` 和 `apiDelete` helper
- [x] 11.6 實作 `frontend/src/store/index.ts` 修改：加入 `activePresets: string[]`、`togglePreset()`、`settingsOpen` state，activePresets 持久化 localStorage
- [x] 11.7 實作 `frontend/src/components/settings/SettingsPanel.tsx`：slide-over panel，Profile/Agent/Presets 三分頁，textarea 編輯器 + 儲存按鈕
- [x] 11.8 實作 Presets 分頁：preset 列表 + toggle 開關 + 展開編輯 + 新增/刪除
- [x] 11.9 驗證 SettingsPanel 基礎測試通過

## 12. 前端 Memory 管理介面 + 整合（Feature 3 Phase 2b）

- [x] 12.1 撰寫 Memory 分頁測試：Preferences/Projects/Solutions accordion 子區段、CRUD 操作、刪除確認
- [x] 12.2 實作 SettingsPanel Memory 分頁：第四個分頁，Preferences textarea + Projects/Solutions 列表（名稱+預覽+展開編輯+新增/刪除）
- [x] 12.3 實作刪除確認對話框：「確定要刪除此項目嗎？」確認後呼叫 DELETE API
- [x] 12.4 實作 `frontend/src/components/layout/TopBar.tsx` 修改：加齒輪 icon 按鈕（Lucide Settings），點擊 toggle `settingsOpen`
- [x] 12.5 實作 `frontend/src/components/layout/AppShell.tsx` 修改：掛載 SettingsPanel overlay
- [x] 12.6 實作活躍 preset pill 指示器：ChatView 輸入區域上方顯示活躍 presets 標籤，可移除
- [x] 12.7 驗證所有前端 Memory 和 Settings 測試通過

## 13. 端到端驗證與收尾

- [x] 13.1 執行完整 backend 測試套件（`npm test -w backend`）確認全部通過
- [x] 13.2 執行完整 frontend 測試套件（`npm test -w frontend`）確認全部通過
- [x] 13.3 執行 TypeScript 編譯檢查（`npx tsc --noEmit -p backend` + `npx tsc --noEmit -p frontend`）確認零錯誤
- [x] 13.4 執行 ESLint 檢查（`npx eslint backend/src frontend/src`）確認無新 warning
- [x] 13.5 手動整合驗證：啟動 dev server，驗證 5 項 feature 的核心場景（字體渲染、heartbeat 不斷線、ToolResultBlock 卡片、背景串流 catch-up、system prompt 注入）
