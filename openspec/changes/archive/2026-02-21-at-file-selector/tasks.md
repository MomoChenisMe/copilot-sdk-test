## 1. 後端 — 擴展目錄 API 支援檔案列表

- [x] 1.1 撰寫 `/api/directories?includeFiles=true` 測試（回傳 files 陣列、向下相容、二進位過濾、大檔過濾、showHidden 過濾、排序）
- [x] 1.2 實作 `backend/src/directory/routes.ts` 加入 `includeFiles` query param 及檔案列表回傳邏輯
- [x] 1.3 執行後端測試驗證 `npm test -w backend`

## 2. 前端 — 更新 API 型別與函式

- [x] 2.1 修改 `frontend/src/lib/api.ts`：新增 `FileEntry` interface、擴展 `DirectoryListResult` 加入 `files?: FileEntry[]`、更新 `directoryApi.list()` 接受 `includeFiles` 參數
- [x] 2.2 執行前端編譯驗證 `npm run build -w frontend`

## 3. 前端 — 建立 AtFileMenu 元件

- [x] 3.1 撰寫 `AtFileMenu` 元件測試（初始載入、目錄瀏覽進入/返回、cwd 邊界、檔案選取 callback、filter 過濾、空目錄狀態、鍵盤導航）
- [x] 3.2 實作 `frontend/src/components/shared/AtFileMenu.tsx`：目錄瀏覽、麵包屑、Folder/FileText 圖示、loading、keyboard navigation
- [x] 3.3 執行前端測試驗證 `npm test -w frontend`

## 4. 前端 — Input.tsx 加入 @ 偵測與 chip 渲染

- [x] 4.1 撰寫 Input 的 @ 觸發測試（@ 偵測觸發 AtFileMenu、@ 前非空白不觸發、Escape 關閉、選取後插入 @filename 文字、chip overlay 渲染、刪除 @filename 同步移除追蹤）
- [x] 4.2 實作 `Input.tsx` 修改：新增 props (`enableAtFiles`, `currentCwd`)、state (`showAtMenu`, `atFilter`, `atSelectedIndex`, `atStart`, `contextFiles`)、`findLastAtTrigger()`、`handleAtFileSelect()`
- [x] 4.3 實作 `Input.tsx` handleChange 擴展：在 slash command 偵測後加入 @ 偵測邏輯
- [x] 4.4 實作 `Input.tsx` handleKeyDown 擴展：加入 showAtMenu 的鍵盤處理
- [x] 4.5 實作 `Input.tsx` highlight overlay 擴展：統一處理 `/command` 和 `@filename` 的 chip 渲染
- [x] 4.6 實作 `Input.tsx` handleSend 修改：帶上 contextFiles 路徑陣列、清空 state
- [x] 4.7 實作 `Input.tsx` JSX 渲染 AtFileMenu
- [x] 4.8 執行前端測試驗證 `npm test -w frontend`

## 5. 前端 — 傳遞 contextFiles 貫穿發送鏈路

- [x] 5.1 修改 `ChatView.tsx`：更新 `ChatViewProps.onSend` 型別、兩處 `<Input>` 加入 `enableAtFiles` 和 `currentCwd` props、透傳 `contextFiles`
- [x] 5.2 修改 `AppShell.tsx`：`handleSend` 加入 `contextFiles?: string[]` 參數並傳遞給 `sendMessage`
- [x] 5.3 修改 `useTabCopilot.ts`：`sendMessage` 接受 `contextFiles`、放入 WS data payload、記錄到 user message metadata
- [x] 5.4 執行前端編譯驗證 `npm run build -w frontend`

## 6. 後端 — 處理 contextFiles 讀取檔案內容注入 prompt

- [x] 6.1 撰寫 copilot handler 的 contextFiles 處理測試（正常讀取、檔案過大跳過、檔案不存在跳過、多檔依序注入、metadata 儲存）
- [x] 6.2 實作 `backend/src/ws/handlers/copilot.ts`：從 payload 取出 contextFiles、讀取檔案內容、前綴到 finalPrompt、存入 metadata
- [x] 6.3 執行後端測試驗證 `npm test -w backend`

## 7. 前端 — 訊息歷史中的 @file 顯示

- [x] 7.1 撰寫 MessageBlock 的 contextFiles 顯示測試（有 contextFiles 顯示 chip、無 contextFiles 不顯示）
- [x] 7.2 實作 `MessageBlock.tsx`：渲染 `metadata.contextFiles` 為 chip 列表
- [x] 7.3 執行前端測試驗證 `npm test -w frontend`

## 8. 整合驗證

- [x] 8.1 執行全部測試 `npm test`（前端 + 後端）確認無 regression（at-file-selector 相關 57 個測試全部通過，13 個失敗為既有 prompts 模組問題，與本次變更無關）
- [x] 8.2 手動端對端測試：輸入 @ → 選單出現 → 瀏覽目錄 → 選擇檔案 → chip 出現 → 發送 → AI 回應包含檔案上下文
