## Context

CodeForge（原 AI Terminal）是一個跑在 Linux VPS 上的全功能 AI 開發環境，透過手機瀏覽器存取。目前已具備 Copilot SDK 整合、多分頁、plan mode、技能系統、記憶系統、MCP、排程任務等功能。本次變更包含 9 項功能需求，分為品牌重塑、bug 修復、UX 增強和核心功能擴展四類。

**Current Architecture:**
- Backend: Express 5 + WebSocket + SQLite + @github/copilot-sdk
- Frontend: React 19 + Zustand 5 + Tailwind CSS 4
- 訊息持久化：bash 輸出存為 user message with `metadata: { bash: true, exitCode, cwd }`
- Plan mode：透過 `PermissionHandler` 阻擋工具執行，stream-manager 追蹤 `stream.mode`

## Goals / Non-Goals

**Goals:**
- 完成品牌從 "AI Terminal" 到 "CodeForge" 的全面遷移
- 修復 bash 歷史在重啟後消失的 bug
- 提升模型選擇器的資訊密度（premium multiplier）
- 建立完整的 plan → execute 工作流
- 降低技能管理的門檻（上傳、URL 安裝、AI 建立）
- 提供系統上下文的可見性（/context 指令）

**Non-Goals:**
- 不做即時模型定價 API 查詢
- 不做技能市場或線上技能庫
- 不做 SDK changelog 的自動程式碼修改
- 不做 plan 檔案的版本控制或 diff/merge

## Decisions

### D1: Bash 歷史持久化 — 存兩筆訊息

**選擇：** 每次 bash 執行存兩筆 DB 訊息（user 指令 + assistant 輸出）

**替代方案：** 修改 MessageBlock 讓 user 訊息也能渲染 BashPrompt+BashOutput
- 取捨：需要在 user message 渲染路徑中嵌入複雜的終端環境資訊（user/hostname/gitBranch），但 user 訊息的 metadata 目前不存這些資訊。而且語義上「bash 輸出」確實是 assistant 的回應。

**理由：** 兩筆訊息的方式與即時串流時的行為一致（useBashMode hook 本地建立 user + assistant messages），且語義正確：使用者發出指令（user）→ 系統回傳結果（assistant）。

### D2: 模型倍率 — 靜態映射表

**選擇：** 後端維護硬編碼的 `MODEL_MULTIPLIERS` 映射表，模型 id/name → 倍率

**替代方案 A：** 從 GitHub Copilot API 動態取得倍率
- 取捨：SDK 的 `listModels()` 回傳型別為 `any[]`，可能已含倍率但不確定。即使有，API 格式可能變更。

**替代方案 B：** 前端硬編碼
- 取捨：更新倍率需重新部署前端，而後端只需重啟。

**理由：** 後端映射表維護成本低、更新方便（只需重啟）、且可作為 fallback 當 API 不提供時使用。先檢查 SDK 回傳是否含 `premiumMultiplier` 或類似欄位，有則優先使用。

### D3: Plan Mode 檔案寫入時機 — stream idle

**選擇：** 在 `copilot:idle` 事件（stream 完成）時寫入 markdown 檔案

**替代方案：** 即時串流寫入（每個 content delta 都 append 到檔案）
- 取捨：I/O 密集、可能產生不完整的 markdown、需要 file lock

**理由：** idle 時一次性寫入，保證內容完整，且複用現有的 `persistAccumulated` 流程。

### D4: Plan 執行流程 — 清除 session + 新 prompt

**選擇：** 清除 SDK session ID（`sdkSessionId = null`），以 plan 檔案內容作為新 prompt 開始串流

**替代方案 A：** 建立全新 conversation
- 取捨：使用者失去原始對話的上下文和歷史

**替代方案 B：** 在同一 session 中繼續但切換 mode
- 取捨：session 中累積的 plan mode 對話會佔用 context window

**理由：** 清除 session 但保留同一 conversation，既能獲得乾淨的 context window，又能在同一對話中看到 plan → execution 的完整歷程。

