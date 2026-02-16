## 1. Tab 鍵選取 slash command (F5)

- [x] 1.1 撰寫 Input.test.tsx 中 Tab 鍵選取 slash command 的測試案例
- [x] 1.2 在 Input.tsx handleKeyDown 中新增 Tab 鍵處理邏輯
- [x] 1.3 執行測試確認通過

## 2. 對話自動命名 (F9)

- [x] 2.1 撰寫 useTabCopilot.test.ts 中首條訊息自動命名的測試案例（包含正常、超長、空白 fallback）
- [x] 2.2 在 useTabCopilot.ts sendMessage() 中新增自動命名邏輯：檢查 messages.length === 0，截取前 50 字元，呼叫 conversationApi.update 和 updateTabTitle
- [x] 2.3 執行測試確認通過

## 3. 移除側邊欄與漢堡選單 (F3)

- [x] 3.1 撰寫 TopBar.test.tsx 中驗證漢堡按鈕不存在的測試案例
- [x] 3.2 移除 TopBar.tsx 的 onMenuClick prop 和漢堡按鈕，移除 Menu icon import
- [x] 3.3 移除 AppShell.tsx 中 Sidebar 相關的所有程式碼（import、state、callbacks、JSX）
- [x] 3.4 撰寫 SettingsPanel General tab 的測試案例（語言切換按鈕、登出按鈕）
- [x] 3.5 在 SettingsPanel.tsx 新增 `general` tab，實作語言切換和登出按鈕 UI
- [x] 3.6 AppShell.tsx 傳遞 onLanguageToggle、language、onLogout props 給 SettingsPanel
- [x] 3.7 新增 en.json / zh-TW.json 中 `settings.tabs.general`、`settings.general.language`、`settings.general.logout` 翻譯鍵
- [x] 3.8 執行全部前端測試確認無 regression

## 4. 圖片傳送至 SDK 驗證 (F1)

- [x] 4.1 檢閱 backend/src/copilot/session-manager.ts 中 sendMessage 的 files 格式，對照 @github/copilot-sdk API 文件
- [x] 4.2 撰寫 session-manager.test.ts 中 file attachment 傳送格式的測試案例
- [x] 4.3 若格式不匹配，修正 SessionManager.sendMessage 中的 files mapping 邏輯
- [x] 4.4 執行後端測試確認通過

## 5. 聊天中顯示圖片 (F2)

- [x] 5.1 在 api.ts 中新增 AttachmentMeta interface 和擴充 MessageMetadata 型別
- [x] 5.2 撰寫 useTabCopilot.test.ts 中附件 metadata 隨 user message 儲存的測試案例
- [x] 5.3 修改 useTabCopilot.ts sendMessage()：當 files 存在時，在 user message metadata 中加入 attachments 陣列
- [x] 5.4 撰寫後端 copilot handler 中 user message 附件 metadata 持久化的測試案例
- [x] 5.5 修改 backend/src/ws/handlers/copilot.ts：repo.addMessage 時帶上 metadata.attachments
- [x] 5.6 撰寫 upload routes GET /api/upload/:id 端點的測試案例（正常 serve、404）
- [x] 5.7 在 backend/src/upload/routes.ts 新增 GET /api/upload/:id 端點
- [x] 5.8 撰寫 MessageBlock 圖片縮圖渲染的測試案例（單圖、多圖、混合附件、無附件）
- [x] 5.9 修改 MessageBlock.tsx user bubble：解析 metadata.attachments，渲染圖片縮圖和非圖片 badge
- [x] 5.10 執行全部測試確認通過

## 6. SDK 動態 slash commands (F4)

