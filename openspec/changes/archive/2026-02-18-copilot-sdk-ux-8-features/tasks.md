## 1. Scroll-to-Bottom 浮動按鈕（Feature 4）

- [x] 1.1 撰寫 ScrollToBottom 元件測試（visibility、unread badge、click 行為）
- [x] 1.2 實作 ScrollToBottom.tsx 元件（浮動按鈕 + 動畫 + badge）
- [x] 1.3 撰寫 ChatView scroll 行為測試（showScrollButton state、unreadCount 遞增/重置）
- [x] 1.4 修改 ChatView.tsx 整合 ScrollToBottom（scroll 偵測、unread 追蹤、按鈕渲染）
- [x] 1.5 新增 i18n 字串（scrollToBottom.label）
- [x] 1.6 驗證：執行前端測試套件確認通過

## 2. 全頁面設定重設計（Feature 8）

- [x] 2.1 撰寫新 SettingsPanel 佈局測試（全頁面渲染、category 切換、Escape 關閉、行動端 tabs）
- [x] 2.2 撰寫 ApiKeysTab 元件測試（Brave API key 儲存/清除）
- [x] 2.3 實作 ApiKeysTab.tsx（從 GeneralTab 抽取 Brave API key 邏輯）
- [x] 2.4 重寫 SettingsPanel.tsx（fixed overlay + 左側導航 + 右側內容 + 8 categories）
- [x] 2.5 更新 store：新增 settingsActiveCategory state 和 setter
- [x] 2.6 新增 i18n 字串（settings.tabs.apiKeys、settings.back）
- [x] 2.7 驗證：執行設定相關測試確認所有 tab 功能正常

## 3. Usage 持久化（Feature 5）

- [x] 3.1 撰寫 stream-manager usage 累積測試（processEvent 累加 tokens、persistAccumulated 寫入 metadata）
- [x] 3.2 修改 AccumulationState 新增 usage 欄位 + processEvent 累加 copilot:usage
- [x] 3.3 修改 persistAccumulated 將 usage 寫入 message metadata
- [x] 3.4 撰寫前端 usage 恢復測試（載入歷史訊息時從 metadata 恢復 usage）
- [x] 3.5 更新 MessageMetadata type 新增 usage 欄位
- [x] 3.6 修改 AppShell 在 tab 切換/載入歷史時恢復 usage 資料
- [x] 3.7 驗證：執行完整後端 + 前端測試套件

## 4. Premium Request 配額 + 可展開 UsageBar（Feature 6）

- [x] 4.1 撰寫 event-relay 擴展測試（quotaSnapshots 轉發、session.shutdown 監聽）
- [x] 4.2 修改 event-relay.ts：擴展 assistant.usage 轉發 quotaSnapshots → copilot:quota + 新增 session.shutdown 監聽 → copilot:shutdown
- [x] 4.3 撰寫 stream-manager quota 累積測試（processEvent 累積 quota、cacheTokens；persistAccumulated 寫入 quota metadata）
- [x] 4.4 修改 stream-manager.ts：AccumulationState 新增 cacheReadTokens、cacheWriteTokens、quota；processEvent 處理 copilot:quota
- [x] 4.5 撰寫 UsageBar 元件測試（collapsed/expanded 切換、quota 進度條顏色、無資料時隱藏）
- [x] 4.6 擴展 store UsageInfo type（cacheReadTokens、cacheWriteTokens、premiumRequestsUsed/Total、premiumResetDate、model）
- [x] 4.7 修改 useTabCopilot.ts 監聽 copilot:quota 事件
- [x] 4.8 重寫 UsageBar.tsx（collapsed 摘要 + expanded 明細 + quota 進度條 + 顏色邏輯）
- [x] 4.9 新增 i18n 字串（usage.input、output、cacheRead、cacheWrite、premiumRequests、resets、contextWindow、model）
- [x] 4.10 驗證：執行完整測試套件

## 5. Plan Mode（Feature 1）

- [x] 5.1 撰寫 permission handler 測試（plan mode deny、act mode approve、動態切換）
- [x] 5.2 修改 permission.ts：新增 createPermissionHandler factory
- [x] 5.3 撰寫 session-manager 測試（onPermissionRequest 傳入和 fallback）
- [x] 5.4 修改 session-manager.ts：CreateSessionOptions / ResumeSessionOptions 新增 onPermissionRequest 欄位
- [x] 5.5 撰寫 stream-manager plan mode 測試（startStream with mode、setMode 方法、mode_changed 廣播）
- [x] 5.6 修改 stream-manager.ts：StartStreamOptions 新增 mode、ConversationStream 新增 mode、startStream 整合 permission handler、新增 setMode 方法
- [x] 5.7 撰寫 WS handler 測試（copilot:send with mode、copilot:set_mode handler）
- [x] 5.8 修改 ws/handlers/copilot.ts：copilot:send 提取 mode、新增 copilot:set_mode case
- [x] 5.9 撰寫 PlanActToggle 元件測試
- [x] 5.10 實作 PlanActToggle.tsx（分段按鈕 + icon）
- [x] 5.11 撰寫 ChatView plan mode 整合測試（banner 顯示、toggle 渲染）
- [x] 5.12 修改 store 新增 planMode state + setter
- [x] 5.13 修改 ChatView.tsx 整合 PlanActToggle + plan mode banner
- [x] 5.14 修改 useTabCopilot.ts sendMessage 帶上 mode
- [x] 5.15 新增 i18n 字串（planMode.plan、act、active、tooltip）
- [x] 5.16 驗證：執行完整測試套件

