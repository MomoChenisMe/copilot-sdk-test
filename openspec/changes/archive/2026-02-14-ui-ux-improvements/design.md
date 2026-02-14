## Context

AI Terminal 的 MVP 前端使用簡單的深色主題和基礎元件。需要全面重新設計為現代 AI Agent 聊天介面，對標 ChatGPT/Claude/Gemini 的設計語言，同時融入 Claude Code CLI 的 Agent 步驟可視化能力。

目前前端使用 Tailwind CSS v4 的 `@theme` 定義語義化色彩變數，所有元件統一引用。狀態管理使用 Zustand 單一 store。已有 lucide-react 圖示庫可用。

## Goals / Non-Goals

**Goals:**
- 全面重新設計 UI/UX，達到主流 AI 產品的視覺品質
- 融入 Agent 步驟可視化（工具呼叫 card、code diff、reasoning block）
- 建立可擴展的深淺主題系統
- 修復所有已知 bug（助手無回應、error 不可見、模型授權）
- 手機優先的響應式設計

**Non-Goals:**
- 不做 Artifacts/Canvas 分割畫面
- 不重構後端 API
- 不做自訂主題或品牌化

## Decisions

### Decision 1: 設計系統使用 Tailwind CSS v4 語義化變數

**選擇方案**：延續現有的 `@theme` 語義化變數模式，擴展色彩和間距系統。淺色預設，`html[data-theme="dark"]` 覆寫為深色。

**替代方案**：導入 shadcn/ui 元件庫。
**取捨**：專案為個人工具，元件數量有限，導入完整元件庫增加複雜度和 bundle size。自定義 Tailwind 變數足以滿足需求，且更靈活。

### Decision 2: 訊息佈局採用居中對話欄

**選擇方案**：ChatView 內使用 `max-w-3xl mx-auto` 居中對話欄，user 訊息右對齊圓角區塊，assistant 訊息全寬左對齊。

**替代方案**：全寬訊息佈局（類似 Slack）。
**取捨**：居中欄在手機上自然適配全寬，桌面上提供舒適的閱讀寬度。這是 ChatGPT/Claude/Gemini 的共同設計模式。

### Decision 3: 工具呼叫以 inline card 呈現

**選擇方案**：工具呼叫在 assistant 訊息流中以可折疊的 inline card 呈現，左側有狀態圖示（spinner/✓/✗），類似 Claude Code CLI 的 bullet-style 步驟列表。

**替代方案**：獨立的工具呼叫 panel 或 timeline view。
**取捨**：inline card 保持對話流的連貫性，使用者不需要在不同區域之間切換視線。折疊/展開機制讓詳情按需顯示。

### Decision 4: 推理過程使用可折疊區塊

**選擇方案**：推理內容以 `<details>/<summary>` 風格的可折疊區塊呈現，位於 assistant 訊息頂部。串流中顯示「Thinking...」，完成後摺疊並顯示「Thought for Xs」。

**替代方案**：始終展開的推理區塊。
**取捨**：預設折疊減少視覺干擾，使用者可按需展開。參考 ChatGPT 的 thinking duration display 模式。

### Decision 5: 主題系統使用 CSS 變數 + data-theme

**選擇方案**：`html[data-theme="dark"]` 覆寫 CSS 變數。Zustand 管理狀態，localStorage 持久化。

**替代方案**：`prefers-color-scheme` 跟隨系統。
**取捨**：手動控制更適合個人工具場景。

### Decision 6: 模型列表使用 Zustand 共享狀態

**選擇方案**：models 存入 Zustand store，`useModels` hook 載入一次。

**替代方案**：React Context。
**取捨**：統一使用 Zustand，避免混合狀態管理模式。

### Decision 7: Streaming text → message 轉換策略

**選擇方案**：前端在 `copilot:idle` 時，若未收到 `copilot:message`，自動將 `streamingText` 轉為永久 message。使用 `useRef` flag 追蹤。

**替代方案**：後端 EventRelay 在 idle 時強制發送完整 message。
**取捨**：前端方案不需修改後端 API 契約。

### Decision 8: EventRelay 防禦性屬性存取

**選擇方案**：fallback chain + debug logging。
**替代方案**：查閱 SDK 類型定義確定正確屬性名。
**取捨**：SDK 為 Technical Preview，API 可能變動。防禦性方案更穩健。

## Design System — 色彩方案

### 淺色主題（預設）
```
背景：#ffffff（primary）、#f9fafb（secondary）、#f3f4f6（tertiary）
文字：#111827（primary）、#4b5563（secondary）、#9ca3af（muted）
輸入：#ffffff（background）+ #e5e7eb（border）
Accent：#7c3aed（紫色，保持品牌一致性）
成功：#16a34a、警告：#ca8a04、錯誤：#dc2626
邊框：#e5e7eb
User 訊息背景：#f3f4f6
Code block 背景：#1e1e2e（保持深色，提高可讀性）
```

### 深色主題
```
背景：#0f172a（primary）、#1e293b（secondary）、#334155（tertiary）
文字：#f1f5f9（primary）、#94a3b8（secondary）、#64748b（muted）
輸入：#1e293b（background）+ #334155（border）
Accent：#a78bfa（淺紫色，深色背景上更突出）
成功：#22c55e、警告：#eab308、錯誤：#ef4444
邊框：#334155
User 訊息背景：#1e293b
Code block 背景：#0f172a
```

## Risks / Trade-offs

**[Risk] 全面重新設計可能引入視覺回歸**
→ Mitigation：逐元件重新設計，每完成一個元件就視覺驗證。TDD 確保功能不回歸。

**[Risk] Tailwind v4 的 `@theme` 在 dark mode override 可能需要特殊處理**
→ Mitigation：先建立最小 POC 確認 CSS 變數覆寫機制，再大規模套用。

**[Risk] SDK event 屬性名不正確**
→ Mitigation：EventRelay 加入 debug logging，runtime 確認後調整。

**[Risk] 手機上工具呼叫 card 展開後佔用過多空間**
→ Mitigation：限制展開高度，超過時加入內部捲動。

## Open Questions

- Code block 的語法高亮是否需要從 rehype-highlight 升級為 Shiki（支援更多語言和主題）？暫時保持 rehype-highlight，未來按需升級。
- 是否需要為 LoginPage 做重新設計？本次包含簡單的現代化改善（居中卡片）。
