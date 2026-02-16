## Context

AI Terminal 聊天介面目前具備基本的 Copilot 對話、多分頁、file attachment 上傳、slash commands 等功能。但存在多個 UX 缺口：圖片附件無法在對話中回顧、slash commands 僅限內建+skills、側邊欄在手機上佔用空間、對話命名需手動、缺少快速 shell 命令執行。

本設計涵蓋 9 項改進，分為 4 個批次實作，以降低風險並實現增量交付。

**現有架構約束**：
- 前端使用 Zustand 5 per-tab state 隔離
- 後端 WebSocket 採用 type-based routing（`copilot:send`, `terminal:input` 等）
- 圖片上傳已有 multer + Express 端點，但缺少 serve 端點
- Copilot SDK 使用 `session.send()` 傳送訊息，files 以 `{ path, mimeType }` 格式傳入

## Goals / Non-Goals

**Goals:**
- 完成圖片在聊天中的完整生命週期（上傳 → 顯示 → 歷史重載 → SDK 理解）
- 精簡導航，移除側邊欄以節省手機畫面空間
- 動態發現 SDK slash commands，減少硬編碼
- 提供輕量 Bash 執行模式，無需切換至 Terminal 分頁
- 自動化對話命名流程

**Non-Goals:**
- 不在聊天中嵌入完整 xterm.js 終端（Bash 模式僅提供文字串流）
- 不實作圖片編輯、裁切或壓縮
- 不使用 AI 生成對話標題

## Decisions

### D1: 圖片附件 metadata 儲存於 Message.metadata

**決策**：在 user message 的 `metadata` 欄位中新增 `attachments: AttachmentMeta[]`，`AttachmentMeta = { id, originalName, mimeType, size }`。

**理由**：不修改 messages table schema（無需 migration），利用現有 JSON metadata 欄位。前端和後端都已支援 metadata 讀寫。

**替代方案**：新增 `attachments` column → 需要 schema migration，增加複雜度。在此階段的資料量和查詢需求下，JSON metadata 足夠。

### D2: 圖片 serve 端點使用既有 upload 路徑

**決策**：在 `upload/routes.ts` 新增 `GET /api/upload/:id`，以 ID 前綴搜尋上傳目錄找到對應檔案，設定正確 Content-Type 後 serve。

**理由**：上傳檔案已用 UUID 命名儲存於磁碟，直接 serve 最簡單。

**替代方案**：base64 inline 在 metadata 中 → 膨脹資料庫體積，大圖影響載入效能。CDN/Object Storage → 過度工程，個人工具不需要。

### D3: 移除 Sidebar，ConversationPopover 為唯一入口

**決策**：完全移除 `Sidebar.tsx`，TabBar 的 ConversationPopover 成為唯一對話切換 UI。語言切換和登出搬到 SettingsPanel 的新 General tab。

**理由**：ConversationPopover 已具備搜尋、分組（pinned/recent）、鍵盤導航。側邊欄與其功能高度重疊，且在手機上佔用過多空間。

**替代方案**：保留側邊欄但改用其他觸發方式 → 仍然佔用程式碼和畫面空間，ConversationPopover 已能滿足所有需求。

### D4: SDK Commands 透過後端 API 代理

**決策**：新增 `GET /api/copilot/commands` 端點，後端從 SDK session 或 SDK API 取得可用 slash commands 清單。前端啟動時與 skills 一同載入，快取於 Zustand store。

**理由**：前端不直接存取 SDK，所有 SDK 互動都經過後端 WebSocket。REST API 適合一次性資料載入（非串流）。

**替代方案**：硬編碼 SDK commands 列表 → 無法隨 SDK 更新自動反映新命令。WebSocket 載入 → 過度使用 WS，REST 更適合 request-response 模式。

**Fallback**：若 SDK 不提供命令列舉 API，則使用靜態配置檔案（`copilot-commands.json`）作為 fallback。

