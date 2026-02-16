## 1. 統一 Tab "+" 按鈕（Feature 3）

- [x] 1.1 撰寫 TopBar 測試：驗證 TopBar 不再渲染 Plus 按鈕和 `onNewChat` callback
- [x] 1.2 修改 `TopBar.tsx`：移除 `onNewChat` prop、Plus icon import 和對應 button
- [x] 1.3 修改 `AppShell.tsx`：移除傳給 TopBar 的 `onNewChat={handleNewTab}` prop
- [x] 1.4 更新現有 TopBar 測試，移除 Plus 按鈕相關斷言
- [x] 1.5 驗證：執行 `cd frontend && npx vitest run` 確保所有測試通過

## 2. 工作目錄選擇器 — CwdSelector（Feature 7）

- [x] 2.1 撰寫 CwdSelector 元件測試：顯示路徑、截斷、點擊進入編輯、Enter 確認、Escape 取消
- [x] 2.2 實作 `CwdSelector.tsx`：pill 顯示模式、text input 編輯模式、FolderOpen icon
- [x] 2.3 撰寫後端測試：`PATCH /api/conversations/:id` 支援 `cwd` 欄位更新
- [x] 2.4 修改 `backend/src/conversation/repository.ts`：`update()` 方法加入 `cwd` 欄位
- [x] 2.5 修改 `backend/src/conversation/routes.ts`：PATCH 路由接受 `cwd` 參數
- [x] 2.6 修改 `ChatView.tsx`：在 ModelSelector 旁加入 CwdSelector，傳遞 `currentCwd` / `onCwdChange`
- [x] 2.7 修改 `AppShell.tsx`：新增 `handleCwdChange` — PATCH conversation 的 cwd + 清除 sdkSessionId
- [x] 2.8 新增 i18n 鍵值：`cwd.label`、`cwd.change`、`cwd.placeholder`（en.json + zh-TW.json）
- [x] 2.9 驗證：執行前後端測試，確認 cwd 更新、session 重建正常

## 3. Slash Command 選單（Feature 1 & 2）

- [x] 3.1 撰寫 useSkills hook 測試：啟動時 fetch skills、存入 store、失敗處理
- [x] 3.2 實作 `useSkills.ts` hook + store 新增 `skills`、`skillsLoaded`、`setSkills`
- [x] 3.3 撰寫 SlashCommandMenu 元件測試：渲染命令列表、過濾、分組、鍵盤導航、選取
- [x] 3.4 實作 `SlashCommandMenu.tsx`：浮動選單、分組顯示（Commands / Skills）、鍵盤導航
- [x] 3.5 撰寫 Input 元件 slash command 整合測試："/" 觸發選單、過濾、選取命令
- [x] 3.6 修改 `Input.tsx`：新增 `slashCommands`/`onSlashCommand` props、"/" 偵測、選單控制邏輯
- [x] 3.7 修改 `ChatView.tsx`：組裝內建命令 + 已啟用技能的 `slashCommands` 陣列，處理 `onSlashCommand`
- [x] 3.8 新增 i18n 鍵值：`slashCommand.noResults`、`slashCommand.commands`、`slashCommand.skills`、各內建命令描述（en.json + zh-TW.json）
- [x] 3.9 在 `AppShell.tsx` 中呼叫 `useSkills()` 載入 skills 快取
- [x] 3.10 驗證：執行前端測試，手動測試 "/" 選單行為

## 4. 附檔功能（Feature 6）

- [x] 4.1 撰寫後端 upload routes 測試：成功上傳、未認證、無檔案、超過大小限制
- [x] 4.2 安裝 multer 依賴：`cd backend && npm install multer && npm install -D @types/multer`
- [x] 4.3 實作 `backend/src/upload/routes.ts`：multer 設定、檔案儲存、回傳 file references
- [x] 4.4 修改 `backend/src/index.ts`：註冊 upload routes（`/api/upload`）
- [x] 4.5 撰寫 AttachmentPreview 元件測試：圖片縮圖、文件 icon、移除按鈕
- [x] 4.6 實作 `AttachmentPreview.tsx`：圖片/文件預覽列
- [x] 4.7 撰寫 upload-api 測試：uploadFiles function
- [x] 4.8 實作 `frontend/src/lib/upload-api.ts`：`uploadFiles(files)` → `POST /api/upload`
- [x] 4.9 撰寫 Input 附檔整合測試：Paperclip 按鈕、paste 圖片、drag-drop、檔案驗證
- [x] 4.10 修改 `Input.tsx`：attachments state、Paperclip 按鈕、paste handler、drop handler、AttachmentPreview 整合、onSend 簽名更新
- [x] 4.11 修改 `ChatView.tsx` / `AppShell.tsx`：附件發送 flow（先 upload 再 WS send）
- [x] 4.12 修改 `useTabCopilot.ts`：`sendMessage` 加入 `files` 參數
- [x] 4.13 修改 `backend/src/ws/handlers/copilot.ts`：解析 WS 訊息中的 `files` 欄位
- [x] 4.14 修改 `backend/src/copilot/stream-manager.ts`：`StartStreamOptions` 加 `files`，傳給 SDK
- [x] 4.15 新增 i18n 鍵值：`input.attach`、`input.attachError`、`input.attachSizeError`、`input.uploading`（en.json + zh-TW.json）
- [x] 4.16 驗證：執行前後端測試，手動測試上傳/貼上/拖放

