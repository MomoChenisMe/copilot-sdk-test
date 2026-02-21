## Context

目前 CodeForge 系統有以下現況：
- **設定儲存**：theme、language、model、disabledSkills、openTabs 全部存在前端 localStorage，後端無持久化 API
- **提示詞架構**：分散於 SYSTEM_PROMPT.md、PROFILE.md、AGENT.md、memory/preferences.md 四個檔案，PromptComposer 依序組合 7 段
- **記憶系統**：包含偏好設定、專案、解決方案、自動記憶四種類型，過於複雜
- **Cron 管理**：完整的 CRUD API 已存在，但只能透過 UI 操作，AI 無法在對話中管理
- **RWD**：多個下拉選單使用固定寬度/絕對定位，手機上溢出螢幕
- **主題**：code block CSS variables 在淺色主題中使用了深色值
- **穩定性**：toolRecords.map() 在特定路徑缺少 null safety check

## Goals / Non-Goals

**Goals:**
- 建立單一後端 Settings API，統一所有使用者偏好的持久化
- 簡化提示詞架構為 2 段（系統提示詞 + 個人檔案），降低使用者認知負擔
- 讓 AI 能透過對話管理 cron jobs
- 修復所有已知的 RWD 溢出和主題不一致問題
- 新增輸入歷史回溯提升操作效率

**Non-Goals:**
- 不實作 SSO 或多裝置即時同步
- 不重構 WebSocket 協議
- 不新增 cron job 的 UI 建立精靈（只做 AI tool）
- 不改變資料庫 schema（SQLite 不動）

## Decisions

### D1: Settings 儲存格式 — JSON 檔案 vs SQLite

**選擇**：JSON 檔案 (`{promptsPath}/settings.json`)

**理由**：
- 設定是單一物件，不需要查詢或索引，JSON 檔案足夠
- 與現有的 prompts 檔案儲存模式一致（PROFILE.md, SYSTEM_PROMPT.md 等皆為檔案）
- 讀寫簡單，不需額外依賴

**替代方案**：SQLite 表 — 提供更強的並發保護，但對單人使用過度工程化。若未來需要多使用者，可遷移。

### D2: Settings 同步策略 — 後端優先 + localStorage 快取

**選擇**：啟動時後端載入 → 運行時雙寫（localStorage + backend PATCH）

**理由**：
- 後端為 source of truth，確保跨裝置/重啟後設定不遺失
- localStorage 作為快取，避免每次操作都等待 API 回應
- PATCH（非 PUT）避免覆蓋其他欄位

**替代方案**：純後端（移除 localStorage）— 但離線/API 失敗時 UI 會失去所有設定。

### D3: 提示詞合併策略 — 啟動遷移 + 降級 shim

**選擇**：服務啟動時自動遷移 + 舊 API 降級為相容 shim

**理由**：
- 一次性遷移確保資料完整性
- 保留舊 endpoint 作為 shim 確保向後相容（已部署的前端仍可使用）
- `.bak` 備份檔提供安全回滾

**替代方案**：
1. 完全移除舊 endpoint — 但可能導致未更新的前端出錯
2. 保留雙寫（同時更新兩個檔案）— 增加維護複雜度，違反 single source of truth

### D4: AI Cron 工具 — 單一多 action 工具 vs 多個獨立工具

**選擇**：單一 `manage_cron_jobs` 工具，透過 `action` 參數分發

**理由**：
- 減少工具數量，降低 AI 的選擇負擔
- 一個 tool description 就能涵蓋所有 cron 操作
- 與現有 self-control tools 模式一致

**替代方案**：6 個獨立工具 (create_cron_job, list_cron_jobs, ...) — 每個工具的 schema 更簡潔，但 6 個工具佔用更多 system prompt token。

### D5: 輸入歷史 — 元件內 state vs 全域 store

**選擇**：從 conversation messages 提取歷史，透過 props 傳入 Input 元件

**理由**：
- 對話訊息已經持久化在後端，不需要額外儲存
- 歷史隨對話切換自動變更
- 保持 Input 元件的通用性（歷史可選注入）

**替代方案**：Zustand store 中維護獨立的 inputHistory array — 需要額外的同步邏輯，且與已有的 messages 資料重複。

### D6: Highlight.js 主題切換 — 雙 CSS import + 切換 vs 自訂 CSS variables

**選擇**：移除靜態 import `github-dark.css`，改用 CSS media/selector 切換 `github.css` 和 `github-dark.css`

**理由**：
- highlight.js 內建的主題 CSS 已經設計好配色，直接使用最安全
- 透過 `html[data-theme]` selector 區分，無需 JS 邏輯

**替代方案**：自訂 CSS variables 覆蓋 highlight.js — 維護成本高，每次升級 highlight.js 都要檢查。

## Risks / Trade-offs

**[R1] 遷移邏輯執行失敗** → 冪等設計：檢查 .bak 檔案是否已存在來判斷是否已遷移；失敗時 skip 不 crash

**[R2] Settings API 與 localStorage 不同步** → localStorage 為快取、後端為 source of truth；啟動時後端覆蓋 localStorage

**[R3] 移除 projects/solutions 可能遺失使用者資料** → 遷移前不刪除檔案，只移除 UI 和 API endpoints；檔案實體保留在磁碟上

**[R4] Cron tool 的 AI 誤操作（意外刪除排程）** → Tool result 清楚顯示操作結果；delete 操作需要明確的 job ID

**[R5] highlight.js CSS 切換可能造成 FOUC（Flash of Unstyled Content）** → 兩套 CSS 同時載入，透過 selector 切換，無 async loading

## Migration Plan

1. **Phase 0**（零風險）：修復 CSS variables + toolRecords null safety — 純修正，無資料變更
2. **Phase 1**（零風險）：RWD CSS 修正 — 純樣式變更
3. **Phase 2**（低風險）：提示詞遷移 — 啟動時自動合併檔案，保留 .bak
4. **Phase 3**（低風險）：Settings API — 新增 endpoint，舊行為不變
5. **Phase 4**（零風險）：Cron tool — 純新增功能
6. **Phase 5**（零風險）：輸入歷史 — 純前端功能

**回滾**：每個 Phase 獨立，可選擇性 revert。Phase 2 可透過 .bak 檔案還原。

## Open Questions

- 無（所有決策已確認）
