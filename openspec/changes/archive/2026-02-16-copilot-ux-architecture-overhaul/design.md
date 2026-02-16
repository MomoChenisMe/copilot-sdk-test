## Context

AI Terminal 是運行在 Linux VPS 上的 Web 應用，透過手機瀏覽器操控 AI 開發工具。目前有 7 項 UX 和架構改進需求，涵蓋 slash command、Tab 重構、附檔功能、SDK 自控設定、工作目錄選擇器等。

**現有架構：**
- 前端：React 19 + Zustand 5 + Tailwind CSS 4 + WebSocket
- 後端：Express 5 + WebSocket + @github/copilot-sdk + SQLite
- Tab 系統：目前 TabState.id === conversationId，1:1 綁定
- Prompt 系統：PromptComposer 在每次 `startStream` 時從 disk 讀取 PROFILE.md、AGENT.md 等檔案組合 system prompt
- Skills 系統：builtin + user skills 透過 `skillDirectories` 傳給 SDK session

## Goals / Non-Goals

**Goals:**
- 提供 slash command 快速呼叫技能和內建命令
- Tab 模型解耦，允許在 Tab 內自由切換對話
- SDK 可透過工具自我修改設定，下一輪即時生效
- 支援聊天中附帶圖片和文件
- 類似 Warp 的工作目錄選擇器
- 統一重複的 UI 元素（Tab "+" 按鈕）

**Non-Goals:**
- 不重新設計整體視覺風格
- 不實作即時檔案系統瀏覽器
- SDK 不可修改 SYSTEM_PROMPT.md
- 不支援影片或音訊附檔

## Decisions

### D1: Slash Command 使用「文字插入」模式

**選擇**：技能 slash command 選取後插入 `/skill-name ` 到 textarea，使用者續打訊息作為完整 prompt 送出。

**替代方案**：
- A) 在 WS 訊息中新增 `activeSkill` 欄位，後端特殊處理 → 需修改 WS 協定和 stream-manager，侵入性大
- B) 自動將技能內容注入 system prompt → 會使 prompt 膨脹，且每次都需完整載入技能內容

**理由**：文字插入模式零後端改動，SDK 已能處理 prompt 中的 skill 名稱引用。簡單且可預測。

### D2: Tab ID 與 Conversation ID 解耦

**選擇**：TabState.id 改為獨立 UUID，TabState.conversationId 為可變欄位。事件路由從 `tabs[conversationId]` 直接查找改為掃描 `Object.values(tabs)` 匹配。

**替代方案**：
- A) 保持 1:1 綁定，對話切換改為關閉舊 tab 開新 tab → 丟失 tab 位置和狀態，UX 不佳
- B) 使用 Map<conversationId, tabId> 反向索引 → 增加複雜度，且 tab 數量小（≤15），O(n) 掃描足夠

**理由**：解耦是最乾淨的設計，允許未來一個 tab 呈現多個對話（如 split view）。掃描成本在 ≤15 tabs 時可忽略。

### D3: SDK 自控採用 Tool-based + Per-Turn Prompt Reassembly

**選擇**：註冊 `update_profile`、`update_agent_rules`、`create_skill` 等工具到 SDK session。工具 handler 直接寫入 disk 檔案。PromptComposer 已在每次 `startStream` 時從 disk 重新讀取，天然支援 per-turn reassembly。

**替代方案**：
- A) File watcher + 事件通知 → 增加複雜度，且單使用者場景不需要 watcher
- B) 透過 REST API 修改再由前端 WS 通知 → 多一層間接，且 SDK 在 turn 中無法呼叫 REST API

**理由**：Tool-based 是最自然的方式，利用 SDK 已有的 tool execution 機制。直接寫 disk + PromptComposer 已有的 per-turn 重讀行為 = 零額外架構，最小改動量。

### D4: 附檔透過 REST Upload + WS 訊息引用

**選擇**：前端先 `POST /api/upload` 上傳檔案取得 file references，再在 WS `copilot:send` 中帶上 `files` 欄位。

**替代方案**：
- A) 透過 WS 直接傳輸二進位資料 → WS 協定不適合大檔案傳輸
- B) Base64 編碼在 WS 訊息中 → 效率低，佔用 WS buffer

**理由**：REST multipart upload 是成熟的檔案上傳模式，multer 已是 Express 生態標準。分離上傳和訊息傳送允許獨立處理失敗。

