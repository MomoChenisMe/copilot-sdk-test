## 1. Design System — 色彩系統與基礎樣式

- [x] 1.1 重寫 `frontend/src/styles/globals.css`：定義完整 Slate Indigo light/dark 主題色彩變數（30+ CSS custom properties）、shadow 變數、cursor-blink 動畫 keyframes
- [x] 1.2 在 `globals.css` 中加入 `@import "highlight.js/styles/github-dark.css"` 導入語法高亮樣式
- [x] 1.3 驗證 Tailwind v4 utility classes（如 `bg-accent-soft`, `border-border-subtle`）正確映射到新定義的 CSS custom properties

## 2. 佈局重構 — AppShell + TopBar + TabBar

- [x] 2.1 新建 `frontend/src/components/layout/TabBar.tsx`：Copilot/Terminal tab 切換元件，使用 Sparkles 和 TerminalSquare Lucide icons
- [x] 2.2 為 TabBar 撰寫測試（`frontend/tests/components/layout/TabBar.test.tsx`）
- [x] 2.3 重寫 `frontend/src/components/layout/TopBar.tsx`：精簡為 [Sidebar btn][+New]  Title  [Theme][Connection]，新增 `onHomeClick` 和 `onNewChat` props
- [x] 2.4 更新 TopBar 測試（`frontend/tests/components/layout/TopBar.test.tsx`）：配合新 props 和 DOM 結構
- [x] 2.5 重構 `frontend/src/components/layout/AppShell.tsx`：移除 BottomBar import，加入 TabBar，修正 content area 為 `h-full flex flex-col`，將 Input/ModelSelector props 傳入 ChatView
- [x] 2.6 刪除 `frontend/src/components/layout/BottomBar.tsx`

## 3. ChatView 重構 — 整合 Input + 修復捲動

- [x] 3.1 重寫 `frontend/src/components/shared/Input.tsx`：浮動卡片風格（`bg-bg-elevated rounded-2xl shadow-input`），icon-only 發送按鈕（ArrowUp）和停止按鈕（Square），textarea `bg-transparent`
- [x] 3.2 重構 `frontend/src/components/copilot/ChatView.tsx`：整合 Input + ModelSelector 到底部（`shrink-0`），訊息區 `flex-1 overflow-y-auto`，傳入 onSend/onAbort/isStreaming/disabled/model props
- [x] 3.3 重寫 `frontend/src/components/copilot/ModelSelector.tsx`：pill 觸發按鈕（`bg-bg-tertiary rounded-lg`），modern dropdown（`rounded-xl shadow-lg`），active 項使用 `text-accent bg-accent-soft`
- [x] 3.4 更新 ModelSelector 測試（`frontend/tests/components/copilot/ModelSelector.test.tsx`）

## 4. 訊息元件重設計

- [x] 4.1 重寫 `frontend/src/components/copilot/MessageBlock.tsx`：User 氣泡（`bg-user-msg-bg border-user-msg-border rounded-2xl rounded-br-sm`）、Assistant 佈局（avatar + label + Markdown）
- [x] 4.2 更新 MessageBlock 測試（`frontend/tests/components/copilot/MessageBlock.test.tsx`）
- [x] 4.3 重寫 `frontend/src/components/shared/Markdown.tsx`：修正語言提取邏輯（`split(/\s+/).find()`）、code block 使用 `rounded-xl border` 容器、inline code 使用 `text-accent` 樣式、copy 按鈕 hover 時顯示
- [x] 4.4 更新 `frontend/src/components/copilot/StreamingText.tsx`：改用 `cursor-blink` step-end 動畫
- [x] 4.5 重寫 `frontend/src/components/copilot/ReasoningBlock.tsx`：`rounded-xl border border-border` 卡片樣式，spinner 使用 CSS border animation
- [x] 4.6 重寫 `frontend/src/components/copilot/ToolRecord.tsx`：`rounded-xl border border-border` 卡片樣式，狀態 icon 使用 Lucide（Check/X/Loader）

## 5. Sidebar 現代化

- [x] 5.1 重寫 `frontend/src/components/layout/Sidebar.tsx`：backdrop blur、Lucide icons（Pencil/Star/Trash2/Search/Plus/X/Globe/LogOut）、active 項 `bg-accent-soft`、底部設定區（語言切換 + 登出）、搜尋欄內嵌 Search icon
- [x] 5.2 更新 Sidebar 的 props 接口：新增 `onLanguageToggle`、`onLogout`、`language` props

## 6. Bug 修復 — 訊息去重

- [x] 6.1 修改 `frontend/src/store/index.ts` 的 `addMessage`：加入 `message.id` 去重邏輯
- [x] 6.2 修改 `frontend/src/hooks/useCopilot.ts`：在 `copilot:message` handler 中加入 `setStreamingText('')` 清除 streaming
- [x] 6.3 更新 useCopilot 測試（`frontend/tests/hooks/useCopilot.test.ts`）：新增重複 messageId 去重測試案例

## 7. 周邊元件更新

- [x] 7.1 更新 `frontend/src/components/shared/ConnectionBadge.tsx`：dot 大小改為 `w-1.5 h-1.5`
- [x] 7.2 更新 `frontend/src/components/auth/LoginPage.tsx`：精緻卡片樣式（`rounded-2xl shadow-lg`、加入 Terminal icon header）
- [x] 7.3 更新 `frontend/src/components/terminal/TerminalView.tsx`：xterm theme 同步 Slate Indigo 配色

## 8. i18n + 測試收尾

- [x] 8.1 更新 `frontend/src/locales/en.json`：新增 topBar.home、topBar.newChat、tabBar.copilot、tabBar.terminal、sidebar.language、sidebar.logout
- [x] 8.2 更新 `frontend/src/locales/zh-TW.json`：新增對應的繁體中文翻譯
- [x] 8.3 更新 `frontend/tests/App.test.tsx`：配合新佈局結構（無 BottomBar、有 TabBar）
- [x] 8.4 執行 `npx tsc --noEmit` 確認無型別錯誤
- [x] 8.5 執行 `npx vitest run` 確認所有測試通過
