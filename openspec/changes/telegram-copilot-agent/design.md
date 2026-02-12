## Context

目前專案為空白 TypeScript 專案，需從零建立一個透過 Telegram 操控的 AI Agent。Agent 使用 GitHub Copilot SDK（`@github/copilot-sdk` v0.1.8，Technical Preview）作為 AI 引擎，部署在 Linux 上作為 systemd 服務。

技術限制：
- Copilot SDK 需要 Node.js v24+
- Copilot SDK 透過 JSON-RPC 與 Copilot CLI 通訊（SDK 自動管理 CLI 生命週期）
- Telegram Bot API 訊息長度上限 4096 字元
- Telegram 不支援真正的串流回應

## Goals / Non-Goals

**Goals:**
- 建立可運行的 Telegram Bot，能透過 Copilot SDK 與 AI 對話
- 支援多輪對話（Session 持久化於記憶體）
- Agent 擁有完整系統存取權（檔案讀寫、Git、終端指令）
- 白名單限制存取，僅供私人使用
- 可作為 Linux systemd 服務持續運行
- Bot 指令控制 Session 生命週期（重置、切換模型/工作目錄）

**Non-Goals:**
- 多用戶並發（私人使用，不需要）
- Session 跨重啟持久化（重啟後清空 session 可接受）
- Webhook 模式（Long Polling 足夠私人使用）
- 串流回應（Telegram 限制使其不實用）
- 資料庫整合（記憶體內 Map 即可）
- Web UI 或其他介面

## Decisions

### 1. Telegram 框架：grammY
**選擇**: grammY v1.35+
**替代方案**: Telegraf、node-telegram-bot-api
**理由**: grammY 是 TypeScript-first 設計，提供完整型別推斷，活躍維護中，API 設計更現代。Telegraf 也可行但型別支援稍弱。node-telegram-bot-api 已不再活躍維護。

### 2. 通訊模式：Long Polling
**選擇**: Long Polling（grammY 內建）
**替代方案**: Webhook
**理由**: 私人使用不需要公開 URL 和 SSL 憑證。Long Polling 設定簡單，無需反向代理。效能差異對單用戶場景無意義。

### 3. 回應模式：sendAndWait + 佔位訊息
**選擇**: `session.sendAndWait()` 搭配「思考中...」佔位訊息
**替代方案**: 串流模式 + 定期編輯訊息
**理由**: Telegram 編輯訊息有速率限制（~30 次/分鐘），串流效果不佳且增加複雜度。完整回應模式更穩定可靠。

### 4. Session 管理：記憶體內 Map
**選擇**: `Map<number, SessionEntry>`（chatId → CopilotSession）
**替代方案**: Redis、SQLite
**理由**: 單用戶場景不需要外部狀態儲存。CopilotSession 本身包含對話歷史。重啟後清空 session 對私人使用可接受。

### 5. 輸出格式：HTML parse mode
**選擇**: Telegram HTML 格式
**替代方案**: MarkdownV2
**理由**: HTML 只需跳脫 3 個字元（`<`, `>`, `&`），MarkdownV2 需跳脫 18 個特殊字元，AI 生成的 Markdown 很容易觸發跳脫錯誤。

### 6. 權限模型：全自動批准
**選擇**: `onPermissionRequest` 回傳 `{ kind: "approved" }`
**替代方案**: 每次操作需 Telegram 確認
**理由**: 私人使用，信任度高。每次確認會嚴重影響互動流暢度。

### 7. 專案架構：分層模組化
**選擇**: `bot/` + `copilot/` + `telegram/` + `utils/` 分層
**理由**: 關注點分離。Bot 層負責 Telegram 互動，Copilot 層負責 AI 整合，Telegram 層負責輸出格式化。便於獨立測試和替換。

### 8. TypeScript 執行：tsx
**選擇**: `tsx`（esbuild-based）直接執行 TypeScript
**替代方案**: 先 `tsc` 編譯再執行、ts-node
**理由**: tsx 啟動快、無需編譯步驟、開發體驗好。適合這個規模的專案。

## Risks / Trade-offs

- **[Copilot SDK 為 Technical Preview]** → SDK API 可能在後續版本有 breaking changes。mitigation：鎖定版本、封裝 SDK 呼叫於 `copilot/` 目錄，降低變更影響範圍。

- **[Node.js v24 需求]** → 這是非常新的版本，部分 Linux 發行版可能沒有官方套件。mitigation：使用 nvm 或 NodeSource 安裝。

- **[Session 重啟清空]** → Bot 重啟後所有對話上下文遺失。mitigation：私人使用可接受；未來可加入 SQLite 持久化。

- **[Telegram 訊息長度限制]** → AI 回應可能超過 4096 字元。mitigation：實作 HTML 感知分段發送。

- **[全自動批准風險]** → Agent 可能執行破壞性操作。mitigation：白名單限制存取，僅信任用戶可觸發；使用專用系統帳號限制檔案權限。

- **[用戶輸入處理器阻塞]** → 當 AI 需要用戶確認時，Session 會阻塞等待回覆。mitigation：設定 2 分鐘逾時；pending question 攔截機制避免訊息錯誤路由。
