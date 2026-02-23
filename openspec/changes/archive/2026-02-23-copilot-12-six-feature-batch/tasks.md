## 1. 排程 + WebSearch 按鈕移入輸入框

- [x] 1.1 撰寫 ChatView 測試：驗證 desktop toolbar 不含 Clock 和 WebSearchToggle、leftActions 在所有尺寸可見
- [x] 1.2 實作 ChatView.tsx 修復：移除 desktop toolbar 的 Clock 和 WebSearchToggle（兩處），修改 leftActions 容器為 `flex`，MobileToolbarPopup 獨立 `md:hidden`，新增 WebSearchToggle 到 leftActions
- [x] 1.3 驗證：desktop 輸入框內可見排程和搜尋按鈕、mobile 行為不變、CronConfigPanel 正常展開

## 2. Plan/Act 快捷鍵 (Shift+Tab)

- [x] 2.1 撰寫 useGlobalShortcuts 測試：Shift+Tab 觸發 `onTogglePlanMode`、streaming 中不觸發、無 active tab 時不觸發
- [x] 2.2 實作 useGlobalShortcuts.ts：新增 `onTogglePlanMode` 到 ShortcutActions、handler 中 `if (!alt) return` 前新增 Shift+Tab 判斷、SHORTCUT_DEFINITIONS 新增項目
- [x] 2.3 實作 AppShell.tsx：接線 `onTogglePlanMode` handler，使用 `useAppStore.getState()` 讀取最新狀態
- [x] 2.4 新增 i18n 翻譯：en.json `shortcuts.togglePlanMode` + `shortcuts.toggleOpenSpec`、zh-TW.json 對應翻譯
- [x] 2.5 驗證：按 Shift+Tab 確認 Plan/Act 切換、快捷鍵面板顯示新快捷鍵

## 3. 全新 SVG Logo

- [x] 3.1 撰寫 CodeForgeLogo 元件測試：驗證 SVG 渲染、size prop、className prop、currentColor stroke
- [x] 3.2 實作 `CodeForgeLogo.tsx`：24x24 viewBox、stroke-width 2、角括號+鐵砧+火花 SVG paths
- [x] 3.3 實作 LoginPage.tsx 替換：`Terminal` icon → `CodeForgeLogo`
- [x] 3.4 實作 ChatView.tsx 歡迎畫面替換：`Sparkles` badge → `CodeForgeLogo`
- [x] 3.5 驗證：登入頁和歡迎畫面顯示新 Logo、dark/light mode 顏色正確

## 4. 頁籤拖曳排序

- [x] 4.1 撰寫 TabBar drag-and-drop 測試：draggable attribute、dragStart 事件、drop 後 reorderTabs 被呼叫、拖曳中點擊被忽略
- [x] 4.2 實作 TabBar.tsx drag 狀態：新增 `dragTabId`、`dragOverTabId`、`dragSide` local state
- [x] 4.3 實作 TabBar.tsx drag handlers：`onDragStart`、`onDragOver`（含左右判斷）、`onDragLeave`、`onDrop`、`onDragEnd`
- [x] 4.4 實作視覺回饋：被拖曳 tab opacity-30、目標 tab 左/右 accent 指示線
- [x] 4.5 實作互動防護：拖曳中禁止 click/close/popover、onDragStart 關閉已開啟 popover
- [x] 4.6 實作鍵盤排序：Ctrl+Shift+ArrowLeft/Right 移動 active tab
- [x] 4.7 驗證：拖曳排序正常、持久化正確、鍵盤排序正常、視覺指示線正確

## 5. 進階登入安全性 — Rate Limiting + Lockout

- [x] 5.1 撰寫 LoginRateLimiter 單元測試：正常通過、超頻被擋(429)、視窗過期重設、成功登入重設
- [x] 5.2 實作 `rate-limiter.ts`：記憶體 Map、isBlocked/record/reset 方法
- [x] 5.3 撰寫 AccountLockout 單元測試：連續失敗觸發鎖定(423)、鎖定期間拒絕、成功重設、持久化
- [x] 5.4 實作 `lockout.ts`：SQLite `login_lockout` 表、isLocked/recordFailure/recordSuccess 方法
- [x] 5.5 撰寫 password-validator 單元測試：< 8 字元被拒、>= 8 字元通過
- [x] 5.6 實作 `password-validator.ts` + 修改 config.ts Zod schema `.min(8)`
- [x] 5.7 整合 auth routes.ts：login handler 中串接 rateLimiter → lockout → bcrypt compare
- [x] 5.8 驗證：rate limit 429、lockout 423、密碼驗證啟動失敗

## 6. 進階登入安全性 — Session 持久化

- [x] 6.1 撰寫 SQLite SessionStore 單元測試：create/validate/invalidate、過期清除、server 重啟存續
- [x] 6.2 改寫 `session.ts`：記憶體 Set → SQLite `sessions` 表，保持相同介面
- [x] 6.3 修改 `index.ts`：`new SessionStore(db)`、定期 cleanup interval（每小時）
- [x] 6.4 修改 auth routes.ts：create 時傳入 ip_address 和 user_agent
- [x] 6.5 驗證：登入/登出正常、重啟 server 後 session 仍有效

## 7. 進階登入安全性 — CSRF + 密碼重設

