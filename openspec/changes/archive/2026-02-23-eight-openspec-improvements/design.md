## Context

OpenSpec 面板是 AI Terminal 中管理規格驅動開發的核心 UI。目前存在以下問題：

1. **Task checkbox toggle 失敗**：前端傳 `line.raw` 但後端 regex 期望 `line.text`
2. **差異規格只顯名稱**：DeltaSpecsView 僅列出目錄名稱，無 API 讀取 delta spec 內容
3. **無 Init 按鈕**：「未找到 OpenSpec」狀態只有文字提示
4. **無即時監聽**：外部修改 openspec/ 時面板不會自動刷新
5. **LLM 語言綁定 UI 語言**：無法獨立設定 AI 回應語言
6. **系統提示詞無防護**：缺少基礎 prompt injection 防禦

後端為 Express 5 + WebSocket（ws 套件），前端為 React 19 + Zustand 5 + Tailwind CSS 4。

## Goals / Non-Goals

**Goals:**

- 修復所有已知 bug（checkbox toggle、差異規格顯示）
- 新增 OpenSpec init 功能（透過 CLI）
- 新增 chokidar 檔案監聽 + WebSocket broadcast 即時更新
- 新增獨立 LLM 語言設定
- 加入基礎 prompt injection 防護

**Non-Goals:**

- 不封裝 OpenSpec CLI 的其他指令（僅 init）
- 不實作進階 prompt injection 防護（雙重 LLM、輸入清理）
- 不支援 CWD 動態切換 watcher
- 不將 openspec 加入 npm 依賴

## Decisions

### D1: Checkbox toggle 修復策略

**選擇**：前端修改 3 行，將 `line.raw` 改為 `line.text`。

**替代方案**：修改後端 regex 接受完整 markdown 行。
**取捨**：前端修復更安全（3 行變更 vs 重寫 regex 邏輯），且保持後端 API 語意清晰（接收任務文字而非 markdown 原始行）。

### D2: Delta spec 內容載入方式

**選擇**：新增 `GET /api/openspec/changes/:name/specs/:specName` 路由 + 前端 accordion 按需載入。

**替代方案 A**：在 `getChange()` 回傳時一併載入所有 delta spec 內容。
**取捨**：按需載入避免在有大量 delta specs 的 change 中一次載入過多內容。Accordion UI 讓使用者控制展開/摺疊，體驗更好。

**替代方案 B**：復用現有 `GET /specs/:name` 路由。
**取捨**：不可行，因為 delta specs 存放在 `changes/{name}/specs/` 而非全域 `specs/`，路徑不同。

### D3: OpenSpec 初始化方式

**選擇**：透過 `child_process.spawn` 呼叫 `openspec init` CLI。

**替代方案**：用 `fs` 直接建立 openspec/ 目錄結構和 config.yaml。
**取捨**：使用 CLI 保持與 openspec 工具的行為一致性，避免自行維護初始化邏輯。缺點是需要全域安裝 openspec CLI，但透過 503 錯誤 + 安裝指引已妥善處理。

### D4: 即時檔案監聽架構

**選擇**：chokidar 監聽 + WebSocket broadcast + 前端 CustomEvent。

**替代方案 A**：前端輪詢（每 5 秒 GET overview）。
**取捨**：輪詢簡單但延遲高、浪費資源。chokidar + WebSocket 為即時且高效，且已有 WebSocket 基礎設施。

**替代方案 B**：SSE（Server-Sent Events）。
**取捨**：SSE 是單向的，適合此場景，但不利用現有 WebSocket 基礎設施，需要額外的連線管理。

**實作細節**：
- `createWsServer` 回傳新增 `broadcast` 函數
- OpenSpecWatcher 使用 chokidar，debounce 500ms
- 前端透過 `window.dispatchEvent(CustomEvent)` 解耦監聽邏輯
- 只在面板開啟時訂閱事件

### D5: LLM 語言設定存放

**選擇**：新增 `llmLanguage` 欄位到 AppSettings，獨立於 `language`（UI 語言）。

**替代方案**：復用 `language` 欄位同時控制 UI 和 LLM。
**取捨**：獨立欄位讓使用者可以 UI 用英文但 AI 回覆中文（或反之），彈性更大。`null` 值表示「跟隨 UI 語言」，維持向下相容。

### D6: Prompt injection 防護方式

**選擇**：系統提示詞新增 Security Boundaries 段落 + XML 分隔符包裹使用者可控內容。

**替代方案 A**：輸入過濾（regex 清理注入模式）。
**取捨**：過濾容易產生誤報且無法涵蓋所有變種。宣告式防護讓模型自行判斷，成本低效果好。

**替代方案 B**：雙重 LLM 檢查。
**取捨**：需額外 API 呼叫，延遲和成本都高。基礎防護已足夠個人工具場景。

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| openspec CLI 未全域安裝，init 功能不可用 | 後端先檢查 `command -v openspec`，回傳 503 + 安裝說明 |
| chokidar 在大型 openspec 目錄下可能產生過多事件 | Debounce 500ms 合併事件，限制監聽深度 5 層 |
| Prompt injection 防護不是 100% 可靠 | 基礎防護 + XML 分隔符組合已足夠個人工具場景，後續可升級 |
| WebSocket broadcast 改動影響現有連線行為 | broadcast 只新增功能，不修改現有 router 邏輯，向下相容 |
| Delta spec API 路由與現有 `:name` 路由可能衝突 | 將更具體的路由 (`/changes/:name/specs/:specName`) 放在通用路由前面 |
