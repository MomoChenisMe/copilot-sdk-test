## Why

目前 Copilot 聊天介面存在 8 項 UX 問題影響日常使用體驗：技能新增後 slash command 不即時更新、下拉框不顯示使用者技能且排版擁擠、新 Tab 不自動聚焦、premium request 顯示過於侵入且依賴 streaming 事件、`/context` 顯示過於簡陋。這些問題需要統一修復以提升操作流暢度。

**目標使用者**: 單人使用的開發者，透過手機瀏覽器操控 AI 開發工具。

**使用情境**: 日常 AI 對話開發中，頻繁使用 slash command 觸發技能、切換 Tab 管理多個對話、檢視 premium quota 用量、使用 `/context` 診斷系統狀態。

## Non-Goals（非目標）

- 不重構整個 slash command 系統架構，僅修改 UI 層和資料同步
- 不新增技能編輯器的 WYSIWYG 功能
- 不實作 premium quota 的推播通知（只做主動查詢）
- 不改變 `/context` 的後端 API 結構，僅改善前端顯示
- 不調整 UsageBar 中 token/context window 的顯示邏輯

## What Changes

- **技能即時載入**: SkillsTab 操作後同步全局 Zustand store，使 slash command 下拉框立即反映變更
- **Slash command 使用者技能分區**: 下拉框區分「System Skills」和「User Skills」兩個 section
- **Slash command 雙行佈局**: 從單行壓縮改為名稱+描述雙行堆疊，解決長名稱截斷問題
- **新 Tab 自動聚焦**: 建立新 Tab 後自動 focus 輸入框
- **移除 UsageBar PR 顯示**: 從 UsageBar 折疊/展開視圖移除 premium request 相關內容
- **Premium badge 獨立顯示**: 在 UsageBar token 計數旁新增獨立的 PR badge，資料來自全局 store
- **Premium quota 主動取得**: 新增 `GET /api/copilot/quota` REST endpoint + `useQuota` hook，類似 models 的載入模式
- **`/context` 可視化卡片**: 取代純 markdown 文字，以 Claude Code CLI 風格的可視化卡片顯示

## Capabilities

### New Capabilities

- `premium-quota-api`: 獨立的 premium quota REST endpoint + 全局 store + 主動查詢 hook

### Modified Capabilities

- `slash-commands`: 新增雙行佈局、使用者技能分區、builtin 旗標
- `skills-management`: SkillsTab 操作後同步全局 Zustand store
- `usage-tracking`: 移除 UsageBar 中 PR 顯示，新增獨立 PR badge 從全局 store 讀取
- `context-command`: `/context` 顯示改為可視化卡片組件
- `chat-ui`: 新 Tab 自動聚焦輸入框

## Impact

**Frontend 修改**:
- `SlashCommandMenu.tsx` — 排版 + 分區邏輯
- `Input.tsx` — forwardRef 暴露 focus
- `ChatView.tsx` — builtin flag、auto-focus、PR badge、context handler
- `UsageBar.tsx` — 移除 PR 相關 props/渲染
- `MessageBlock.tsx` — context 訊息分支
- `SettingsPanel.tsx` — SkillsTab 全局 store 同步
- `AppShell.tsx` — 呼叫 useQuota hook
- `store/index.ts` — premiumQuota 全局 state
- 新建 `ContextCard.tsx` — 可視化卡片組件
- 新建 `useQuota.ts` — quota 主動查詢 hook
- `api.ts` — 新增 getQuota API
- i18n 檔案 — 新增翻譯鍵

**Backend 修改**:
- `stream-manager.ts` — quota 快取 + getQuota 方法
- `index.ts` — 註冊 quota 路由
