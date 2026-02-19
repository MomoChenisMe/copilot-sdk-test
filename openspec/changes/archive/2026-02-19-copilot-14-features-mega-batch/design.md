## Context

AI Terminal 經過多輪迭代已具備核心功能（Copilot Agent 對話、Terminal 操作、背景串流、多 Tab 管理），但在日常手機使用中暴露了以下技術缺陷：

1. **前端韌性不足**：瀏覽器關閉/重整後，後端串流仍在執行，但前端無法恢復 AskUser 對話狀態，導致畫面空白
2. **AskUser 功能受限**：僅支援單選 + 自由輸入，缺少多選；全螢幕 modal 在手機上體驗不佳
3. **UI/UX 粗糙**：Toggle 全紫色、思考動畫簡陋、底部工具列在行動裝置擁擠
4. **缺少基礎設施**：無 MCP 工具擴展、無定時任務排程、無 SDK 版本管理

**現有架構基礎：**
- 後端 StreamManager singleton 管理所有串流，支援 subscriber 訂閱/取消訂閱
- WebSocket 使用 prefix-based routing（`copilot:*`, `terminal:*`, `cwd:*`）
- 前端 Zustand store 管理 per-tab 狀態，`useTabCopilot` hook 處理 WS 事件
- Tailwind v4 + CSS custom properties 設計系統

## Goals / Non-Goals

**Goals:**
- 前端斷線重連後能完整恢復串流狀態與 pending AskUser 對話
- AskUser 支援多選模式，並從 modal overlay 改為 inline chat card
- 所有 UI 元件在 320px ~ 1920px 均正常顯示
- 整合 MCP 協議，支援 stdio + HTTP 傳輸，提供 Settings UI 管理
- 支援 cron 定時任務（AI 對話 + Shell 命令）
- SDK 版本檢查 + 一鍵更新
- 統一 Toggle 元件風格、升級思考動畫

**Non-Goals:**
- 不做多用戶權限系統（維持單人使用設計）
- 不做 MCP server 開發框架（只做 client 端消費）
- 不做 cron 分散式排程（單一 process 執行）
- 不做 Premium Request GitHub REST API 查詢（僅依賴 SDK 事件回報）
- 不做完整 CI/CD pipeline 整合

## Decisions

### D1: 前端斷線恢復機制 — Query/Response 模式

**選擇：** 新增 `copilot:query_state` / `copilot:state_response` WebSocket 訊息對，前端在 WS 重連後主動查詢。

**替代方案：**
- (A) Server-push：後端偵測新連線自動推送所有狀態 → 棄選，因為無法確定哪些狀態前端需要，可能推送過多資料
- (B) LocalStorage 持久化：前端自行保存狀態 → 棄選，因為無法得知後端串流是否仍在執行

**理由：** Query/Response 模式讓前端精準請求所需狀態，後端只需回傳活躍串流清單與 pending user input，簡潔且可擴展。

### D2: AskUser 中斷恢復 — 後端持久化 pending request

**選擇：** 在 StreamManager 的 `PendingUserInput` 結構中增加 request metadata（question, choices, multiSelect, allowFreeform），並在 `copilot:state_response` 中回傳。

**替代方案：**
- (A) 前端 IndexedDB 持久化 → 棄選，因為只存一半（沒有 backend resolve callback），重整後無法真正恢復
- (B) 重新觸發 SDK 的 AskUser → 不可行，SDK 的 `onUserInputRequest` 是 one-shot callback

**理由：** 後端已擁有 pending Promise 和 timeout，只需額外存儲 request data 即可在重連時重發。

### D3: AskUser UI — Inline Chat Card

**選擇：** 從全螢幕 modal overlay 改為嵌入訊息流的 inline card（`InlineUserInput` 元件）。

**替代方案：**
- (A) 保持 modal 但加 multi-select → 簡單但手機體驗差，且與 Claude Code 風格不一致
- (B) Bottom sheet（從底部滑出）→ 尚可，但在寬螢幕上浪費空間

**理由：** Claude Code Desktop 和 VS Code 插件均使用 inline 方式，與對話流自然融合。保留 `UserInputDialog.tsx` 作為 fallback。

### D4: AskUser Timeout — 延長至 30 分鐘 + 無訂閱者暫停

**選擇：** `USER_INPUT_TIMEOUT_MS` 從 5 分鐘延長至 30 分鐘；當 `subscribers.size === 0` 時暫停計時。

**替代方案：**
- (A) 完全不 timeout → 風險，可能永久阻塞串流
- (B) 維持 5 分鐘 → 太短，使用者可能外出再回來

**理由：** 30 分鐘涵蓋大多數暫離場景；無訂閱者暫停計時避免使用者關閉瀏覽器後被錯誤 timeout。

### D5: MCP 實作 — 使用 @modelcontextprotocol/sdk

**選擇：** 使用官方 `@modelcontextprotocol/sdk` 套件作為 MCP client，而非自行實作 JSON-RPC。

**替代方案：**
- (A) 自行實作 JSON-RPC stdin/stdout 通訊 → 複雜且容易出錯
- (B) 僅支援 HTTP transport → 限制工具生態系（大多數 MCP server 使用 stdio）

**理由：** 官方 SDK 處理了 JSON-RPC 序列化、capability negotiation、transport 抽象等底層細節，降低維護成本。

### D6: MCP 設定格式 — `.mcp.json`

