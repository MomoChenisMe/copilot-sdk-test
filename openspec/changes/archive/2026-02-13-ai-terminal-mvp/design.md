## Context

綠地專案——目前無任何程式碼。目標是建立一個跑在 Linux VPS 上的 Web 應用，讓開發者透過手機瀏覽器即可操作 AI 編程助手（Copilot Agent）和真實終端（Terminal）。

核心限制：
- 單人使用的個人工具，不需多租戶或複雜權限
- GitHub Copilot 訂閱制認證，不走 API 計費
- @github/copilot-sdk 仍在 Technical Preview，API 可能變動
- 手機瀏覽器為主要存取方式，UI 必須 mobile-first

## Goals / Non-Goals

**Goals:**
- 透過手機瀏覽器完成 AI 輔助開發（對話、工具呼叫、串流回應）
- 提供等同 SSH 的真實終端存取（支援 vim、htop 等互動程式）
- 對話歷史持久化，支援多對話切換和搜尋
- 簡單可靠的部署流程（systemd + Nginx）

**Non-Goals:**
- 多人使用、帳號系統、RBAC 權限管理
- 自訂提示詞系統（PROFILE.md、AGENT.md）
- 情境模式（Presets）、跨對話記憶
- 原生 App 或 PWA 離線功能

## Decisions

### Decision 1：Monorepo 結構（npm workspaces）

採用 npm workspaces 將 `backend/` 和 `frontend/` 放在同一 repo。

- **替代方案：** 單一 package，前後端混合
  - 取捨：更簡單但程式碼耦合，建置設定混亂，前端 Vite 和後端 tsx 會互相干擾
- **選擇原因：** workspaces 提供清晰的關注點分離，各自獨立的 dependencies 和 build 流程，同時共享 TypeScript 設定和版本控制

### Decision 2：WebSocket 為主要即時通訊，REST 輔助管理

Copilot 串流和 Terminal 雙向資料走 WebSocket；對話 CRUD、認證走 REST API。

- **替代方案：** 全部走 REST + SSE (Server-Sent Events)
  - 取捨：SSE 只支援 server→client 單向，Terminal 的雙向互動無法用 SSE 實現，需要額外的 POST 端點處理輸入
- **選擇原因：** WebSocket 天然支援雙向即時通訊，Terminal 資料傳輸和 AI 串流都適用。REST 保留給非即時的 CRUD 操作

### Decision 3：WS 訊息路由——type 前綴分派

所有 WebSocket 訊息使用 `{ type: "copilot:send", data: {...} }` 格式，由 router 按 `copilot:` / `terminal:` 前綴分派到對應 handler。

- **替代方案：** 分開兩個 WebSocket 端點（`/ws/copilot` 和 `/ws/terminal`）
  - 取捨：兩個連線佔用更多資源，需要分別管理 auth 和 reconnect 邏輯
- **選擇原因：** 單一連線更省資源，路由邏輯集中，auth 只需驗證一次

### Decision 4：better-sqlite3 同步 API

使用 `better-sqlite3`（同步 API）而非 `sqlite3`（callback API）。

- **替代方案：** `sqlite3` 或 `drizzle-orm` + `better-sqlite3`
  - 取捨：`sqlite3` 的 callback 風格增加程式碼複雜度；ORM 在單表 CRUD 場景過度抽象
- **選擇原因：** 單人使用不需要 async I/O 的並發效能，同步 API 程式碼更直觀。直接寫 SQL 對簡單 schema 最高效

### Decision 5：Zustand 狀態管理

使用 Zustand 而非 Redux 或 React Context。

- **替代方案 A：** Redux Toolkit
  - 取捨：對單人工具而言太重，boilerplate 多，Provider 嵌套複雜
- **替代方案 B：** React Context + useReducer
  - 取捨：Context 變更會觸發整棵子樹重新渲染，串流更新頻率高時效能問題明顯
