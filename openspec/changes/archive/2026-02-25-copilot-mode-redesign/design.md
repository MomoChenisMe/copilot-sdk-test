## Context

CodeForge 目前有兩種操作模式：Plan Mode（規劃）和 Act Mode（執行）。Act Mode 映射到 Copilot SDK 的 `interactive` 模式，但 SDK 提供了更強大的 `autopilot` 模式（自動執行，無需逐步確認）。此外，Plan Mode 的自訂提示詞未被注入 SDK system message，Plan 完成後的執行流程在同一 session 上清除 context（而非建立乾淨的新 session），Fleet Mode sub-agent 事件完全未轉發，Todos 的 post-tool-use hook 在恢復 session 時因 `workspacePath` 為 undefined 導致從未觸發。

本次重設計需要在不中斷現有功能的前提下，將模式系統完全對齊 SDK 原生能力。

## Goals / Non-Goals

**Goals:**

- 將 Act Mode 重新命名為 Autopilot Mode，映射到 SDK `autopilot` 模式
- Plan Mode 和 Autopilot Mode 都注入對應的自訂提示詞（透過 SDK `append` 模式）
- Plan 完成後建立全新 SDK session 執行計劃（乾淨 context）
- 轉發 SDK 的 sub-agent 事件到前端並顯示
- 修復 Todos 在恢復 session 時不觸發的問題
- 所有變更需向後相容（舊 API 端點保留為別名）

**Non-Goals:**

- 不實作 Fleet Mode 的手動 UI 控制（由 agent 自行決定）
- 不新增 `interactive` 或 `shell` 模式
- 不改變 SQLite schema
- 不引入新的 npm dependency

## Decisions

### D1: SDK 模式映射策略

**決策**：Autopilot Mode 直接映射到 SDK `autopilot`（而非 `interactive`）

- **替代方案**：繼續使用 `interactive` 模式 + 自訂 approve-all permission handler
- **取捨**：`autopilot` 是 SDK 原生支援的全自動模式，agent 不會在每個工具呼叫時暫停等待確認。`interactive` 模式下即使有 approve-all handler，SDK 內部的行為流程仍不同（例如 context 管理、tool batching）。選擇 `autopilot` 更符合我們的使用場景——個人工具不需要逐步確認。

### D2: Prompt 注入方式

**決策**：使用 SDK `systemMessage: { mode: 'append' }` 搭配 PromptComposer 組合後的完整 prompt

- **替代方案**：使用 `replace` 模式完全控制 system prompt
- **取捨**：`append` 保留了 SDK 的內建 guardrails 和模式行為提示，我們只需附加專案特定的指示。`replace` 會失去 SDK 原生的 plan mode 行為定義（如 read-only 限制、plan.md 輸出格式），需要自己重新實作這些行為。

### D3: Plan → Autopilot 轉換建立新 Conversation

**決策**：建立新的 conversation record（新 conversationId + 新 SDK session），前端 tab 切換到新 conversation

- **替代方案 A**：在同一 conversation 上清除 SDK session（目前做法）
- **替代方案 B**：建立全新 tab + 新 conversation
- **取捨**：方案 A 的問題是同一 conversation 會混合 plan 對話和執行對話的歷史紀錄，且共用同一個 context window（plan 對話佔用空間）。方案 B 太過分離，使用者需要在 tab 間切換。選擇建新 conversation 但保持同一 tab，既有乾淨的 context，又不增加 tab 管理負擔。舊的 plan conversation 保留在 DB 中可供回溯。

### D4: Sub-agent 事件轉發架構

**決策**：在 EventRelay 中新增 4 個事件監聽器，直接轉發到 WebSocket，前端用獨立的 SubagentPanel 組件顯示

- **替代方案**：將 sub-agent 事件合併到現有的 tool execution 事件流中
- **取捨**：Sub-agent 是獨立的併行執行單元，不適合混入序列化的 tool 事件流。獨立的 Panel 讓使用者清楚看到有哪些 agent 在工作、各自的狀態。組件參考 TaskPanel 的可收合模式，保持 UI 一致性。

### D5: Todos workspacePath 修復策略

**決策**：在 `getWorkspacePath` 中加入 fallback 路徑查找 + debug logging

- **替代方案 A**：在 conversation DB 中儲存 workspacePath
- **替代方案 B**：使用 `onPreToolUse` hook 替代 `onPostToolUse`
- **取捨**：方案 A 需要 DB schema 變更（violates non-goal）。方案 B 無法取得工具執行結果。選擇 fallback 策略：先嘗試 `session.workspacePath`，若為 undefined 則依 SDK 慣例路徑模式（`~/.copilot-cli/sessions/{sessionId}/`）查找 `session.db`。同時加入詳細的 debug logging 以便追蹤問題。

### D6: API 向後相容

**決策**：保留 `/act-prompt` API 端點作為 `/autopilot-prompt` 的別名

- **替代方案**：直接移除舊端點
- **取捨**：設定面板可能有快取的 API 呼叫，保留別名確保平滑過渡。成本極低（幾行路由別名）。

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| SDK `autopilot` 模式行為可能與 `interactive` + approve-all 不同，影響現有使用體驗 | 先在開發環境充分測試 autopilot 模式的工具執行行為；保留 `setMode` RPC 可隨時切回 |
| 建立新 conversation 執行 plan 可能遺失 plan 對話中提到的上下文 | plan.md 內容作為完整的首次提示詞傳入新 session，包含所有必要的上下文資訊 |
| `workspacePath` fallback 路徑可能因 SDK 版本更新而改變 | 加入 debug logging，fallback 失敗時記錄完整路徑資訊便於排查 |
| Sub-agent 事件欄位可能因 SDK 更新而變化 | 使用 defensive coding（`d?.field ?? fallback`），與現有 EventRelay 模式一致 |
| `ACT_PROMPT.md` → `AUTOPILOT_PROMPT.md` 遷移可能影響已自訂提示詞的使用者 | file-store 初始化時自動檢測並遷移（rename），不丟失自訂內容 |

## Open Questions

- SDK `autopilot` 模式是否有不同的 rate limiting 或 token quota 行為？（低風險，個人工具）
- Fleet Mode 的 `session.fleet.start()` RPC 是否需要在特定條件下手動觸發，還是完全由 agent 自行決定？（目前假設後者）