### D5: Bash 執行模式使用 child_process.spawn（非 PTY）

**決策**：新建 `bash-exec.ts` WS handler，使用 `child_process.spawn('bash', ['-c', command], { cwd })` 執行命令。不使用既有的 PtyManager / node-pty。

**理由**：Bash 模式只需執行單一命令並取得文字輸出，不需要 PTY 的互動能力（ANSI escape codes、cursor positioning、vi/htop 等）。`spawn` 更輕量、輸出更乾淨、exit code 明確。

**替代方案**：復用 PtyManager → PTY 輸出包含 ANSI escape codes 和 shell prompt，需要解析；無法精確判斷命令完成時機；共用 PTY session 有狀態衝突風險。

**協定設計**：
- `bash:exec { command, cwd }` → 開始執行
- `bash:output { output, stream: 'stdout'|'stderr' }` → 串流輸出
- `bash:done { exitCode }` → 執行完成
- `bash:error { message }` → 異常錯誤

### D6: 對話自動命名在前端 sendMessage 中觸發

**決策**：在 `useTabCopilot.sendMessage()` 中，發送前檢查 `tab.messages.length === 0`，若為第一條訊息，截取 prompt 前 50 字元並同步更新前端 tab title 和後端 API。

**理由**：前端是唯一知道「這是否為第一條訊息」的地方（後端不追蹤 tab 狀態）。在 sendMessage 中處理可確保在訊息送出的同時完成命名。

**替代方案**：後端收到第一條訊息時自動命名 → 需要在 copilot handler 中新增邏輯，且 tab title 更新需要額外 WS event。前端 useEffect 監聽 messages 變化 → 時序不確定，可能造成閃爍。

### D7: 命令 badge 渲染使用 regex 解析

**決策**：在 `MessageBlock.tsx` 中用 `content.match(/^\/(\S+)/)` 解析 user message 的 `/command` 前綴，渲染為 accent 色 `<span>` badge。

**理由**：簡單、可預測。不需要額外 metadata 來標記「這是一個命令」——所有以 `/` 開頭的 user message 都視為命令。

**替代方案**：在 metadata 中標記 `isCommand: true` → 需要修改 sendMessage 邏輯，增加前後端複雜度。Rich text editor → 過度工程。

## Risks / Trade-offs

### [R1] SDK 不支援 file attachment 格式
**風險**：`@github/copilot-sdk` 的 `session.send()` 可能不接受 `files` 參數，或格式與目前的 `{ path, mimeType }` 不匹配。
**緩解**：F1 的第一步是驗證 SDK API 文件。若不支援，改用 SDK 的 content blocks API（image type with base64）作為 fallback。

### [R2] Bash 執行的安全性
**風險**：任意 shell 命令執行可能導致系統風險（雖然是個人工具）。
**緩解**：30 秒 timeout、output buffer 上限 1MB、已有密碼認證保護。不額外增加 command whitelist（個人工具，可信使用者）。

### [R3] SDK commands API 不存在
**風險**：Copilot SDK (Technical Preview) 可能沒有 commands 列舉 API。
**緩解**：D4 已設計 fallback 機制（靜態 JSON 配置）。優先嘗試動態載入，失敗時無縫切換至靜態清單。

### [R4] 移除側邊欄可能影響操作流暢度
**風險**：使用者可能習慣側邊欄的對話列表瀏覽方式。
**緩解**：ConversationPopover 已具備搜尋和分組功能，等效替代。且作為個人工具，使用者即為開發者本人，可即時反饋調整。

### [R5] MessageBlock.tsx 成為合流點
**風險**：F2（圖片）、F6（命令顏色）、F8（可收合技能）三項功能都修改 MessageBlock 的 user bubble 區塊，可能產生 merge conflict。
**緩解**：三項功能在同一批次中按順序實作（F2 → F6 → F8），每步完成後確認無 regression。