### D5: 技能安裝 — adm-zip + fetch

**選擇：** 使用 `adm-zip` 套件處理 ZIP 解壓，Node.js 內建 `fetch` 下載 URL

**替代方案：** 使用 Node.js 內建 `zlib` + `tar`
- 取捨：只支援 .tar.gz，不支援常見的 .zip 格式

**理由：** `adm-zip` 輕量（零依賴）、支援 .zip（最常見的壓縮格式）、API 簡潔。

### D6: /context 指令 — Backend API + 前端格式化

**選擇：** 後端 `GET /api/copilot/context` 收集所有上下文資訊，前端格式化為 markdown 系統訊息插入聊天

**替代方案：** 純前端實作，各自呼叫多個現有 API 組合
- 取捨：需要多次 API 呼叫，部分資訊（如 prompt composer 的 layers）前端無法取得

**理由：** 單一 API 端點更乾淨，且 PromptComposer 的內部狀態（哪些 layers 啟用、字元數）只有後端知道。

### D7: localStorage 遷移策略

**選擇：** 在 Zustand store 初始化時執行一次性遷移函式，將 `ai-terminal:*` key 複製到 `codeforge:*` 並刪除舊 key

**替代方案：** 同時支援兩種前綴（讀取時 fallback）
- 取捨：永久增加程式碼複雜度

**理由：** 一次性遷移乾淨俐落，遷移後舊 key 不再存在，程式碼無 fallback 邏輯。

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| 模型倍率映射表過時 | 新模型顯示無倍率 | 顯示 `null` 時不渲染 badge；SDK 回傳若含倍率則優先使用 |
| Plan 檔案寫入權限不足 | `.codeforge/plans/` 建立失敗 | `fs.mkdirSync` with `recursive: true`；失敗時 log warning 但不中斷流程 |
| Bash 持久化修改影響舊資料 | 舊格式的 bash 訊息渲染異常 | MessageBlock 加入向後相容：偵測舊格式（content 以 `$ ` 開頭的 user message）strip 前綴 |
| localStorage 遷移遺失 | 使用者 tab/model 偏好消失 | 遷移函式在 store 初始化最前端執行，早於任何 restore 呼叫 |
| ZIP 技能包含惡意內容 | 路徑穿越攻擊 | `adm-zip` 解壓前驗證所有路徑，拒絕含 `..` 或絕對路徑的項目；大小限制 10MB |
| SDK changelog API 不可用 | GitHub rate limit 或 repo 路徑變更 | Fallback 到 npm registry 版本描述；最終 fallback 顯示 "changelog 不可用" |
| Plan 檔案過大導致新 prompt 超過 context window | 執行失敗 | 限制 plan 檔案大小（warn > 50KB），執行時截斷或提示使用者精簡 |

## Migration Plan

1. **品牌遷移**：先更新後端（package.json、system prompt、composer），再更新前端（i18n、store、UI）。前端 localStorage 遷移函式確保舊使用者無感切換。
2. **DB schema**：`plan_file_path` 欄位以 `ALTER TABLE` 新增，預設 `NULL`，不影響現有資料。
3. **Bash 持久化**：新舊格式並存。新格式（兩筆訊息）與舊格式（一筆 user 訊息）都能正確渲染。
4. **Rollback**：所有變更可透過 git revert 回滾。localStorage 遷移是單向的，但舊前端仍可讀取舊 key（如果 rollback 前遷移已執行，需手動清理）。

## Open Questions

1. GitHub Copilot SDK `client.listModels()` 回傳的完整型別為何？是否已含 `premiumMultiplier` 或類似欄位？（需在實作時確認）
2. `@github/copilot-sdk` 的 GitHub Releases API 實際 repo 路徑為何？（`github/copilot-sdk` 或 `nicolo-ribaudo/github-copilot-sdk-js`？需確認）
3. Plan mode 每次 idle 都寫入新檔案，還是覆蓋同一檔案？（本設計選擇：每次 idle 寫入新檔案，以保留歷史）
