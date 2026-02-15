## Context

AI Terminal 是一個跑在 Linux VPS 上的個人 Web 應用，透過手機瀏覽器操控。目前已具備對話式 Copilot Agent、Terminal 操作、對話管理、多模型切換等功能。

現況問題：
- Copilot handler 是全域單例閉包，`activeSession`/`accumulation` 等狀態共用於所有 WS 連線
- WS 斷線時事件累積內容遺失（只在 `copilot:idle` 時持久化）
- 無系統提示詞或記憶機制
- Heartbeat timeout 60 秒在手機場景過短
- 工具輸出 `<pre>` 區塊缺乏視覺結構

技術棧：TypeScript + Node.js + Express + ws + better-sqlite3（後端）；React 19 + Vite 6 + Tailwind CSS 4 + Zustand 5（前端）。Copilot SDK 已確認 `SessionConfig.systemMessage` 支援 `{ mode: 'append', content: string }`。

## Goals / Non-Goals

**Goals:**
- 背景執行 Agent，WS 斷線不中斷串流，回來後完整呈現
- 多對話平行串流（可配置上限）
- 檔案式系統提示詞 + 跨對話記憶，自動注入 SDK session
- 修復手機背景 WS 斷線問題
- ToolResultBlock 卡片化重設計
- 全系統 Noto Sans TC 字體

**Non-Goals:**
- 多人協作、訊息編輯/重新生成、語音 I/O
- AI 主動更新記憶（Phase 1 僅手動）
- Rich Markdown Editor
- 模型切換帶上下文、工作目錄切換

## Decisions

### D1: StreamManager 架構 — EventEmitter-based per-conversation stream

**決策**：新增 `StreamManager` 類別（extends `EventEmitter`），以 `Map<conversationId, ConversationStream>` 管理每個對話的串流狀態。每個 ConversationStream 擁有獨立的 session、accumulation、relay、eventBuffer 和 dedup sets。

**替代方案**：
- **(A) 保持全域單例 + 加鎖** — 簡單但無法支援多串流並行，根本不解決問題
- **(B) Database-backed event log** — 每個事件寫入 DB，catch-up 時從 DB 回放。持久化更強，但增加 I/O 負擔和複雜度

**取捨**：選擇記憶體內 buffer + EventEmitter fan-out。Buffer 是暫時的（idle 後清除），server crash 會丟失未完成的串流，但對單人系統可接受。EventEmitter 是 Node.js 標準模式，處理 add/remove/emit 簡潔高效。

### D2: Subscribe/Unsubscribe 機制取代全域 send callback

**決策**：Copilot handler 不再持有串流狀態，改為薄路由層。前端透過 `copilot:subscribe` / `copilot:unsubscribe` 管理訂閱，StreamManager 負責 fan-out 和 catch-up 回放。

**替代方案**：
- **(A) 前端只從 DB 讀取** — 不需 subscribe 機制，但失去即時串流 UX，使用者看到的永遠是最後持久化的快照

**取捨**：Subscribe 機制保留即時串流體驗，catch-up 回放的 eventBuffer 讓使用者回到對話時能無縫銜接。代價是多了幾個 WS 訊息類型。

### D3: 檔案系統存儲提示詞和記憶（非 DB）

**決策**：提示詞和記憶存為 Markdown 檔案在 `./data/prompts/` 目錄下，透過 `PromptFileStore` 類別管理。

**替代方案**：
- **(A) SQLite 表格** — 可與現有 DB 整合，支援搜尋和版本控制。但提示詞是長文本，Markdown 檔案更直覺、可直接用編輯器修改、版本控制友善

**取捨**：檔案系統更簡單直覺，使用者可以直接 SSH 上去編輯。缺點是沒有原子事務和併發控制，但單人系統不需要。

### D4: Heartbeat 所有訊息重置 + Page Visibility API

**決策**：後端 timeout 增至 180s 且所有 WS 訊息都重置 timer（不只 ping）。前端加 Page Visibility API，回到前景時立即 ping 或重連。

