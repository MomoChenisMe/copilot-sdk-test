## Why

OpenSpec 面板存在多個影響使用體驗的 bug 和功能缺口。Task checkbox 勾選後無法取消（前端傳送錯誤參數）、差異規格 tab 只列出名稱不顯示內容、在未初始化 OpenSpec 的專案中沒有初始化按鈕、外部 CLI/編輯器修改 openspec 資料夾時面板無法即時反應。此外，系統提示詞缺少基礎 prompt injection 防護，且 LLM 回應語言無法獨立於 UI 語言進行設定。

目標使用者：單人開發者透過手機瀏覽器操控 AI Terminal，使用 OpenSpec 面板管理規格驅動開發流程。

## What Changes

### Bug 修復
- **修復 Task checkbox 雙向 toggle**：前端將 `line.raw`（完整 markdown 行）改為傳送 `line.text`（純任務文字），使後端 regex 能正確匹配
- **修復差異規格頁面**：從靜態名稱列表改為 accordion 展開式，點擊載入並渲染完整 spec.md 內容

### 新功能
- **OpenSpec Init 按鈕**：在「未找到 OpenSpec」狀態下，提供一鍵執行 `openspec init` 的按鈕，後端透過 `child_process` 呼叫 CLI，並檢測 CLI 是否已安裝
- **LLM 回應語言獨立設定**：在設定頁新增專屬下拉選單，支援預設語言選項 + 自訂輸入，獨立於 UI 語言控制 LLM 回應語言
- **Prompt injection 基礎防護**：在系統提示詞中加入安全邊界宣告、角色不可覆寫指令，並用 XML 分隔符包裹使用者可控內容
- **chokidar + WebSocket 即時檔案監聽**：後端用 chokidar 監聯 openspec/ 目錄，透過 WebSocket broadcast 通知前端自動刷新
- **OpenSpec 圖示狀態指示器**：TopBar 的 OpenSpec 按鈕在該 tab 的 CWD 下偵測到 openspec 內容時，圖示 MUST 顯示視覺變化（如小圓點 badge）提醒使用者

## Non-Goals（非目標）

- 不實作 OpenSpec CLI 的完整 GUI 封裝（僅支援 `init` 指令）
- 不實作進階 prompt injection 防護（如雙重 LLM 檢查、輸入清理）
- 不實作 CWD 動態切換時的 watcher 自動跟隨（初版僅監聽預設 openspec 路徑）
- 不把 `openspec` 加入 npm 依賴（維持全域安裝方式）
- 不實作差異規格的編輯功能（僅唯讀展示）

## Capabilities

### New Capabilities

- `openspec-init`: OpenSpec 專案初始化功能 — 後端 CLI 呼叫、可用性檢測、前端初始化按鈕 UI
- `openspec-file-watcher`: OpenSpec 檔案即時監聽 — 後端 chokidar watcher、WebSocket broadcast、前端自動刷新
- `llm-language-setting`: LLM 回應語言獨立設定 — 設定 UI 下拉選單、後端 settings 欄位、PromptComposer 語言注入

### Modified Capabilities

- `openspec-ui-panel`: 修復 task checkbox toggle bug（raw→text）、差異規格 accordion 展開顯示 spec 內容、整合 init 按鈕和 file watcher 訂閱、TopBar OpenSpec 按鈕狀態指示器
- `system-prompts`: 新增 Security Boundaries 段落防護 prompt injection、用 XML 分隔符包裹使用者可控內容區段
- `websocket-protocol`: WebSocket server 新增 broadcast 函數，支援 `openspec:changed` 事件推送
- `backend-settings-api`: AppSettings 新增 `llmLanguage` 欄位

## Impact

### 後端
- `backend/src/openspec/openspec-service.ts` — 新增 `getDeltaSpecFile()`、`isCliAvailable()`、`initOpenspec()` 方法
- `backend/src/openspec/openspec-routes.ts` — 新增 `GET /changes/:name/specs/:specName` 和 `POST /init` 路由
- `backend/src/openspec/openspec-watcher.ts` — **新增檔案**，chokidar file watcher 服務
- `backend/src/ws/server.ts` — `createWsServer` 回傳增加 `broadcast` 函數
- `backend/src/index.ts` — 初始化 watcher、解構 broadcast
- `backend/src/settings/settings-store.ts` — AppSettings 新增 `llmLanguage`
- `backend/src/prompts/defaults.ts` — 系統提示詞新增 Security Boundaries
- `backend/src/prompts/composer.ts` — XML 分隔符包裹、擴充 LOCALE_NAMES
- **新增依賴**：`chokidar`

### 前端
- `frontend/src/components/openspec/OpenSpecChangeDetail.tsx` — checkbox toggle 修復、DeltaSpecsView accordion 重構
- `frontend/src/components/openspec/OpenSpecPanel.tsx` — init 按鈕 UI、WebSocket 事件訂閱
- `frontend/src/lib/openspec-api.ts` — 新增 `getDeltaSpec()`、`initOpenspec()` API
- `frontend/src/components/settings/SettingsPanel.tsx` — LLM 語言下拉選單
- `frontend/src/store/index.ts` — 新增 `llmLanguage` state
- `frontend/src/hooks/useTabCopilot.ts` — locale 取值邏輯調整
- `frontend/src/locales/en.json` + `zh-TW.json` — 新增 i18n keys
