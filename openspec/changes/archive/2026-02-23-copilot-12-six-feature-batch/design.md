## Context

CodeForge 目前的 desktop 版 chat 輸入框上方有一排 toolbar（ModelSelector、CwdSelector、PlanActToggle、Clock、WebSearchToggle），手機版則將大部分控制項收進 MobileToolbarPopup。排程和搜尋按鈕在 desktop 佔用 toolbar 空間，使用者希望統一為 inline 設計。

Plan/Act 模式切換目前只能透過 UI 按鈕操作，缺少快捷鍵。登入頁使用 lucide 的 Terminal icon，無品牌辨識度。認證系統缺少 rate limiting、session 持久化等安全措施。頁籤無法拖曳排序。OpenSpec 工作流只能透過 slash commands 操作。

## Goals / Non-Goals

**Goals:**
- 將排程和 WebSearch 按鈕移入輸入框內，desktop/mobile 體驗一致
- 提供 Shift+Tab 和 Alt+O 全域快捷鍵
- 建立 CodeForge 品牌 SVG Logo 元件
- 實作完整的認證安全防護鏈（rate limit → lockout → CSRF → persistent session → activity log → notification）
- 頁籤支援 drag-and-drop 排序
- 右側滑出面板提供 OpenSpec 視覺化管理

**Non-Goals:**
- 不實作多使用者系統、OAuth、2FA
- 不引入外部 DnD 套件
- 不實作 OpenSpec 面板內的 inline 編輯
- 不實作面板可調整寬度

## Decisions

### D1: 排程 + WebSearch 按鈕位置策略

**選定方案**：利用 Input 元件現有的 `leftActions` prop，將 Clock 和 WebSearchToggle 直接注入輸入框內部左下角。

**替代方案**：在 Input 元件右側新增 `rightActions` 區域，放在 send 按鈕左方。
**取捨**：leftActions 已存在且運作良好，右側空間已被 statusText + attach + send 按鈕佔滿，不適合再新增按鈕。

**實作要點**：
- 移除 desktop toolbar 中的 Clock 和 WebSearchToggle（兩處：空對話 + 主對話）
- 將 leftActions 容器從 `flex md:hidden` 改為 `flex`
- MobileToolbarPopup 用 `<div className="md:hidden">` 獨立包裹
- WebSearchToggle 在 leftActions 內需調整為無邊框 inline 樣式

### D2: Shift+Tab 快捷鍵處理

**選定方案**：在 `useGlobalShortcuts` 的 keydown handler 中，`if (!alt) return` 之前新增 Shift+Tab 檢測，呼叫 `e.preventDefault()` 阻止瀏覽器焦點導航。

**替代方案**：使用 Alt+Shift+P 三鍵組合。
**取捨**：Shift+Tab 與 Claude Code 一致，雖然覆蓋了瀏覽器預設行為，但在 SPA chat app 中 Shift+Tab 焦點導航需求極低。

**安全措施**：Streaming 中不允許切換（檢查 `tab.isStreaming`），使用 `useAppStore.getState()` 避免 stale closure。

### D3: SVG Logo 設計方法

**選定方案**：建立 `CodeForgeLogo.tsx` React 元件，內嵌 inline SVG，使用 lucide-style 的 24x24 viewBox + `stroke="currentColor"` 設計。

**替代方案**：使用 PNG/SVG 靜態檔案 import。
**取捨**：React 元件可直接接受 `size`、`className` props，與 lucide-react API 一致，支援 Tailwind 顏色 class 控制，無需額外 asset pipeline。

### D4: 認證安全架構 — 分層防護

**選定方案**：多層獨立模組，各自職責明確：

| 層級 | 模組 | 儲存 | 職責 |
|------|------|------|------|
| L1 | `rate-limiter.ts` | 記憶體 Map | 每 IP 每分鐘 5 次限制 |
| L2 | `lockout.ts` | SQLite | 連續失敗 10 次鎖 15 分鐘 |
| L3 | `session.ts` | SQLite | 持久化 session + metadata |
| L4 | `csrf.ts` | Cookie | Double-submit cookie 模式 |
| L5 | `activity-log.ts` | SQLite | 事件日誌 |
| L6 | `password-validator.ts` | — | 密碼複雜度檢查 |

**替代方案**：使用 express-rate-limit 套件。
**取捨**：單一登入 endpoint 的 rate limiting 邏輯簡單，自建 < 50 行程式碼即可完成，避免引入外部依賴。

**Session 持久化**：改寫 `SessionStore` class 保持相同介面（`create`, `validate`, `invalidate`），middleware 和 WebSocket server 無需修改。新增 `ip_address`, `user_agent`, `last_activity` 欄位支援活動追蹤。

**CSRF**：Double-submit cookie 模式 — 登入成功時同時設置 non-httpOnly `csrf` cookie，前端每次 mutating request 讀取 cookie 值放入 `X-CSRF-Token` header，後端比對兩者一致性。搭配現有 `sameSite: 'strict'` 提供雙層防護。