- [x] 6.1 撰寫後端 GET /api/copilot/commands 端點的測試案例（成功、fallback）
- [x] 6.2 實作後端端點：嘗試從 SDK 取得 commands，失敗時使用靜態 fallback 清單
- [x] 6.3 在 backend/src/index.ts 註冊新 route
- [x] 6.4 在 frontend/src/lib/api.ts 新增 copilotApi.listCommands() 呼叫
- [x] 6.5 撰寫 store sdkCommands 狀態管理的測試案例
- [x] 6.6 在 store/index.ts 新增 sdkCommands state 和 setSdkCommands action
- [x] 6.7 在 useSkills.ts（或新建 hook）中啟動時載入 SDK commands 並存入 store
- [x] 6.8 擴充 SlashCommand type 加入 `'sdk'` 類型
- [x] 6.9 撰寫 SlashCommandMenu 三區段顯示的測試案例
- [x] 6.10 修改 SlashCommandMenu.tsx 新增 SDK commands 區段
- [x] 6.11 修改 ChatView.tsx 組合 builtin + skills + sdk commands
- [x] 6.12 新增 en.json / zh-TW.json 中 SDK commands 區段標題翻譯鍵
- [x] 6.13 執行全部測試確認通過

## 7. 命令顏色區分 (F6)

- [x] 7.1 撰寫 MessageBlock 命令 badge 渲染的測試案例（有命令前綴、無命令前綴、僅命令無參數）
- [x] 7.2 修改 MessageBlock.tsx user bubble：用 regex 解析 `/command` 前綴，渲染為 accent 色 badge
- [x] 7.3 執行測試確認通過

## 8. 可收合技能描述 (F8)

- [x] 8.1 撰寫 MessageBlock 可收合技能描述的測試案例（skill 匹配、非 skill 命令、收合/展開）
- [x] 8.2 修改 MessageBlock.tsx：在命令 badge 下方新增 `<details>` 收合區塊，從 store 讀取 skills 匹配
- [x] 8.3 執行測試確認通過

## 9. Bash 執行模式 (F7)

- [x] 9.1 撰寫 store TabState.mode 和 setTabMode 的測試案例
- [x] 9.2 在 store/index.ts 的 TabState 新增 `mode` 欄位和 `setTabMode` action，openTab 預設 `'copilot'`
- [x] 9.3 撰寫後端 bash-exec handler 的測試案例（正常執行、非零 exit code、逾時、CWD 不存在）
- [x] 9.4 新建 backend/src/ws/handlers/bash-exec.ts：實作 `bash:exec` handler（spawn + 串流 stdout/stderr + timeout）
- [x] 9.5 在 backend/src/index.ts 註冊 bash-exec handler
- [x] 9.6 撰寫 CwdSelector 模式切換 UI 的測試案例
- [x] 9.7 修改 CwdSelector.tsx：新增 mode/onModeChange props，加入 AI/Bash 分段切換按鈕
- [x] 9.8 撰寫 useBashMode hook 的測試案例（送出命令、接收輸出、完成事件）
- [x] 9.9 新建 frontend/src/hooks/useBashMode.ts：監聯 bash:output/bash:done 事件，管理命令訊息
- [x] 9.10 修改 ChatView.tsx：根據 tab mode 切換 Input 行為（placeholder、停用 slash menu 和附件、送出走 bash:exec）
- [x] 9.11 撰寫 terminal 輸出渲染的測試案例（stdout monospace、stderr 紅色、exit code 顯示）
- [x] 9.12 實作 terminal 輸出渲染（可在 MessageBlock 中或新建 TerminalOutput 元件）
- [x] 9.13 新增 en.json / zh-TW.json 中 `terminal.*` 翻譯鍵
- [x] 9.14 執行全部測試確認通過

## 10. 整合驗證

- [x] 10.1 執行全部前端測試套件（npm run test --workspace=frontend）
- [x] 10.2 執行全部後端測試套件（npm run test --workspace=backend）
- [x] 10.3 手動驗證：上傳圖片 → 聊天顯示 → Agent 理解圖片
- [x] 10.4 手動驗證：Bash 模式切換 → 執行 `ls -la` → 輸出正確渲染
- [x] 10.5 手動驗證：slash command menu 顯示三區段 → Tab/Enter 選取
- [x] 10.6 手動驗證：新對話首條訊息後 tab 標題自動更新
