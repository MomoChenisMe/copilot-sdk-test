## Context

AI Terminal 目前採用單一對話視圖架構：Zustand Store 持有一組全域串流狀態（`streamingText`、`toolRecords`、`turnSegments` 等），同一時間僅渲染一個活躍對話。後端 `StreamManager` 已支援最多 3 個並行串流，但前端無法善用此能力。此外存在串流事件洩漏 Bug、缺乏模型記憶、無內建技能等問題。

本設計將 AI Terminal 從單對話工具升級為多 Agent 並行工作站，涵蓋 4 個批次的改進。

## Goals / Non-Goals

**Goals:**
- 修復串流事件在對話切換時洩漏到錯誤對話的 Bug
- 新對話自動使用使用者上次選擇的模型
- 打包 8 個系統預設技能，唯讀但可停用
- 實現 Tab 頁籤式多對話並行 UI，每個 Tab 獨立運作

**Non-Goals:**
- Terminal 終端機整合到 Tab 系統（後續批次）
- Tab 分割視圖（同時顯示多個對話畫面）
- 內建技能的自動更新或版本管理
- Tab 拖拽到新視窗

## Decisions

### Decision 1: 事件路由策略 — 後端注入 conversationId

**選擇**：在 `StreamManager.processEvent()` 統一注入 `conversationId` 到所有廣播事件的 `data` 中。

**替代方案**：前端根據 WebSocket subscription 的 context 推斷事件歸屬。
- 取捨：需要前端維護 subscription → conversationId 的映射，且在 reconnect 時容易錯亂。後端統一注入更可靠，且是向後相容的（前端原本忽略未知欄位）。

### Decision 2: Store 架構 — per-tab state 在 Record 中

**選擇**：`tabs: Record<string, TabState>`，每個 TabState 包含完整的串流狀態（messages、streamingText、toolRecords 等）。`tabOrder: string[]` 維護 Tab 順序。

**替代方案 A**：保持全域串流狀態 + activeTabId 切換時 swap in/out。
- 取捨：切換時需要序列化/反序列化整個狀態，容易遺漏欄位，且背景 Tab 的事件無處暫存。

**替代方案 B**：每個 Tab 用獨立的 Zustand store instance。
- 取捨：需要動態建立/銷毀 store，React 生命週期管理複雜，且跨 Tab 的全域狀態（theme、models）難以共享。

### Decision 3: WebSocket 事件路由 — 單一 hook 多路分發

**選擇**：新建 `useTabCopilot` hook，接收所有 WebSocket 事件，根據 `data.conversationId` 路由到對應 Tab 的 store state。

**替代方案**：每個 Tab 建立獨立的 WebSocket 連線。
- 取捨：多連線增加伺服器負擔，且 session cookie 認證下多 WS 連線需要額外管理。單連線多路分發更高效。

### Decision 4: 內建技能存儲 — 原始碼目錄嵌入

**選擇**：內建技能放在 `backend/src/skills/builtin/` 目錄，隨程式碼版本管理，由 `BuiltinSkillStore` 讀取。

**替代方案 A**：首次啟動時從 GitHub 下載。
- 取捨：需要網路存取、增加啟動時間、有版本漂移風險。嵌入原始碼更穩定。

**替代方案 B**：存放在 `data/skills/` 目錄，啟動時 seed。
- 取捨：使用者可能誤刪或修改，無法區分 builtin/user。獨立目錄更清晰。

### Decision 5: 內建技能保護 — API 層拒絕

**選擇**：在 Skills Routes 層檢查 skill name 是否為 builtin，寫入/刪除操作回傳 403。

**替代方案**：SkillFileStore 層拒絕。
- 取捨：FileStore 是通用的，不應負責業務邏輯。Route 層是正確的守衛點。

### Decision 6: Tab 持久化 — localStorage

**選擇**：開啟的 Tab 列表（tabOrder + activeTabId）持久化到 `localStorage('ai-terminal:openTabs')`，頁面重載時恢復。訊息則懶載入。

**替代方案**：不持久化，每次重載從空白開始。
- 取捨：使用者體驗差，尤其在手機瀏覽器偶爾重載的場景。localStorage 輕量且足夠。

### Decision 7: 模型記憶 — localStorage 前端持久化

**選擇**：新增 `lastSelectedModel` 到 Zustand store，持久化到 `localStorage('ai-terminal:lastSelectedModel')`。

**替代方案**：後端存儲使用者偏好。
- 取捨：單人使用場景下 localStorage 足夠，不需要後端 API 和 DB schema 變更。

## Risks / Trade-offs

**[Risk] Store 重構影響面大** → 批次 4 的 Store 重構是最大風險點，涉及所有讀取全域串流狀態的元件。Mitigation：在過渡期保留舊 actions 作為 wrapper 委派到 active tab，確保漸進式遷移。

**[Risk] 背景 Tab 記憶體累積** → 多個 Tab 各自持有 messages 和串流狀態，長期使用可能消耗大量記憶體。Mitigation：設定軟性 Tab 上限（10-15 個），超過時提示使用者關閉不用的 Tab。

**[Risk] WebSocket 重連時的事件遺漏** → 重連後需要重新訂閱所有開啟 Tab 的活躍串流。Mitigation：`useTabCopilot` 在 WebSocket reconnect 事件時，比對 `copilot:active-streams` 和開啟的 Tab，自動重新訂閱。

**[Risk] 內建技能的 Build 產物遺漏** → `backend/src/skills/builtin/*.md` 是非 TypeScript 檔案，可能不會被 tsc 複製到 dist/。Mitigation：由於本專案使用 tsx（esbuild-based）直接執行 TypeScript，不經過 dist/ 編譯，此風險較低。若需要 build，則增加 postbuild 複製腳本。

**[Risk] 並行串流達上限** → MAX_CONCURRENCY=3，開啟超過 3 個 Tab 同時串流時會被拒絕。Mitigation：前端在 `copilot:error` 返回 "Concurrency limit reached" 時顯示友善提示，建議使用者等待其他 Agent 完成。

**[Trade-off] 單一 WebSocket 連線** → 所有 Tab 共用同一 WS 連線，簡化管理但所有事件經由同一通道。對於 3 個並行串流，頻寬不是問題。若未來擴展到更多並行串流，可考慮改為多連線。

## Migration Plan

### 實作順序

1. **批次 1（Bug Fix）**：最小改動，先修復再做其他功能
2. **批次 2（模型記憶）**：純前端改動，獨立且低風險
3. **批次 3（內建技能）**：前後端都改，但範圍封閉
4. **批次 4（Tab UI）**：最大重構，依賴批次 1 的 conversationId 注入

### Rollback

- 批次 1-3 各自獨立，可單獨 revert
- 批次 4 因涉及 Store 重構，建議在新 branch 開發，完成後 merge

## Open Questions

- 批次 3 的 8 個技能中，`ui-ux-pro-max` 包含 Python 腳本和 CSV 資料檔案，需確認是否全量嵌入或簡化為純 Markdown 版本
- 批次 4 的 Tab 右鍵選單是否需要在第一版實現，還是可以延後（先做基本的 Tab 新增/切換/關閉）