**密碼重設**：CLI 產生一次性 token 寫入 `data/reset-token.txt`，前端提供重設表單輸入 token + 新密碼。適合單人自建工具，無需 email 基礎設施。

### D5: 頁籤拖曳排序 — Pointer Events + Immediate Swap

**選定方案**：Pointer Events API（`onPointerDown` / `onPointerMove` / `onPointerUp`），搭配 `setPointerCapture` 鎖定 X 軸拖曳，零外部依賴。

**替代方案 A**：HTML5 原生 drag-and-drop API。取捨：native DnD 無法鎖定拖曳軸向，ghost image 無法客製化，且 drop 後才能 reorder 體驗不佳。
**替代方案 B**：`@dnd-kit/core` + `@dnd-kit/sortable` (~25KB gzipped)。取捨：引入外部依賴。

**拖曳機制**：
- 5px 閾值啟動拖曳，避免誤觸
- `setPointerCapture` 確保 pointer 離開元素後仍持續追蹤
- 即時交換：游標跨越目標 tab 中點時立即呼叫 `reorderTabs()`，搭配 `flushSync` 確保同步 DOM 更新
- `offsetLeft` 差值補償：swap 後重新計算 `startX`，確保游標與被拖曳 tab 位置對齊
- Imperative `el.style.transform = translateX(dx)` 繞過 React re-render，實現流暢的游標跟隨

**視覺回饋**：
- 被拖曳 tab: `z-50 shadow-lg opacity-90`，跟隨游標水平位移
- 放開時：CSS `transition: transform 120ms ease-out` 動畫滑回原位，`transitionend` 事件清除狀態

**防護措施**：拖曳中禁止 click/close/popover 操作，`wasDraggingRef` 防止 pointerUp 後的 click 事件觸發，`dragInfoRef.current = null` 在動畫完成前阻止後續 pointer 處理。

### D6: OpenSpec UI 面板架構

**選定方案**：右側滑出面板，參考現有 `ArtifactsPanel` 的 pattern。

**替代方案 A**：左側導航面板。取捨：左側空間已被 mobile drawer 使用，且與 Spectra 的全頁面設計不同。
**替代方案 B**：全頁面模式。取捨：需要離開 chat context，操作流程中斷。

**面板行為**：
- Desktop: 420px 固定寬度，`border-l border-border`
- Mobile: `fixed inset-0 z-50` 全螢幕 + backdrop
- 與 ArtifactsPanel 互斥（開一關一），避免佈局衝突

**後端架構**：
- `OpenSpecService` class 封裝所有檔案系統操作（同步 `fs.readFileSync`，與現有 `PromptFileStore` 一致）
- `openspec-routes.ts` Express Router，掛載於 `/api/openspec`
- openspec root path: `path.resolve(config.defaultCwd, 'openspec')`

**前端元件策略**：
- 面板內部狀態（active section, expanded change）使用 React local state
- `openspecPanelOpen` 儲存於 `TabSession` 介面中（per-tab 狀態），每個頁籤獨立控制面板開關
- `setTabOpenspecPanelOpen(tabId, open)` setter 內建互斥邏輯：開啟時自動關閉同 tab 的 `artifactsPanelOpen`，反之亦然
- API 資料不緩存在 store，每次開啟面板重新 fetch（本地檔案系統讀取足夠快）

**任務勾選機制**：
- 解析 `tasks.md` 的 `- [x]` / `- [ ]` 格式
- PATCH API 傳送 lineNumber + action
- 前端 optimistic update + server 回傳後 reconcile

## Risks / Trade-offs

### [R1] Shift+Tab 覆蓋瀏覽器預設行為
→ **緩解**：Claude Code 使用相同快捷鍵，SPA 中 Shift+Tab 導航需求極低。Settings panel 開啟時仍會觸發，但其他快捷鍵也有此行為，與現有 pattern 一致。

### [R2] 記憶體 rate limiter 資料在重啟後遺失
→ **緩解**：Rate limiter 是短期防護（1 分鐘視窗），重啟後重新開始計數是可接受的。長期防護由 SQLite lockout 提供。

### [R3] Session 遷移 — 現有 session 失效
→ **緩解**：升級後所有使用者（單人）需重新登入。對單人工具來說這是可接受的一次性不便。

### [R4] OpenSpec 面板讀取大型檔案可能造成延遲
→ **緩解**：所有讀取操作為本地檔案系統同步讀取，< 1ms。如果 tasks.md 非常長（> 1000 行），前端渲染可能稍慢，但實際使用中不太可能達到此規模。

### [R5] 任務勾選的併發修改
→ **緩解**：單人使用，不會有併發問題。PATCH API 使用 lineNumber 定位，如果檔案被 AI 同時修改可能導致行號偏移。可透過前端顯示「檔案已變更，請重新整理」提示。

## Open Questions

- 無（本次批次的設計決策均已明確）
