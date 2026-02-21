## Why

目前 CodeForge 的聊天輸入框支援 `/` slash commands 和檔案附件上傳（迴紋針按鈕），但缺少在訊息中快速引用專案檔案作為 AI 上下文的能力。使用者需要手動上傳檔案或在訊息中貼上檔案路徑，AI 才能看到檔案內容——這對於頻繁需要參考程式碼的開發場景非常不便。

Claude Code CLI 的 `@` 檔案引用功能已證明這種互動模式的高效性：輸入 `@` 即彈出檔案選單，選取後檔案內容自動作為上下文注入。本功能將此體驗帶入 CodeForge Web UI。

**目標使用者**: CodeForge 單人使用者（開發者），在手機或桌面瀏覽器透過聊天介面與 AI 互動開發程式碼時，需要快速引用專案檔案。

**使用情境**: 使用者輸入「請修復 `@src/utils/parser.ts` 中的 bug」，AI 自動取得該檔案完整內容作為上下文，無需額外操作。

## What Changes

- **新增 `@` 觸發的檔案選擇選單**: 在聊天輸入框中輸入 `@` 時，彈出可瀏覽的檔案/目錄選單
- **新增 chip 樣式的檔案引用顯示**: 選取的檔案在輸入框中以 chip/tag 風格內嵌顯示於文字之間
- **新增 contextFiles 資料傳遞管道**: 從前端 Input → ChatView → AppShell → WebSocket → 後端，傳遞檔案路徑陣列
- **新增後端檔案內容讀取注入**: 後端收到 contextFiles 後讀取檔案內容，前綴到 AI prompt 作為上下文
- **擴展目錄瀏覽 API**: 現有 `/api/directories` 端點新增回傳檔案的能力
- **新增訊息歷史中的 @file 顯示**: 已發送訊息中顯示引用了哪些檔案

## Non-Goals

- **不做 @codebase / @terminal 等特殊引用**: 本次僅實作檔案引用，不包含 Cursor 風格的特殊上下文引用
- **不做檔案內容預覽**: 選單中只顯示檔案名稱和大小，不預覽內容
- **不做跨對話的檔案引用記憶**: 每次訊息獨立引用，不記錄常用檔案
- **不做檔案編輯功能**: 僅讀取作為上下文，不提供在 UI 中編輯檔案的能力
- **不做多人協作相關的權限控制**: 個人工具，不需檔案存取權限管理

## Capabilities

### New Capabilities

- `at-file-context`: 在聊天輸入框中透過 `@` 觸發的檔案選擇與上下文注入功能，包含前端選單元件、chip 渲染、資料傳遞管道、後端檔案讀取

### Modified Capabilities

- `directory-picker`: 擴展 `/api/directories` API 回傳檔案清單（新增 `includeFiles` 參數和 `files` 回應欄位）

## Impact

**後端:**
- `backend/src/directory/routes.ts` — 擴展回傳檔案
- `backend/src/ws/handlers/copilot.ts` — 處理 contextFiles、讀取檔案內容注入 prompt

**前端:**
- `frontend/src/lib/api.ts` — 新增 FileEntry 型別、更新 directoryApi
- `frontend/src/components/shared/AtFileMenu.tsx` — 新建元件
- `frontend/src/components/shared/Input.tsx` — @ 偵測、chip overlay、contextFiles state
- `frontend/src/components/copilot/ChatView.tsx` — props 傳遞
- `frontend/src/components/layout/AppShell.tsx` — contextFiles 傳遞
- `frontend/src/hooks/useTabCopilot.ts` — WebSocket payload 擴展
- `frontend/src/components/copilot/MessageBlock.tsx` — 顯示 @file chip

**API 變更:**
- `GET /api/directories` 新增 `includeFiles` query param（向下相容）
- WebSocket `copilot:send` payload 新增 `contextFiles` 欄位
