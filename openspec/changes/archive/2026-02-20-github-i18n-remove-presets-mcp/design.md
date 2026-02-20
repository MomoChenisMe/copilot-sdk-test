## Context

本次變更涵蓋五項改進：GitHub 倉庫選擇、i18n 缺失修復、移除預設模板、MCP placeholder 改善。

現有架構中：
- `DirectoryPicker` 元件透過 `GET /api/directories` 瀏覽本地目錄
- i18n 系統使用 i18next，但多個 UI 元件存在翻譯 key 缺失（ShortcutsPanel、ConversationPopover、McpTab）
- 預設模板功能完整實作但使用者不需要，涉及前後端多個模組
- MCP 伺服器參數以逗號分隔輸入，placeholder 未翻譯

## Goals / Non-Goals

**Goals：**
- 在 DirectoryPicker 中新增 GitHub 頁籤，支援列出 repos 和自動 clone
- 補齊所有缺失的 i18n 翻譯 key
- 完整移除預設模板功能（含前後端和測試）
- 改善 MCP 參數 placeholder 的提示和翻譯

**Non-Goals：**
- 不實作 GitHub OAuth 認證流程（復用 `gh` CLI）
- 不支援 GitHub repo 的 CRUD 操作（僅讀取和 clone）
- 不遷移預設模板資料
- 不重新設計 MCP 參數輸入控件

## Decisions

### D1: GitHub API 透過 `gh` CLI 而非直接呼叫 GitHub REST API

**選擇**：使用 `child_process.execFile('gh', [...])` 執行 `gh` CLI 命令。

**理由**：
- `gh` CLI 已預裝於部署環境，且使用者已透過 `gh auth login` 認證
- `gh` CLI 自動處理 token 管理和 API rate limiting
- 不需要額外處理 OAuth scope（Device Flow 的 `copilot` scope 無法存取 repos API）

**替代方案**：直接呼叫 GitHub REST API（`api.github.com`）
- 取捨：需要在 Device Flow 中擴展 scope 至 `repo`，現有使用者需重新認證，增加複雜度

### D2: Clone 目標路徑採用固定結構 `~/Projects/<owner>/<repo>`

**選擇**：自動在 `~/Projects/` 下建立 `<owner>/<repo>` 子目錄結構。

**理由**：
- 一致的目錄結構便於管理多個 repos
- 避免使用者每次都要手動選擇 clone 位置（手機操作不便）
- 若路徑已存在則跳過 clone，直接使用

**替代方案**：讓使用者選擇 clone 目標路徑
- 取捨：更靈活但在手機 UX 上增加操作步驟

### D3: 移除預設模板採用一次性完整清除

**選擇**：同時移除前端 UI、Zustand state、API 路由、PromptComposer 邏輯。

**理由**：
- 避免留下死代碼
- `activePresets` 狀態如果保留但 UI 移除，會造成隱含的 bug
- 使用者明確表示不需要此功能

**替代方案**：僅隱藏 UI，保留後端 API
- 取捨：可在未來重新啟用，但增加維護負擔，違反 YAGNI 原則

### D4: i18n 修復新增 `common` 和 `shortcuts` 頂層命名空間

**選擇**：新增 `common.*` 命名空間存放通用翻譯（close、delete、cancel），`shortcuts.*` 存放快捷鍵翻譯。

**理由**：
- `common.*` 可被多個元件複用（ShortcutsPanel、ArtifactsPanel、ConversationPopover 都需要 close）
- `shortcuts.*` 與 `SHORTCUT_DEFINITIONS` 中的 action key 一一對應

**替代方案**：在各自元件的命名空間下新增（如 `sidebar.cancel`、`settings.close`）
- 取捨：可能導致重複翻譯 key，違反 DRY 原則

## Risks / Trade-offs

**[gh CLI 不可用]** → 後端 status endpoint 先檢查 `gh` 可用性，前端根據狀態隱藏 GitHub 頁籤並顯示提示訊息

**[Clone 大型 repo 超時]** → 使用 `--depth 1` shallow clone 減少下載量；設定 60 秒超時；前端顯示進度提示

**[移除預設模板的 Breaking Change]** → 個人工具無外部 API 消費者，影響範圍僅限自身；localStorage 中殘留的 `activePresets` 不影響功能

**[i18n key 新增後遺漏]** → 在 CI 中加入 i18n key 完整性檢查（未來改進，非本次範圍）
