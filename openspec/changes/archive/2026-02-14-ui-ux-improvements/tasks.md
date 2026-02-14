## 1. 設計系統 + 深淺主題

- [x] 1.1 撰寫 theme store 測試：驗證 `theme` 初始值、`toggleTheme()` 切換、localStorage 讀寫
- [x] 1.2 實作 Zustand store theme slice：新增 `theme`, `toggleTheme` 到 `frontend/src/store/index.ts`
- [x] 1.3 全面更新 `frontend/src/styles/globals.css`：淺色主題為 `@theme` 預設值，深色主題 `html[data-theme="dark"]` 覆寫，擴展色彩變數（新增 user-message-bg、code-block-bg 等）
- [x] 1.4 驗證 Tailwind CSS v4 的 `@theme` 變數在 dark mode override 下正確運作

## 2. 模型列表共享狀態

- [x] 2.1 撰寫 models store slice 測試：驗證 `models`, `modelsLoading`, `modelsError` 狀態和 actions
- [x] 2.2 實作 Zustand store models slice：新增 models 相關狀態到 `frontend/src/store/index.ts`
- [x] 2.3 撰寫 useModels hook 測試：驗證 API 呼叫、成功/失敗處理
- [x] 2.4 實作 `frontend/src/hooks/useModels.ts`：mount 時載入模型，寫入 store

## 3. TopBar 重新設計

- [x] 3.1 撰寫 TopBar 測試：驗證精簡佈局（選單按鈕 + 標題 + 模型名稱 + 主題切換 + 狀態燈）
- [x] 3.2 重新設計 `frontend/src/components/layout/TopBar.tsx`：精簡導航列，標題下方顯示模型名稱，右側主題切換按鈕（lucide-react Sun/Moon icon）+ 連線狀態
- [x] 3.3 驗證 TopBar 深淺主題外觀

## 4. Sidebar 現代化

- [x] 4.1 撰寫 Sidebar 測試：驗證搜尋框、New Conversation 按鈕、Pinned/Recent 分組、操作選單
- [x] 4.2 重新設計 `frontend/src/components/layout/Sidebar.tsx`：頂部 New Conversation 按鈕 + 搜尋框、Pinned 分組、Recent 列表、對話項目含標題 + 時間 + 選中高亮
- [x] 4.3 驗證 Sidebar 深淺主題外觀和滑入/滑出動畫

## 5. BottomBar + Input 重新設計

- [x] 5.1 撰寫 BottomBar 測試：驗證 pill-style tabs、ModelSelector 同行、Terminal tab 隱藏輸入
- [x] 5.2 重新設計 `frontend/src/components/layout/BottomBar.tsx`：pill tabs + ModelSelector 同行，寬敞輸入區
- [x] 5.3 撰寫 Input 測試：驗證預設 3 行高度、16px padding、圓角邊框、自動增長
- [x] 5.4 重新設計 `frontend/src/components/shared/Input.tsx`：現代化風格（圓角、充足 padding、placeholder「Message AI Terminal...」）
- [x] 5.5 撰寫 ModelSelector 測試：驗證向上展開、click-outside 關閉、共享狀態
- [x] 5.6 重新設計 `frontend/src/components/copilot/ModelSelector.tsx`：向上展開 + click-outside + 從 store 讀取模型

## 6. ChatView + 訊息區塊重新設計

- [x] 6.1 撰寫 ChatView 測試：驗證居中對話欄（max-w-3xl）、歡迎畫面、空 conversation 提示
- [x] 6.2 重新設計 `frontend/src/components/copilot/ChatView.tsx`：居中對話欄、歡迎畫面（無 active conversation）、空 conversation 提示
- [x] 6.3 撰寫 MessageBlock 測試：驗證 user 訊息右對齊圓角區塊、assistant 訊息全寬左對齊 + label
- [x] 6.4 重新設計 `frontend/src/components/copilot/MessageBlock.tsx`：user 訊息右對齊灰色背景、assistant 訊息左對齊含模型標籤、Markdown 渲染
- [x] 6.5 新增 Code block copy 按鈕功能：在 Markdown 渲染的 code block 右上角加入 copy 按鈕

## 7. 工具呼叫 Inline Card 重新設計

- [x] 7.1 撰寫 ToolRecord 測試：驗證 inline card（spinner/✓/✗ 狀態、monospace 工具名稱、展開/折疊）
- [x] 7.2 重新設計 `frontend/src/components/copilot/ToolRecord.tsx`：inline card 風格（左側狀態圖示 + 工具名稱 + subtle 背景 + 可折疊 args/result）
- [x] 7.3 驗證多個工具呼叫依序顯示的效果

## 8. 推理過程區塊重新設計

- [x] 8.1 撰寫 ReasoningBlock 測試：驗證「Thinking...」串流中、「Thought for Xs」完成後、預設折疊
- [x] 8.2 重新設計 `frontend/src/components/copilot/ReasoningBlock.tsx`：可折疊區塊、淺色背景、monospace 內容、串流中展開/完成後折疊

## 9. Streaming + 串流文字更新

- [x] 9.1 撰寫 StreamingText 測試：驗證閃爍 block cursor（█）、即時 Markdown 渲染
- [x] 9.2 更新 `frontend/src/components/copilot/StreamingText.tsx`：block cursor 樣式、即時渲染

## 10. 助手回應修復（Bug Fix）

- [x] 10.1 撰寫 EventRelay 測試：驗證防禦性屬性存取 fallback chain、debug logging
- [x] 10.2 修正 `backend/src/copilot/event-relay.ts`：pino debug logging + fallback chain
- [x] 10.3 撰寫 useCopilot streaming → message 轉換測試：驗證 `copilot:idle` 時轉換 streamingText
- [x] 10.4 修正 `frontend/src/hooks/useCopilot.ts`：`receivedMessageRef` + idle 時轉換
- [x] 10.5 撰寫 ChatView error 顯示測試：驗證 `copilotError` 在 streamingText 為空時仍可見
- [x] 10.6 修正 ChatView `showStreamingBlock` 條件：加入 `|| copilotError`

## 11. AppShell 整合

- [x] 11.1 更新 `frontend/src/components/layout/AppShell.tsx`：引入 `useModels`、`handleNewConversation` 用 `models[0]?.id`、傳遞 `onNewConversation` 給 ChatView、初始化主題
- [x] 11.2 在 AppShell mount 時設定 `html[data-theme]` 屬性

## 12. 整合驗證

- [x] 12.1 執行前端測試：`npm test --workspace=frontend`
- [x] 12.2 執行後端測試：`npm test --workspace=backend`
- [x] 12.3 端對端驗證：啟動 dev server，測試完整流程（登入 → 歡迎畫面 → 新對話 → 發送訊息 → 工具呼叫顯示 → 切換主題 → 切換模型 → Sidebar 操作）
- [x] 12.4 手機瀏覽器視覺驗證：確認所有元件在手機寬度下正確顯示
