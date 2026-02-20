## Context

Copilot 聊天介面目前有數個 UX 短板：SkillsTab 使用 `useState` 本地狀態管理技能列表而 ChatView 從 Zustand 全局 store 讀取，導致設定面板中新增技能後 slash command 不更新；slash command 下拉框單行佈局導致長技能名稱截斷、且不區分系統/使用者技能；premium quota 依賴 WebSocket streaming 事件取得，App 啟動時無資料；`/context` 顯示為簡陋的 markdown 文字。

## Goals / Non-Goals

**Goals:**

- 技能操作後 slash command 下拉框即時反映變更
- 提供清晰的技能分類（系統/使用者）和可讀的雙行佈局
- Premium quota 透過獨立 REST API 主動取得，類似 models 載入模式
- `/context` 以可視化卡片呈現，參考 Claude Code CLI 風格
- 新 Tab 自動聚焦輸入框

**Non-Goals:**

- 不重新設計整個 slash command 架構
- 不實作 quota 的 WebSocket 推播
- 不修改後端 context API 回應結構
- 不改動 UsageBar 的 token/context window 邏輯

## Decisions

### D1: SkillsTab 同步策略 — 雙寫（本地 + 全局 store）

在 SkillsTab 的每個技能操作（create/edit/delete/install）完成後，同時呼叫 `useAppStore.getState().setSkills()` 更新全局 store。

**替代方案**: 改用全局 store 取代本地 state → 需重構整個 SkillsTab 的 state 管理，改動範圍過大且易引入 regression。

**選擇理由**: 最小侵入式修改，僅新增一行 store 同步呼叫。

### D2: Slash command dropdown 分區 — 擴充 SlashCommand 介面

在 `SlashCommand` 介面新增 `builtin?: boolean` 欄位，SlashCommandMenu 依此欄位將 skill 類型拆為「系統技能」和「使用者技能」兩個 section。

**替代方案**: 新增 `type: 'system-skill' | 'user-skill'` → 改動更大，影響所有消費 SlashCommand 的地方。

**選擇理由**: 最小化介面變更，向後相容。

### D3: Premium quota API — 後端 in-memory cache + REST endpoint

在 StreamManager 新增 `quotaCache` 物件，每次 `copilot:quota` 事件更新它。新增 `GET /api/copilot/quota` endpoint 回傳 cache。前端 `useQuota` hook 在 AppShell 初始化時 fetch，每 30 秒自動刷新。

**替代方案 A**: 直接呼叫 GitHub Copilot API 查詢 quota → SDK 沒有提供獨立的 quota 查詢方法，需要自行實作 API 呼叫，且認證複雜。

**替代方案 B**: 持久化 cache 到 SQLite → 過度設計，in-memory 已足夠（server 重啟後第一次 streaming 即可重建 cache）。

**選擇理由**: 務實且簡單，利用既有的 streaming 事件資料。

### D4: ContextCard 組件 — metadata 驅動渲染

`/context` handler 將 API 回傳的原始 JSON 存入 `message.metadata.contextData`，MessageBlock 偵測 `metadata.type === 'context'` 時渲染專用 `ContextCard` 組件。

**替代方案**: 在 MessageBlock 中用特殊 markdown 語法 → 無法實現進度條等 rich UI 元素。

**選擇理由**: 清晰的關注點分離，ContextCard 負責所有可視化邏輯。

### D5: Input 自動聚焦 — forwardRef + useEffect

Input 組件透過 `forwardRef` + `useImperativeHandle` 暴露 `focus()` 方法。ChatView 在 `useEffect([tabId, messages.length])` 中偵測新 Tab（`messages.length === 0`）時呼叫 `inputRef.current?.focus()`。

**替代方案**: 在 textarea 加 `autoFocus` + key by tabId → 每次切換 Tab 都會 remount Input，丟失正在輸入的文字。

**選擇理由**: 精確控制聚焦時機，不影響既有 Tab 切換行為。

## Risks / Trade-offs

**[Risk] Quota cache 冷啟動** → App 首次啟動時 cache 為空，直到第一次 streaming 才有資料。
- Mitigation: UI 在 `premiumQuota === null` 時不渲染 badge，使用者不會看到錯誤狀態。

**[Risk] SkillsTab 雙寫一致性** → 本地 state 和全局 store 可能短暫不同步。
- Mitigation: 所有操作均先完成 API 呼叫再同步兩邊，失敗時兩邊都不更新。

**[Risk] ContextCard 資料缺失** → 後端 context API 可能因 SDK 未連線回傳 503。
- Mitigation: 保留現有錯誤處理，在 chat 中顯示 error system message。

**[Risk] Token 估算不精確** → char / 4 的粗估與實際 token 數有偏差。
- Mitigation: 在 ContextCard 中標註 "Estimated" 讓使用者知道是近似值。