**替代方案**：
- **(A) WebSocket native ping/pong** — 使用 WS 協議層的 ping/pong 而非 application-level。但某些 proxy（Nginx）可能攔截或不轉發

**取捨**：Application-level ping 更可控、更易除錯。180s timeout 夠寬裕，搭配 Visibility API 即時重連，大幅減少不必要的斷線。

### D5: ToolResultBlock 卡片化 — 復用現有 ToolRecord 樣式

**決策**：ToolResultBlock 採用與 ToolRecord 一致的卡片結構（`rounded-xl border border-border overflow-hidden` + header `bg-code-header-bg`），不動 Markdown.tsx 的 hljs code blocks。

**替代方案**：
- **(A) VS Code 終端風格** — 更有「終端感」但在手機觸控上可能太密集
- **(B) 完全自訂設計** — 更靈活但增加維護成本和視覺不一致風險

**取捨**：復用現有卡片風格保持視覺一致性，新增的 header（status icon + 工具名 + 複製按鈕）提供必要資訊，代價是看起來跟 code block 有點像（但可透過 header 內容區分）。

### D6: 全系統字體 — Google Fonts CDN

**決策**：透過 `<link>` 標籤從 Google Fonts CDN 載入 Noto Sans TC（400/500/700），配合 `font-display: swap` 避免 FOIT。

**替代方案**：
- **(A) Self-hosted 字體** — 不依賴外部 CDN，但 Noto Sans TC CJK 字體檔案大（~4MB），增加 VPS 頻寬負擔

**取捨**：CDN 利用全球快取，首次載入後幾乎零延遲。若 VPS 網路環境受限，可後續改為 self-hosted。

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| Server crash 丟失活躍串流的 eventBuffer | Graceful shutdown 時呼叫 `streamManager.shutdown()` 持久化所有串流。非預期 crash 會遺失，但 SDK session 可 resume |
| eventBuffer 記憶體消耗（長時間串流累積大量事件） | 設定 buffer 上限（如 1000 個事件），超過後只保留最新 N 個 + 截斷標記 |
| Google Fonts CDN 不可用 | 字體 stack 包含 system fonts fallback，視覺退化但不影響功能 |
| 提示詞檔案過大導致 token 超限 | `PromptComposer` 設定最大 prompt 長度，超過時截斷並記 log 警告 |
| `copilot:abort` breaking change 影響舊前端 | 前後端一起部署；單人系統不存在版本不一致問題 |
| 多串流並行消耗 SDK 資源 | 可配置 `maxConcurrent`，預設 3，超出拒絕並回傳錯誤 |
| 檔案存儲 path traversal 攻擊 | `PromptFileStore` 消毒所有檔案名（reject `/`, `..`, 特殊字元） |

## Migration Plan

1. **F2 字體** — 純前端，零風險部署
2. **F4 heartbeat** — 後端 + 前端獨立變更，向後相容
3. **F1 ToolResultBlock** — 純前端元件重構
4. **F5 StreamManager** — 核心重構，需前後端同時部署
   - 先部署後端（新 handler 相容舊前端的 `copilot:send`/`copilot:abort`，abort 無 conversationId 時 fallback 到最後活躍串流）
   - 再部署前端（subscribe/unsubscribe 邏輯）
5. **F3 prompt/memory** — 建在 F5 之上，後端 API 先行，前端 UI 跟進

**Rollback**：每個 Feature 獨立 commit，可逐一 revert。F5 是最大風險點，建議在 staging 環境完整測試後再部署。

## Open Questions

- `eventBuffer` 的最大容量應設多少？需根據實際串流事件量測試決定
- 是否需要在 `copilot:abort` 上做向後相容（無 conversationId 時 fallback）？建議是，降低部署風險
- Memory 中的 `projects/` 和 `solutions/` 目錄如何讓 AI 主動讀取？Phase 1 透過系統提示詞告知路徑，AI 可用 SDK 內建工具讀取