### D5: CwdSelector 更新同時清除 sdkSessionId

**選擇**：更新 `cwd` 時同時清除 conversation 的 `sdkSessionId`，下次發送訊息時會建立新 SDK session 使用新 cwd。

**替代方案**：
- A) 嘗試更新現有 session 的 cwd → SDK resumeSession 不一定支援動態更新 workingDirectory
- B) 不清除 session，靠 SDK 自行偵測 → 不可靠

**理由**：清除 sdkSessionId 是最安全的方式，確保新 cwd 一定被 SDK 使用。代價是丟失 session 上下文，但切換目錄本身就意味著新的工作環境。

### D6: 新增 multer 依賴處理檔案上傳

**選擇**：使用 `multer` npm 套件處理 multipart form-data 上傳。

**替代方案**：
- A) 手動解析 multipart boundary → 複雜且易出錯
- B) 使用 busboy → 更底層，需自行管理 stream

**理由**：multer 是 Express 生態中最成熟的 multipart 中介軟體，API 簡潔，與 Express 5 相容。

### D7: Conversation Popover 取代 Sidebar 對話恢復

**選擇**：Tab 標題點擊開啟 Conversation Popover，Sidebar 簡化為管理器（rename/delete/pin/search）。

**替代方案**：
- A) 完全移除 Sidebar → 失去對話管理功能，改造成本高
- B) Sidebar 保持原樣，Popover 作為額外入口 → 兩處做同一件事，令人困惑

**理由**：Popover 是最直覺的 tab 內對話切換方式（類似瀏覽器的 tab 右鍵選單）。Sidebar 保留管理功能但不再是主要的對話導航方式。

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|----------|
| Tab 解耦重構影響面大，可能破壞現有 streaming 和 dedup 邏輯 | 優先實作，完整的 unit/integration test coverage。漸進式遷移：先改 store → 再改 event routing → 最後加 popover |
| SDK Tool API 格式可能因 copilot-sdk 更新而變動（Technical Preview） | 封裝 tool 定義在獨立模組 `self-control-tools.ts`，隔離變動影響 |
| 附檔上傳可能產生大量暫存檔案佔用 disk | 設定 10MB 上限 + 定期清理機制（cron job 或啟動時清理） |
| 同一對話在多 Tab 開啟可能導致 streaming 事件路由混亂 | 前端攔截：若對話已在其他 Tab 開啟，提示使用者並跳轉 |
| CwdSelector 清除 sdkSessionId 會丟失 session 上下文 | 使用者確認提示：切換目錄會重置 AI 記憶，是否繼續？ |
| Slash command 選單在手機觸控操作上可能不如桌面鍵盤流暢 | 確保觸控可點選、適當的 touch target size（最小 44px）、自動捲動到選中項目 |

## Migration Plan

**實作順序**（由簡到繁，降低風險）：

1. **Phase 1 — 統一 Tab "+"**（≤30min）：移除 TopBar "+" 按鈕，2 檔案改動
2. **Phase 2a — CwdSelector**（~2hr）：新元件 + backend cwd 更新支援
3. **Phase 2b — Slash Commands**（~3hr）：SlashCommandMenu + useSkills + Input 改造
4. **Phase 2c — 附檔功能**（~4hr）：multer upload + AttachmentPreview + paste/drop
5. **Phase 3a — Tab 重構**（~6hr）：Store 解耦 + Event routing + ConversationPopover + Sidebar 簡化
6. **Phase 3b — SDK 自控**（~3hr）：self-control-tools + session-manager + stream-manager 串接

**Rollback**：每個 Phase 獨立 commit，可個別 revert。Phase 3a 最複雜，建議在 feature branch 上開發。

## Open Questions

1. **Copilot SDK Tool 註冊格式**：`@github/copilot-sdk` Technical Preview 的 `SessionConfig.tools` 確切的 type signature 需確認。若不支援 custom tools，需改用替代方案（例如在 system prompt 中描述虛擬工具 + 解析 SDK 回應中的工具呼叫）。
2. **SDK 附檔支援**：Copilot SDK 是否原生支援附檔（圖片/文件）？若不支援，需在 prompt 中 inline 檔案內容（images as base64, docs as text）。
3. **Tab 持久化格式向後相容**：localStorage 中 `ai-terminal:openTabs` 的格式變更是否需要 migration 邏輯，或可直接清除重建？
