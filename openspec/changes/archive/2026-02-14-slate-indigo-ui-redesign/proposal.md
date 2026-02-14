## Why

AI Terminal 前端存在多個嚴重的 UI/UX 問題：按鈕與佈局樣式錯亂、助手回應重複疊加、程式碼區塊無語法高亮且語言標籤顯示錯誤、聊天區域無法捲動、以及缺少返回首頁的導航。這些問題嚴重影響日常使用體驗，需要從底層主題系統到元件佈局進行全面重新設計，而非逐一修補。

**目標使用者：** 開發者本人，透過手機瀏覽器遠端操作 AI Terminal 進行程式開發。

**使用情境：** 在手機上與 Copilot Agent 對話、閱讀程式碼回應、切換 Terminal 操作 Shell，需要乾淨專業的介面和流暢的互動體驗。

## What Changes

- **全新 "Slate Indigo" 色彩系統** — 以 Indigo (#4F46E5) 取代現有 Violet 主色調，搭配完整的 light/dark 雙主題色彩變數
- **佈局重構** — Input 從 BottomBar 移入 ChatView（類似 ChatGPT），BottomBar 替換為輕量 TabBar
- **TopBar 精簡化** — 移除語言切換和模型名稱顯示，新增「新對話」和「首頁」按鈕
- **Sidebar 現代化** — Unicode emoji 圖標替換為 Lucide icons，底部新增設定區（語言、登出）
- **程式碼區塊修復** — 導入 highlight.js CSS、修正語言標籤解析邏輯
- **訊息去重修復** — store `addMessage` 加入 ID 去重邏輯，防止 SDK 多輪對話產生重複訊息
- **捲動修復** — 修正 flex 容器結構，使 ChatView 正確支援 overflow-y-auto
- **xterm 主題同步** — Terminal 色彩更新為 Slate Indigo 配色

## Non-Goals（非目標）

- 不新增任何後端 API 或 WebSocket 協議變更
- 不變更認證流程或 Copilot SDK 整合邏輯
- 不引入新的 UI 框架或元件庫（繼續使用 Tailwind CSS + Lucide）
- 不增加新功能頁面（如設定頁、個人檔案頁）
- 不處理手機 responsive 斷點優化（維持現有行為）

## Capabilities

### New Capabilities

- `design-system`: 統一的 "Slate Indigo" 主題色彩系統，涵蓋 light/dark 雙主題 CSS 變數、shadow 變數、動畫定義

### Modified Capabilities

- `app-layout`: 佈局結構重構 — 移除 BottomBar、新增 TabBar、Input 移入 ChatView、TopBar 精簡化、Sidebar 新增設定區
- `chat-ui`: 聊天介面重設計 — MessageBlock 新樣式、Code Block 修復、Input 浮動卡片風格、訊息去重、捲動修復
- `terminal-ui`: xterm 主題色彩同步至 Slate Indigo 配色
- `i18n`: 新增 TopBar 首頁/新對話、TabBar 標籤等翻譯 key

## Impact

**前端程式碼（主要影響）：**
- `frontend/src/styles/globals.css` — 完整重寫色彩系統
- `frontend/src/components/layout/` — AppShell, TopBar 重構，BottomBar 刪除，TabBar 新建，Sidebar 重寫
- `frontend/src/components/copilot/` — ChatView, MessageBlock, ModelSelector, StreamingText, ReasoningBlock, ToolRecord 重寫
- `frontend/src/components/shared/` — Markdown, Input, ConnectionBadge 重寫
- `frontend/src/components/terminal/TerminalView.tsx` — xterm 主題更新
- `frontend/src/components/auth/LoginPage.tsx` — 樣式更新
- `frontend/src/store/index.ts` — addMessage 去重邏輯
- `frontend/src/hooks/useCopilot.ts` — streaming 清除邏輯
- `frontend/src/locales/` — 新增翻譯 key
- `frontend/tests/` — 配合新結構更新測試

**新增依賴：** 無（highlight.js 已作為 rehype-highlight 的 transitive dependency 存在）

**後端：** 無影響
