## Why

目前 Web Search 功能僅由 Brave API Key 的存在與否來啟用，啟用後完全由 LLM 自行判斷是否搜尋。使用者希望能如 Claude Desktop 一樣，在聊天工具列中提供一個明確的「強制搜尋」開關，讓每則訊息都先經過網路搜尋驗證再回覆。

同時存在兩個 bug：
- 手機版 TopBar 標題文字過長時溢出並覆蓋右側功能按鈕（設定、主題切換等）
- 設定頁「一般」分頁無法顯示 SDK 版本資訊（後端路徑解析錯誤導致 API 回傳 null，前端條件渲染使整區塊消失）

目標使用者：透過手機瀏覽器操作的單一開發者。使用情境：在需要最新資訊的對話中開啟強制搜尋、日常手機端操作時遇到標題溢出、以及在設定頁查看 SDK 版本與更新狀態。

## What Changes

- **新增 Web Search 強制搜尋切換按鈕**：在桌面版底部工具列與手機版 MobileToolbarPopup 中加入 toggle，開啟時在 prompt 中注入強制搜尋指令
- **修復 TopBar 手機版文字溢出**：為標題區域加入 `overflow-hidden` + `block` truncate，為右側按鈕區加入 `shrink-0`
- **修復 SDK 版本偵測路徑**：使用 `createRequire` 正確解析 npm hoisted 套件路徑，並讓 SDK 區塊在版本未知時仍然顯示

## Non-Goals

- 不新增 per-conversation 持久化 web search 偏好（僅 runtime tab state）
- 不修改 Brave Search Tool 本身的實作邏輯
- 不新增其他搜尋引擎支援
- 不重新設計 TopBar 整體 layout（僅修復溢出問題）
- 不新增 SDK 自動更新功能（僅修復版本顯示）

## Capabilities

### New Capabilities
- `web-search-toggle`: 聊天工具列中的 Web Search 強制搜尋開關，含前端 toggle 元件、store 狀態管理、WebSocket 訊息傳遞、後端 prompt 注入

### Modified Capabilities
- `app-layout`: TopBar 標題文字溢出修復（手機版 responsive）
- `sdk-upgrade-advisor`: 修復 SDK 版本偵測路徑解析、前端條件渲染改為始終顯示
- `web-search`: 新增 `webSearchForced` flag 傳遞至後端，後端在 prompt 前方注入強制搜尋指令

## Impact

**前端修改：**
- `frontend/src/store/index.ts` — TabState 新增 `webSearchForced`，AppState 新增 `webSearchAvailable`
- `frontend/src/components/copilot/WebSearchToggle.tsx` — 新元件
- `frontend/src/components/copilot/ChatView.tsx` — 桌面版工具列整合
- `frontend/src/components/copilot/MobileToolbarPopup.tsx` — 手機版工具列整合
- `frontend/src/components/layout/AppShell.tsx` — 啟動偵測 Brave API Key
- `frontend/src/components/layout/TopBar.tsx` — 溢出修復
- `frontend/src/components/settings/SettingsPanel.tsx` — SDK 區塊條件渲染修復
- `frontend/src/hooks/useTabCopilot.ts` — WebSocket 訊息新增 flag
- `frontend/src/locales/{en,zh-TW}.json` — i18n 新增鍵值

**後端修改：**
- `backend/src/ws/handlers/copilot.ts` — 接收 `webSearchForced` 並注入 prompt
- `backend/src/copilot/sdk-update.ts` — 修正 `getInstalledVersion()` 路徑解析
