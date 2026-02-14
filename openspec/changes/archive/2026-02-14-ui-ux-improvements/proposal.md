## Why

AI Terminal 目前的前端介面存在多項可用性問題，且整體設計風格過於簡陋，不符合現代 AI Agent 聊天應用的標準。需要全面重新設計 UI/UX，對標 ChatGPT、Claude.ai、Gemini 等主流 AI Agent 產品的設計語言，同時融入 Claude Code CLI 的 Agent 步驟可視化能力，讓使用者能清楚看到每個工具呼叫、程式碼修改和執行結果。

**目標使用者**：專案擁有者（單人使用），透過手機瀏覽器操作 AI Terminal。

**使用情境**：登入後看到現代化的聊天介面，能清楚看到 AI Agent 的每個操作步驟（工具呼叫、Code diff、Bash 執行結果），並以舒適的視覺體驗進行日常開發工作。

## What Changes

### 全面 UI 重新設計
- **現代 AI Agent 聊天風格**：對標 ChatGPT/Claude/Gemini 的設計語言 — 居中對話欄（max-width ~768px）、乾淨的訊息區塊、充足的留白
- **Agent 步驟可視化**：借鑒 Claude Code CLI 的設計 — 工具呼叫以 inline card 呈現（含狀態指示燈：running/success/error）、程式碼 diff 以紅綠色顯示、Bash 指令和輸出以區塊呈現
- **重新設計 TopBar**：精簡的頂部導航列，含 conversation 標題、模型選擇器、主題切換、設定選單
- **重新設計 Sidebar**：現代化的對話列表側邊欄，含搜尋、分組（pinned/recent）、操作選單
- **重新設計 BottomBar / 輸入區**：寬敞的輸入區域，pill-style Copilot/Terminal 切換，類似 ChatGPT 的輸入體驗
- **重新設計 ChatView**：現代化的訊息呈現，含 user/assistant 區分、avatar、inline tool records、code blocks with copy button

### 功能修正
- **歡迎畫面**：無 active conversation 時顯示歡迎頁面
- **Model 下拉選單修正**：向上展開 + click-outside 關閉
- **模型授權同步**：共享狀態從 SDK 取得授權模型
- **助手回應修復**：EventRelay 防禦性屬性存取、streaming → message 轉換、error 顯示
- **深淺主題切換**：雙套主題 + localStorage 持久化

## Non-Goals

- 不做多使用者支援或 RBAC 權限
- 不做 system prompt 自訂或 preset 管理
- 不做跨對話記憶
- 不重構 WebSocket 協議或後端 REST API
- 不做 Artifacts/Canvas 分割畫面（保留未來擴展空間）
- 不做語音對話功能
- 不做 Terminal UI 改善（本次聚焦 Copilot Chat 介面）

## Capabilities

### New Capabilities
- `theme-switching`: 深淺主題切換系統 — CSS 變數雙套定義、Zustand 狀態管理、TopBar 切換按鈕、localStorage 持久化
- `modern-chat-layout`: 現代 AI Agent 聊天佈局 — 居中對話欄、訊息區塊設計、Agent 步驟可視化（工具呼叫 card、code diff、Bash 輸出）、歡迎畫面

### Modified Capabilities
- `chat-ui`: 全面重新設計 MessageBlock（user/assistant 區分、avatar）、StreamingText、ToolRecord（inline card + 狀態指示燈）、ReasoningBlock、Input（寬敞輸入）、ModelSelector（共享狀態 + 方向修正）、error 顯示修正、streaming → message 轉換
- `app-layout`: TopBar 重新設計（精簡導航 + 模型選擇 + 主題切換）、BottomBar 重新設計（pill tabs + 寬敞輸入）、Sidebar 現代化（搜尋 + 分組 + 操作選單）
- `copilot-agent`: EventRelay SDK event 屬性存取修正、debug logging

## Impact

**前端全面重構（~15 檔案）：**
- `frontend/src/styles/globals.css` — 全新設計系統（色彩、字體、間距）+ 雙主題
- `frontend/src/store/index.ts` — 新增 theme + models 狀態
- `frontend/src/hooks/useModels.ts`（新檔）— 模型載入 hook
- `frontend/src/hooks/useCopilot.ts` — streaming → message 轉換修正
- `frontend/src/components/shared/Input.tsx` — 全面重新設計輸入區
- `frontend/src/components/layout/AppShell.tsx` — 佈局重構
- `frontend/src/components/layout/TopBar.tsx` — 全面重新設計
- `frontend/src/components/layout/BottomBar.tsx` — 全面重新設計
- `frontend/src/components/layout/Sidebar.tsx` — 現代化重新設計
- `frontend/src/components/copilot/ChatView.tsx` — 全面重新設計（居中欄 + 歡迎畫面）
- `frontend/src/components/copilot/MessageBlock.tsx` — 全面重新設計（user/assistant 風格）
- `frontend/src/components/copilot/StreamingText.tsx` — 樣式更新
- `frontend/src/components/copilot/ToolRecord.tsx` — 重新設計為 inline card
- `frontend/src/components/copilot/ReasoningBlock.tsx` — 重新設計為可折疊區塊
- `frontend/src/components/copilot/ModelSelector.tsx` — 重新設計 + 共享狀態

**後端修改（1 檔案）：**
- `backend/src/copilot/event-relay.ts` — SDK event 防禦性存取 + debug logging

**無 API 變更**：所有修改為前端 UI 層 + 後端 event relay 內部邏輯。