## 6. AskUserQuestion（Feature 2）

- [x] 6.1 撰寫 stream-manager user input bridge 測試（handler 建立、Promise resolve/reject、timeout、abort cleanup）
- [x] 6.2 修改 stream-manager.ts：ConversationStream 新增 pendingUserInputRequests Map、startStream 建立 onUserInputRequest handler、新增 handleUserInputResponse 方法、abortStream/shutdownAll cleanup
- [x] 6.3 撰寫 session-manager onUserInputRequest 測試
- [x] 6.4 修改 session-manager.ts：options 新增 onUserInputRequest、session config 傳入
- [x] 6.5 撰寫 WS handler 測試（copilot:user_input_response handler）
- [x] 6.6 修改 ws/handlers/copilot.ts：新增 copilot:user_input_response case
- [x] 6.7 撰寫 UserInputDialog 元件測試（choices 渲染、freeform input、submit 行為、不可關閉）
- [x] 6.8 實作 UserInputDialog.tsx（Modal + 問題 + 選項按鈕 + 自由輸入 + focus trap）
- [x] 6.9 修改 store 新增 userInputRequest state + setter
- [x] 6.10 修改 useTabCopilot.ts 監聽 copilot:user_input_request 事件
- [x] 6.11 修改 ChatView.tsx 整合 UserInputDialog + waiting indicator
- [x] 6.12 新增 i18n 字串（chat.waitingForResponse、userInput.submit、userInput.typeResponse）
- [x] 6.13 驗證：執行完整測試套件

## 7. Warp 風格目錄選擇器（Feature 7）

- [x] 7.1 撰寫 directory routes 測試（正常列表、path.resolve 安全性、null byte 拒絕、不存在路徑、非目錄、認證要求）
- [x] 7.2 實作 backend/src/directory/routes.ts（GET /api/directories 端點）
- [x] 7.3 修改 backend/src/index.ts 掛載 /api/directories 路由
- [x] 7.4 撰寫 DirectoryPicker 元件測試（渲染、搜尋過濾、鍵盤導航、parent 導航、CWD 更新）
- [x] 7.5 新增 frontend/src/lib/api.ts listDirectories 方法
- [x] 7.6 實作 DirectoryPicker.tsx（Popover + 搜尋 + 目錄列表 + 鍵盤導航）
- [x] 7.7 撰寫 CwdSelector 改造測試（點擊開啟 picker、選擇後關閉）
- [x] 7.8 修改 CwdSelector.tsx：移除 inline input，整合 DirectoryPicker popover
- [x] 7.9 新增 i18n 字串（directoryPicker.search、parent、empty）
- [x] 7.10 驗證：執行完整測試套件

## 8. Artifacts 側邊面板（Feature 3）

- [x] 8.1 安裝 mermaid 依賴：npm install mermaid --workspace=frontend
- [x] 8.2 撰寫 artifact-parser 測試（Markdown/code/html/svg/mermaid 偵測、多 artifact、無 artifact、邊界情況）
- [x] 8.3 實作 frontend/src/lib/artifact-parser.ts（regex 解析 artifact code blocks）
- [x] 8.4 撰寫 ArtifactsPanel 元件測試（各 type 渲染、tab 切換、close、copy、responsive）
- [x] 8.5 實作 ArtifactsPanel.tsx（side panel + header tabs + content renderers + footer）
- [x] 8.6 修改 store 新增 artifacts、activeArtifactId、artifactsPanelOpen state + actions
- [x] 8.7 撰寫 MessageBlock artifact 偵測測試（artifact 卡片顯示、點擊開啟面板）
- [x] 8.8 修改 MessageBlock.tsx 偵測 artifact 並渲染可點擊卡片
- [x] 8.9 修改 AppShell.tsx 主內容區支援 flex split layout（ChatView + ArtifactsPanel）
- [x] 8.10 新增 i18n 字串（artifacts.title、copy、download、close）
- [x] 8.11 驗證：執行完整前端測試套件

## 9. WebSocket Protocol 更新（跨功能整合）

- [x] 9.1 更新 WS types（如有需要，確保新 message types 有 type definitions）
- [x] 9.2 執行完整 backend + frontend 測試套件
- [x] 9.3 手動 E2E 驗證所有 8 個功能的基本流程