- [x] 7.1 撰寫 CSRF middleware 測試：safe methods 通過、mutating 無 token 被擋(403)、token 一致通過
- [x] 7.2 實作 `csrf.ts`：generateCsrfToken + createCsrfMiddleware
- [x] 7.3 修改 auth routes.ts：login 成功時設置 csrf cookie
- [x] 7.4 修改 `index.ts`：在 authMiddleware 後掛載 CSRF middleware
- [x] 7.5 修改前端 `api.ts`：讀取 csrf cookie 並附帶 `X-CSRF-Token` header
- [x] 7.6 撰寫密碼重設測試：token 產生、token 驗證成功、token 失效、新密碼複雜度驗證
- [x] 7.7 實作 `reset-cli.ts` + auth routes 中新增 `POST /api/auth/reset-password`
- [x] 7.8 修改前端 LoginPage.tsx：新增「忘記密碼」連結和重設表單
- [x] 7.9 驗證：CSRF token 正確附帶、密碼重設流程可用

## 8. 進階登入安全性 — 活動日誌 + 通知

- [x] 8.1 撰寫 SessionActivityLog 測試：各事件類型寫入、getRecent 查詢、getRecentSuccessIps 查詢
- [x] 8.2 實作 `activity-log.ts`：SQLite `session_activity_log` 表、log/getRecent/getRecentSuccessIps 方法
- [x] 8.3 整合 auth routes.ts：login success/failure/logout 時呼叫 activityLog.log()
- [x] 8.4 新增 `GET /api/auth/activity` endpoint
- [x] 8.5 實作異常登入通知：login success 後檢查新 IP，呼叫 pushService.sendToAll()
- [x] 8.6 修改前端 useAuth.ts：處理 429/423 錯誤碼，解析 retryAfter/lockedUntil
- [x] 8.7 修改前端 LoginPage.tsx：顯示 rate limit/lockout 錯誤訊息、密碼長度提示
- [x] 8.8 新增 i18n 翻譯：auth 相關錯誤訊息（en.json + zh-TW.json）
- [x] 8.9 驗證：活動日誌記錄正確、新 IP 登入收到 push 通知

## 9. OpenSpec UI 面板 — 後端 API

- [x] 9.1 撰寫 OpenSpecService 單元測試：getOverview、listChanges、getChange、updateTask、archiveChange、deleteChange、listSpecs、listArchived
- [x] 9.2 實作 `openspec-service.ts`：檔案系統讀寫服務，所有方法
- [x] 9.3 撰寫 openspec-routes 整合測試：所有 GET/PATCH/POST/DELETE endpoints
- [x] 9.4 實作 `openspec-routes.ts`：Express Router，掛載所有 endpoints
- [x] 9.5 修改 `index.ts`：掛載 `/api/openspec` 路由（authMiddleware 保護）
- [x] 9.6 驗證：所有 API endpoints 回傳正確資料

## 10. OpenSpec UI 面板 — 前端核心元件

- [x] 10.1 新增 Zustand store 狀態：`openspecPanelOpen` + `setOpenspecPanelOpen`
- [x] 10.2 實作 `openspec-api.ts`：API 客戶端（getOverview、listChanges、getChange、updateTask、verifyChange、archiveChange、deleteChange、listSpecs、getSpecFile、listArchived、getArchived）
- [x] 10.3 實作 `OpenSpecPanel.tsx`：主面板容器（desktop 420px + mobile 全螢幕 + backdrop）
- [x] 10.4 實作 `OpenSpecHeader.tsx`：標題 + 重新整理 + 關閉按鈕
- [x] 10.5 實作 `OpenSpecNavTabs.tsx`：四分頁導航（總覽/變更/規格/已封存）
- [x] 10.6 實作 `OpenSpecOverview.tsx`：統計卡片 + 搜尋
- [x] 10.7 驗證：面板開關正常、導航切換正常

## 11. OpenSpec UI 面板 — 變更管理元件

- [x] 11.1 實作 `OpenSpecChanges.tsx`：變更列表 + 空狀態
- [x] 11.2 實作 `ChangeCard.tsx`：可展開卡片 + 進度條 + 內部分頁
- [x] 11.3 實作 `ChangeTasksTab.tsx`：互動式 checkbox 列表 + 批次操作 + optimistic update
- [x] 11.4 實作 `ChangeArtifactViewer.tsx`：Markdown 檢視器（提案/設計）
- [x] 11.5 實作 `ChangeSpecsTab.tsx`：Delta specs 列表 + 變更數統計
- [x] 11.6 實作驗證/封存/刪除操作按鈕 + 確認對話框
- [x] 11.7 驗證：任務勾選即時更新、封存/刪除操作正常

## 12. OpenSpec UI 面板 — 規格 + 封存 + 整合

- [x] 12.1 實作 `OpenSpecSpecs.tsx`：主規格目錄瀏覽 + Markdown 檢視
- [x] 12.2 實作 `OpenSpecArchived.tsx`：已封存變更列表 + 唯讀詳情
- [x] 12.3 修改 `TopBar.tsx`：新增 OpenSpec 按鈕（BookOpen icon），受 openspecEnabled 控制
- [x] 12.4 修改 `AppShell.tsx`：渲染 OpenSpecPanel、與 ArtifactsPanel 互斥
- [x] 12.5 修改 `useGlobalShortcuts.ts`：新增 `Alt+O` handler + `onToggleOpenSpec` action
- [x] 12.6 新增 i18n 翻譯：openspecPanel.* 所有鍵（en.json + zh-TW.json）
- [x] 12.7 驗證：TopBar 按鈕切換面板、Alt+O 快捷鍵、全功能端到端測試