- **選擇原因：** Zustand 無 Provider、selector 粒度更新、API 極簡，特別適合高頻串流狀態更新

### Decision 6：Web 認證——密碼 + session cookie

簡單密碼登入，bcrypt 比對後發 HttpOnly session cookie。

- **替代方案 A：** Bearer Token（固定 token 在環境變數）
  - 取捨：最簡單但無登入/登出流程，token 外洩後無法 revoke
- **替代方案 B：** GitHub OAuth 共用認證
  - 取捨：增加複雜度，需要 OAuth App 註冊，對單人工具過度
- **選擇原因：** 密碼登入提供基本的登入/登出 UX，HttpOnly cookie 防 XSS 竊取，server 重啟 = 強制重新登入（可接受）

### Decision 7：Copilot SDK 認證——gh auth login 預認證

VPS 上預先執行 `gh auth login --scopes copilot`，SDK 透過 `useLoggedInUser: true` 自動讀取。

- **替代方案：** 環境變數 `GITHUB_TOKEN`
  - 取捨：token 會過期需手動更新，且需要有 copilot scope 的 PAT
- **選擇原因：** gh CLI 自動管理 token 刷新，最省心。Device Flow 作為備用方案，當 CLI 認證失效時 SDK 會自動觸發

### Decision 8：前端 Terminal——@xterm/xterm v6

使用 xterm.js 的 v6（`@xterm/xterm` scoped packages）。

- **替代方案：** 自建 terminal renderer
  - 取捨：工作量巨大，需要自行處理 ANSI escape codes、游標控制、顏色等
- **選擇原因：** xterm.js 是業界標準的 web terminal 方案，VSCode 也使用，對 ANSI、Unicode、互動式程式的支援最完整

### Decision 9：Express 5

使用 Express 5 而非 Fastify 或 Koa。

- **替代方案：** Fastify
  - 取捨：效能更好但生態系較小，Plugin 系統學習曲線較高
- **選擇原因：** Express 5 已穩定發布，原生支援 async error handling，生態最大，WebSocket upgrade 整合最成熟

## Risks / Trade-offs

### Risk 1：Copilot SDK Technical Preview 不穩定
SDK 仍在預覽階段，API 可能隨版本變動。
→ **緩解：** 在 `copilot/` 模組中封裝所有 SDK 呼叫，其他模組不直接依賴 SDK types。pin SDK 版本，更新時只需改動封裝層。

### Risk 2：node-pty 原生模組編譯
node-pty 需要原生編譯（node-gyp），在某些環境可能失敗。
→ **緩解：** 在部署腳本中加入 build-essential 等編譯工具的安裝步驟。提供 Docker 備用方案。

### Risk 3：WebSocket 斷線與狀態同步
手機網路不穩定，WebSocket 可能頻繁斷線重連。
→ **緩解：** 前端實作指數退避重連（1s→2s→4s→8s，max 30s）。Terminal 的 PTY 持續在 server 端運行，重連後自動恢復。Copilot 對話狀態透過 SDK session 和 SQLite 雙重保障。

### Risk 4：手機鍵盤輸入體驗
手機虛擬鍵盤對 Terminal 操作（特殊按鍵、Ctrl 組合鍵）不友好。
→ **緩解：** MVP 先不處理，未來可加入虛擬功能鍵列（Ctrl、Tab、Esc 等）。Copilot Agent 是主要操作方式，Terminal 是輔助。

### Risk 5：Session cookie 安全性
伺服器重啟清空 in-memory session store，使用者需重新登入。
→ **緩解：** 對個人工具可接受。cookie 設定 HttpOnly + Secure + SameSite=Strict 防止常見攻擊。

### Risk 6：SQLite 並發寫入
better-sqlite3 同步 API 在高頻寫入時可能阻塞 event loop。
→ **緩解：** 單人使用場景寫入頻率極低。串流過程中僅在訊息完成後批次寫入，不逐 delta 寫入。
