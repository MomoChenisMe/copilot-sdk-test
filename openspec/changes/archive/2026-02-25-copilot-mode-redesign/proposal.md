## Why

目前專案的 Plan Mode 和 Act Mode 與 Copilot SDK 原生模式對齊不足：Act Mode 映射到 SDK 的 `interactive`（應為 `autopilot`）、Plan Mode 的自訂提示詞（PLAN_PROMPT.md）未注入 SDK system message、Plan 完成後在同一 session 上執行（應建新 session）、Fleet/Sub-agent 事件未轉發到前端、Todos 的 `onPostToolUse` hook 疑似未觸發導致前端看不到 todos。

本次重設計要讓 Plan Mode 和 Autopilot Mode 完全對齊 SDK 原生能力（`plan`、`autopilot`），加入 Fleet Mode sub-agent 事件支援，並修復 Todos 顯示問題。

## What Changes

### 模式重命名與映射

- **BREAKING** 將 Act Mode 重新命名為 Autopilot Mode（全系統，前後端）
- 內部模式型別從 `'plan' | 'act'` 改為 `'plan' | 'autopilot'`
- SDK 模式映射從 `'interactive'` 改為 `'autopilot'`
- `ACT_PROMPT.md` 重新命名為 `AUTOPILOT_PROMPT.md`（含遷移邏輯）
- `DEFAULT_ACT_PROMPT` 常數重新命名為 `DEFAULT_AUTOPILOT_PROMPT`

### Prompt Composer 雙模式注入

- Plan Mode 時注入 `PLAN_PROMPT.md`（目前未注入）
- Autopilot Mode 時注入 `AUTOPILOT_PROMPT.md`
- 所有透過 `systemMessage: { mode: 'append', content }` 傳給 SDK

### Plan → Autopilot 轉換流程

- 點擊 "Execute Plan" 後建立全新 conversation 和 SDK session
- 新 session 以 `autopilot` 模式啟動，plan.md 作為首次提示詞
- 前端 tab 切換到新 conversation（舊 plan conversation 保留）
- 新增 `copilot:plan_execution_started` WebSocket 事件

### Fleet Mode Sub-agent 支援

- 後端 EventRelay 轉發 SDK 的 `subagent.started/completed/failed/selected` 事件
- 前端新增 SubagentPanel 組件顯示 sub-agent 狀態
- Zustand store 新增 subagents 狀態管理

### Todos 修復

- 強化 `todo-sync.ts` 的 `getWorkspacePath` fallback 機制
- 加入 debug logging 追蹤 `workspacePath` 取得情況
- 修復恢復 session 時 `workspacePath` 可能為 undefined 的問題

### 前端 UI 更新

- `PlanActToggle` → `PlanAutopilotToggle` 組件重命名
- 設定面板 "Act Mode Prompt" → "Autopilot Mode Prompt"
- i18n keys 全面更新（en.json + zh-TW.json）
- API 端點 `/act-prompt` → `/autopilot-prompt`（保留舊端點別名）

## Non-Goals

- 不實作 Fleet Mode 的手動 UI 控制（由 SDK agent 自行決定何時啟用 fleet）
- 不重寫整個 todo 系統（保留現有 `onPostToolUse` hook 模式）
- 不新增 `interactive` 或 `shell` 模式支援（專注於 plan + autopilot 兩種）
- 不改變 SQLite schema（todos 表結構不變）
- 不變更認證或權限機制

## Capabilities

### New Capabilities

- `fleet-mode`: Sub-agent/Fleet 事件轉發與前端顯示，包含 SubagentPanel 組件和相關 store 狀態
- `plan-execution-transition`: Plan 完成後建立新 conversation/session 執行 autopilot 的轉換流程

### Modified Capabilities

- `copilot-agent`: 模式型別從 `'plan' | 'act'` 改為 `'plan' | 'autopilot'`，SDK 映射從 `interactive` 改為 `autopilot`，Prompt Composer 支援雙模式注入
- `system-prompts`: `ACT_PROMPT.md` → `AUTOPILOT_PROMPT.md` 重命名，新增 `/autopilot-prompt` API 端點，Composer 注入邏輯改為雙模式
- `plan-mode`: Plan Mode 時注入 PLAN_PROMPT.md 到 SDK system message（之前未注入）
- `todo-sync`: 修復 `workspacePath` fallback 機制，強化 debug logging
- `plan-execution-flow`: Execute Plan 流程從同 conversation 清除 session 改為建立新 conversation

## Impact

### 後端模組

| 模組路徑 | 影響 |
|----------|------|
| `src/copilot/stream-manager.ts` | 模式型別、SDK 映射、todo hook fallback、autopilot 啟動 |
| `src/copilot/event-relay.ts` | 新增 4 個 subagent 事件監聽 |
| `src/copilot/todo-sync.ts` | workspacePath fallback + debug logging |
| `src/ws/handlers/copilot.ts` | execute_plan 建新 conversation、set_mode 型別 |
| `src/prompts/composer.ts` | 雙模式注入邏輯 |
| `src/prompts/defaults.ts` | 常數重命名 |
| `src/prompts/file-store.ts` | 檔案遷移 ACT→AUTOPILOT |
| `src/prompts/routes.ts` | 新增 `/autopilot-prompt` 端點 |

### REST API 變更

- `GET /api/prompts/autopilot-prompt` — 讀取 autopilot 模式提示詞
- `PUT /api/prompts/autopilot-prompt` — 更新 autopilot 模式提示詞
- `POST /api/prompts/autopilot-prompt/reset` — 重設 autopilot 模式提示詞
- 保留 `/api/prompts/act-prompt` 作為向後相容別名

### WebSocket 訊息變更

- `copilot:set_mode` — mode 參數從 `'plan' | 'act'` 改為 `'plan' | 'autopilot'`
- `copilot:mode_changed` — 同上
- `copilot:plan_execution_started` — **新增**，data: `{ oldConversationId, newConversationId, title }`
- `copilot:subagent_started` — **新增**，data: `{ toolCallId, agentName, agentDisplayName, agentDescription }`
- `copilot:subagent_completed` — **新增**，data: `{ toolCallId, agentName, agentDisplayName }`
- `copilot:subagent_failed` — **新增**，data: `{ toolCallId, agentName, agentDisplayName, error }`
- `copilot:subagent_selected` — **新增**，data: `{ agentName, agentDisplayName, tools }`

### 前端元件

| 元件路徑 | 影響 |
|----------|------|
| `components/copilot/PlanActToggle.tsx` | 重命名為 `PlanAutopilotToggle.tsx` |
| `components/copilot/SubagentPanel.tsx` | **新增** |
| `components/copilot/ChatView.tsx` | 引用更新 + SubagentPanel |
| `components/settings/SettingsPanel.tsx` | Act → Autopilot |
| `hooks/useTabCopilot.ts` | 新事件處理 |
| `store/index.ts` | subagents 狀態 + mode 型別 |
| `lib/prompts-api.ts` | 新增 autopilot 端點 |
| `locales/en.json` + `zh-TW.json` | i18n 更新 |

### Zustand Store 變更

- `TabState` 新增 `subagents: SubagentItem[]`
- 新增 actions：`addTabSubagent`、`updateTabSubagent`、`clearTabSubagents`
- `copilot:mode_changed` 比對值從 `'act'` 改為 `'autopilot'`
