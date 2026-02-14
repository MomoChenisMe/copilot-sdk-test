## Context

AI Terminal 前端使用 React 19 + Tailwind CSS v4 + Zustand 5 構建。目前存在 5 個嚴重 UI/UX 問題（樣式錯亂、訊息重複、程式碼區塊壞掉、無法捲動、無法回首頁），需要從底層主題系統到元件佈局進行全面重新設計。

**現有架構：**
- `globals.css` 使用 Tailwind v4 `@theme` directive 定義 CSS custom properties
- `AppShell` → `TopBar` + Content(`ChatView`/`TerminalView`) + `BottomBar` + `Sidebar`
- `BottomBar` 同時包含 tab 切換、ModelSelector 和 Input（過度集中）
- 訊息透過 Zustand store 的 `addMessage` 管理，無去重機制
- 沒有 React Router，使用 conditional rendering 做導航

## Goals / Non-Goals

**Goals:**
- 建立完整的 "Slate Indigo" 雙主題色彩系統（30+ CSS custom properties）
- 重構佈局：Input 移入 ChatView、BottomBar 替換為 TabBar、TopBar 精簡化
- 修復全部 5 個 bug（訊息重複、捲動、程式碼區塊、導航、樣式）
- 統一所有元件的視覺語言（圓角、間距、icon 風格）

**Non-Goals:**
- 不引入新的 CSS/UI 框架
- 不新增後端 API 變更
- 不做 responsive 斷點優化
- 不引入動畫庫（Framer Motion 等）

## Decisions

### D1: 色彩系統架構 — Tailwind v4 @theme + CSS selector override

使用 `@theme {}` 定義 light mode 預設值，`html[data-theme="dark"]` 覆寫 dark mode。Tailwind v4 的 `@theme` 將 CSS custom properties 映射為 utility classes（如 `--color-accent` → `bg-accent`），dark mode 透過 CSS specificity 覆寫變數值。

**替代方案：** 使用 Tailwind 的 `dark:` variant 做 dark mode。
**取捨：** `dark:` variant 需要在每個元件上寫兩套 class，維護成本高。CSS custom properties 方式只需在 `globals.css` 中管理，元件層不用關心 theme。選擇 CSS custom properties。

### D2: 佈局重構 — Input 移入 ChatView 內部

將 Input 從 BottomBar 移至 ChatView 底部（`shrink-0`），使 ChatView 成為自包含的 `flex flex-col h-full` 容器。移除 BottomBar，Tab 切換改為獨立的 TabBar 元件放在 TopBar 下方。

**替代方案：** 保留 BottomBar 但只放 Input，Tab 切換移至 TopBar。
**取捨：** 移入 ChatView 讓 Input 和訊息在同一個 scroll context，更接近 ChatGPT/Claude 的體驗。同時解決了 BottomBar 過度集中的問題。Terminal tab 不需要 Input，分離後更乾淨。

### D3: 訊息去重 — Store-level ID deduplication

在 Zustand store 的 `addMessage` 中加入 `message.id` 去重。Copilot SDK 的 multi-turn agent loop 可能對同一 messageId 觸發多次 `assistant.message` 事件。

**替代方案：** 在 useCopilot hook 層做去重（維護一個 Set 記錄已處理的 messageId）。
**取捨：** Store-level 去重更安全，無論訊息從哪裡加入都會被保護。Hook-level 去重只保護特定路徑。選擇 store-level。

### D4: 程式碼區塊修復 — highlight.js CSS + 語言提取修正

導入 `highlight.js/styles/github-dark.css` 提供語法高亮樣式。修正 `Markdown.tsx` 中的語言提取邏輯：`className` 可能是 `"hljs language-python"`，需用 `split(/\s+/).find()` 正確提取 `"python"`。

**替代方案：** 使用 Shiki 替代 highlight.js 做語法高亮。
**取捨：** Shiki 更精確但需要額外 bundle size 和 async loading。highlight.js 已作為 transitive dependency 存在（rehype-highlight → lowlight → highlight.js），只需導入 CSS。選擇 highlight.js。

### D5: 首頁導航 — TopBar 新增 Home 和 New Chat 按鈕

在 TopBar 左側加入 Home 按鈕（點擊設定 `activeConversationId = null` 回到歡迎畫面）和 New Chat 按鈕（建立新對話）。標題也可點擊回首頁。

**替代方案：** 在 Sidebar 中加入 Home 按鈕。
**取捨：** TopBar 的 Home 按鈕更直覺，不需要開啟 Sidebar。兩者都做：TopBar 快速存取 + Sidebar 也有 New Chat。

### D6: Sidebar 設定區 — 語言切換和登出移至 Sidebar 底部

從 TopBar 移除語言切換按鈕，改為在 Sidebar 底部新增設定區（語言切換 + 登出）。TopBar 精簡為只有必要的導航和狀態元素。

**替代方案：** 保留語言切換在 TopBar。
**取捨：** 語言切換使用頻率低，放在 Sidebar 設定區更合理。TopBar 精簡後只有 4 個元素（Sidebar btn、New Chat btn、Title、Theme + Connection），視覺更清爽。

### D7: shadow 變數 — CSS custom properties for shadows

在 `@theme` 中定義 shadow 變數（`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-input`），在元件中使用 `shadow-[var(--shadow-input)]` 引用。Dark mode 使用更重的陰影。

**替代方案：** 直接使用 Tailwind 的 `shadow-sm`, `shadow-md` 等內建 class。
**取捨：** 內建 class 的 shadow 在 dark mode 下幾乎不可見。自訂 CSS variable 可以為 dark mode 定義更強的陰影。選擇自訂變數。

## Risks / Trade-offs

**[大量元件同時修改]** → 分 5 個 phase 依序實作：CSS → 佈局 → 元件 → Bug → 測試。每個 phase 完成後跑 `vitest` 確保不 break。

**[Tailwind v4 @theme 的 dark override 相容性]** → 已確認 Tailwind v4 的 `@theme` 將 CSS custom properties 註冊為 utility classes，`html[data-theme="dark"]` 的 CSS selector 覆寫可正確運作。

**[highlight.js CSS 可能與 Tailwind 衝突]** → highlight.js CSS 只作用於 `.hljs` class 下的 token elements，不會影響全域樣式。如有衝突可用 Tailwind 的 `@layer` 控制優先級。

**[BottomBar 移除影響測試]** → 現有 TopBar 和 App 測試引用了 BottomBar 元素，需要同步更新。使用 TDD 流程：先改測試、再改元件。

**[Input 移入 ChatView 後 Terminal tab 的行為]** → Terminal tab 不顯示 Input（本來就是），移除 BottomBar 後 Terminal tab 直接佔滿 content area，反而更乾淨。

## Open Questions

無 — 所有技術決策已確定。