**選擇：** 使用 `.mcp.json` 設定檔（Claude Code 風格），支援 `${VAR}` 環境變數展開。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "/tmp"],
      "transport": "stdio"
    }
  }
}
```

**替代方案：**
- (A) 資料庫儲存 → 不直覺，難以版本控制
- (B) YAML 格式 → 需額外依賴，JSON 更通用

**理由：** `.mcp.json` 是 Claude Code 的標準格式，開發者熟悉且可版本控制。

### D7: MCP Tool 轉接 — Copilot SDK Tool Adapter

**選擇：** 將 MCP tools 包裝成 Copilot SDK 的 `Tool` 介面物件，在 `startStream` 時與 `selfControlTools` 合併傳入。

**替代方案：**
- (A) 在 system prompt 中描述 MCP tools → 不精確，模型可能幻覺
- (B) 在中間層攔截 tool call → 過度複雜

**理由：** Copilot SDK 的 Tool 介面已支援 `execute(args)` pattern，MCP tool 的 `call_tool(name, args)` 可直接映射。

### D8: Cron 排程引擎 — croner 套件

**選擇：** 使用 `croner` 輕量 cron 套件，搭配 SQLite 持久化任務定義。

**替代方案：**
- (A) node-cron → 較舊，API 不夠現代
- (B) bull/bullmq + Redis → 過度設計，單人工具不需要 Redis

**理由：** `croner` 輕量（零依賴）、支援 cron 表達式 + 間隔 + 一次性排程、TypeScript 友好。

### D9: SDK 自動更新 — npm update + process.exit

**選擇：** 透過 `child_process.exec('npm update @github/copilot-sdk')` 更新，完成後 `process.exit(0)` 讓 process manager（pm2/systemd）自動重啟。

**替代方案：**
- (A) 熱重載（動態 import）→ 極其複雜且不穩定，SDK 可能有全域狀態
- (B) 不提供更新功能 → 需要 SSH 手動操作

**理由：** Graceful restart 最可靠：先 abort 所有串流、persist 資料、關閉 HTTP server，再 exit。Process manager 負責重啟。

### D10: 思考動畫 — Claude Code CLI 風格

**選擇：** Unicode 字元脈動（`·✢✳✶✻✽`）+ 隨機狀態短語 + 已用時間計時器。

**替代方案：**
- (A) CSS spinner 動畫 → 目前做法，過於簡陋
- (B) Lottie 動畫 → 過重，需額外依賴

**理由：** 文字型動畫與 CLI 工具風格一致，輕量且獨特。

### D11: ToggleSwitch 共用元件

**選擇：** 抽取可複用 `ToggleSwitch` 元件，啟用狀態使用 `bg-emerald-500`（綠色）取代 `bg-accent`（紫色）。

**替代方案：**
- (A) 維持各處 inline toggle → 重複代碼、風格不一致
- (B) 使用 headlessui Switch → 增加依賴

**理由：** iOS 風格綠色 toggle 是使用者最熟悉的啟用/停用模式。統一元件確保一致性。

### D12: Premium Request 顯示策略 — 即時查詢，非持久化

**選擇：** Premium request 計數僅來自 SDK 事件的即時回報，不跨對話持久化。僅在偵測到 Copilot 訂閱（quota data 非空）時顯示。

**替代方案：**
- (A) 跨對話加總 → 會有重複計算問題（同一時段不同對話的 quota 是同一個值）
- (B) GitHub REST API 查詢 → 個人用戶 API 不支援精確 premium request 查詢

**理由：** SDK 的 `quotaSnapshots` 回報的是帳戶級別的全域數字，每次回報都是最新快照，無需加總或記憶。

## Risks / Trade-offs

| 風險 | 影響 | 緩解策略 |
|------|------|---------|
| MCP server 子程序 crash | Tool 呼叫失敗 | 自動重啟 + 健康檢查 + 使用者通知 |
| SDK 更新後 API 不相容 | 後端啟動失敗 | 更新前檢查 changelog；process manager 會用舊程式碼重啟 |
| Cron AI 任務堆積 | 記憶體/CPU 爆量 | 遵守現有 maxConcurrency 限制；任務排隊而非並行 |
| MCP stdio 管道 deadlock | Server 無回應 | 設定 per-request timeout（30 秒）；kill 並重啟 |
| 30 分鐘 AskUser timeout 過長 | 串流長時間阻塞 | 前端顯示倒數計時；使用者可手動 skip/abort |
| npm update 中途失敗 | 套件狀態不一致 | 使用 `npm ci` 回滾；更新前備份 node_modules |
| `.mcp.json` 設定錯誤 | MCP 啟動失敗 | Zod 驗證 + 詳細錯誤訊息；Settings UI 即時驗證 |
| 大量 spec 修改影響既有功能 | 回歸 bug | 嚴格 TDD，每個 feature 先寫測試 |

## Migration Plan

**部署順序：** Phase 1 → 5 依序實作與部署，每個 phase 都是可獨立部署的增量。

1. **Phase 1 部署**（後端韌性）：新增 WS 訊息類型，向下相容，舊前端忽略新訊息
2. **Phase 2 部署**（AskUser）：新元件 + 修改元件，舊對話不受影響
3. **Phase 3 部署**（UI/UX）：純前端變更，無資料庫遷移
4. **Phase 4 部署**（SDK 管理）：新增 REST endpoint + DB 欄位（`last_quota_snapshot`）
5. **Phase 5 部署**（新基礎設施）：新增 `cron_jobs` + `cron_history` 表 + MCP 模組

**Rollback：** 每個 phase 可獨立回滾。資料庫 schema 變更使用 migration script，支援 up/down。

## Open Questions

1. **MCP server 是否需要 sandbox？** — 目前以信任模式執行（單人使用），未來可考慮 Docker 隔離
2. **Cron AI 任務的 system prompt 來源？** — 暫定使用全域設定的 system prompt，未來可支援 per-job 自訂
3. **SDK 更新的 semver 策略？** — 是否只更新 patch/minor，major 需使用者確認？暫定全部更新