## 5. Tab 重構 — Tab = Copilot 實例（Feature 4）

- [x] 5.1 撰寫 store 測試：TabState.id 獨立於 conversationId、openTab 生成新 tabId、switchTabConversation、getTabIdByConversationId
- [x] 5.2 重構 `store/index.ts`：TabState.id 改為獨立 UUID、conversationId 為可變欄位、新增 `switchTabConversation` / `getTabIdByConversationId`
- [x] 5.3 更新 `persistOpenTabs()` / `restoreOpenTabs()`：新格式 `{ id, conversationId, title }` + 舊格式遷移邏輯
- [x] 5.4 撰寫 useTabCopilot 事件路由測試：事件以 conversationId 查找 tab、sendMessage 從 tab 取 conversationId
- [x] 5.5 重構 `useTabCopilot.ts`：事件路由改用 conversationId 掃描查找 tabId、sendMessage 從 tabs[tabId].conversationId 取值
- [x] 5.6 撰寫 ConversationPopover 元件測試：搜尋、選取、新對話、高亮當前、同對話已開啟攔截、鍵盤導航
- [x] 5.7 實作 `ConversationPopover.tsx`：對話搜尋、分組（pinned/recent）、選取、新對話按鈕
- [x] 5.8 撰寫 TabBar Popover 整合測試：標題點擊開啟 Popover、ChevronDown 顯示
- [x] 5.9 修改 `TabBar.tsx`：Tab 標題加 ChevronDown icon、點擊標題開啟 ConversationPopover
- [x] 5.10 修改 `AppShell.tsx`：新增 `handleSwitchConversation(tabId, conversationId)` — abort stream → switchTabConversation → lazy load → subscribe
- [x] 5.11 修改 `Sidebar.tsx`：點擊對話改為載入到當前 active Tab（呼叫 handleSwitchConversation）
- [x] 5.12 更新現有 TabBar / Sidebar / AppShell 測試，適配新的 Tab 模型
- [x] 5.13 驗證：執行全部前端測試，手動測試 Tab 切換對話、Popover、Sidebar 行為

## 6. SDK 自控設定 — Tool-based（Feature 5）

- [x] 6.1 撰寫 self-control-tools 測試：各工具 handler 的讀寫行為、builtin skill 保護、內容長度限制
- [x] 6.2 實作 `backend/src/copilot/self-control-tools.ts`：createSelfControlTools() 定義所有工具（profile、agent、preferences、skills CRUD）
- [x] 6.3 撰寫 SessionManager tools 傳遞測試：createSession / resumeSession 帶 tools 參數
- [x] 6.4 修改 `session-manager.ts`：`CreateSessionOptions` / `ResumeSessionOptions` 加入 `tools` 欄位，傳給 SDK SessionConfig
- [x] 6.5 撰寫 StreamManager self-control tools 整合測試：startStream 傳遞 selfControlTools
- [x] 6.6 修改 `stream-manager.ts`：`StreamManagerDeps` 加入 `selfControlTools`，`startStream()` 傳給 session options
- [x] 6.7 修改 `backend/src/index.ts`：建立 self-control tools 並注入 StreamManager
- [x] 6.8 驗證：執行後端測試，手動測試在對話中請 SDK 「更新 profile」後確認 SettingsPanel 顯示變更

## 7. 最終整合驗證

- [x] 7.1 執行全部前端測試：`cd frontend && npx vitest run`
- [x] 7.2 執行全部後端測試：`cd backend && npx vitest run`
- [x] 7.3 執行 TypeScript 編譯檢查：`cd frontend && npx tsc --noEmit` + `cd backend && npx tsc --noEmit`
- [ ] 7.4 端對端手動驗證：所有 7 個功能在瀏覽器中正常運作
- [x] 7.5 確認 i18n 完整性：en.json 和 zh-TW.json 鍵值一致
