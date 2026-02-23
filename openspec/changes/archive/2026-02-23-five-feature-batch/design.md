## Context

本專案是一個跑在 Linux VPS 上的 AI Terminal Web 應用，使用 React 19 + Zustand 5 前端、Express 5 + TypeScript 後端。此次變更涵蓋 5 個不同層面的修復與功能新增，全部集中在前端（9 個檔案），後端 API 已就緒無需修改。

**現狀：**
- 頁簽管理使用 Zustand store 的 `closeTab` + `handleSelectTab` 分離設計，但 `handleCloseTab` 未銜接兩者
- OpenSpec 後端 `getOverview()` 已回傳 `config` 欄位，但前端未接收也未渲染
- AI/Bash 模式切換使用兩個獨立快捷鍵 Alt+Shift+A/B，Plan/Act 使用 Shift+Tab
- SDK 版本檢查後端有 3 個 REST endpoint，前端僅使用 1 個
- 技能 UI 有 "System" badge 但無 "OpenSpec" 辨識

## Goals / Non-Goals

**Goals:**
- 修復頁簽關閉後無限 Loading 的 P0 bug
- 讓使用者能在 OpenSpec 總覽看到 config.yaml 的專案說明和產出規則
- 簡化 AI/Bash 模式切換為單一 toggle 快捷鍵，且 Bash 模式下不可切換 Plan
- 讓使用者能手動檢查與執行 SDK 更新
- 讓 OpenSpec 相關技能在 UI 上有明確視覺辨識

**Non-Goals:**
- 不實作 SDK 自動更新（需後端 cron 機制）
- 不重構 tab 管理架構
- 不提供 config.yaml 線上編輯
- 不調整其他快捷鍵

## Decisions

### D1: Tab 關閉後直接呼叫 handleSelectTab

**決策：** 在 `handleCloseTab` 中，關閉 tab 後直接呼叫既有的 `handleSelectTab(newActiveTabId)` 來觸發 lazy-load。

**替代方案：** 在 store 的 `closeTab` action 內自動觸發 message loading。
**取捨：** 替代方案需要在 store 層引入 async API 呼叫（`conversationApi.getMessages`），破壞 store 的同步設計原則。直接在 component 層呼叫 `handleSelectTab` 更符合現有架構，且 `handleSelectTab` 已處理所有 side effect（lazy-load、stream subscribe、activeConversationId 設定）。

### D2: OpenSpec Overview config 用 Tab 切換卡片

**決策：** 在統計卡片下方新增帶 Tab 的卡片元件，區分「專案說明」和「產出規則」，內容用 Markdown 渲染。

**替代方案：** 簡單的 key-value 列表。
**取捨：** Tab 卡片更貼近原始截圖設計（使用者已確認偏好），且 config.yaml 的 `project_description` 和 `output_rules` 通常是多段文字，Markdown 渲染比純文字展示效果更好。複雜度稍高但使用者體驗明顯更好。

### D3: AI/Bash 用 Cmd/Ctrl+Shift+Tab toggle

**決策：** 新增 `Cmd/Ctrl+Shift+Tab` 作為 toggle 快捷鍵切換 copilot↔terminal 模式，移除舊的 Alt+Shift+A 和 Alt+Shift+B。

**替代方案 A：** 保留舊快捷鍵同時新增新的。
**取捨：** 使用者明確要求移除舊的，保留兩組快捷鍵會造成混淆且增加維護負擔。

**替代方案 B：** 用 Alt+Tab 代替。
**取捨：** Alt+Tab 是 OS 層級的視窗切換快捷鍵，會被系統攔截。Cmd/Ctrl+Shift+Tab 不衝突且語義直覺（類似瀏覽器 Tab 切換的修飾版本）。

**實作注意：** `Cmd/Ctrl+Shift+Tab` handler 必須放在 `Shift+Tab`（Plan toggle）handler **之前**，因為後者也匹配 `key === 'Tab' && shift`。更特定的條件（含 ctrlKey/metaKey）需優先判斷。

### D4: SDK 版本管理只做手動

**決策：** 前端新增「檢查更新」（GET /sdk-version）和「更新 SDK」（POST /sdk-update）按鈕，顯示版本比較。不實作自動更新。

**替代方案：** 同時實作後端 cron + 前端 auto-update toggle。
**取捨：** 後端目前無定時任務機制，實作 cron 需引入新的架構模式（定時器或 node-cron 依賴），不值得為此單一需求增加複雜度。手動操作已足夠（個人工具，使用頻率低）。

### D5: OpenSpec 技能 badge 用 name prefix 判斷

**決策：** 以 `skill.name.startsWith('openspec-')` 判斷是否為 OpenSpec 技能，顯示紫色 "OpenSpec" badge。

**替代方案：** 在 SkillItem interface 新增 `category` 欄位由後端標記。
**取捨：** 前綴判斷已是現有模式（AppShell.tsx line 199 和 SettingsPanel.tsx line 522 都使用相同邏輯），無需引入新欄位。紫色與現有藍色 "System" badge 區分明確。

## Risks / Trade-offs

**[Risk] handleSelectTab 被呼叫兩次** → 如果使用者點擊 tab 然後快速關閉其他 tab，`handleSelectTab` 可能重複觸發。**緩解：** `handleSelectTab` 內部檢查 `!tab.messagesLoaded` 才會 fetch，已有天然防護。

**[Risk] Cmd/Ctrl+Shift+Tab 可能被部分瀏覽器攔截** → 某些瀏覽器可能用此組合做 tab 切換。**緩解：** 主要使用場景是自有 VPS 上的 Web App（類似 PWA），瀏覽器預設行為可透過 `e.preventDefault()` 攔截。若真的衝突，可後續調整。

**[Risk] config.yaml 結構變化導致 UI 顯示異常** → 如果 config.yaml 欄位名稱改變，前端會找不到 `project_description` 或 `output_rules`。**緩解：** config 為 `Record<string, unknown> | null`，UI 層做 fallback 處理（欄位不存在時不顯示該 Tab）。

**[Risk] SDK update POST 可能長時間執行** → npm install 可能耗時數十秒。**緩解：** 按鈕加 loading state + disabled，防止重複點擊。
