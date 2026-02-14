## Why

Copilot Agent 執行工具（建立檔案、執行 bash 指令等）後，工具執行記錄和 reasoning 推理內容在 streaming 結束後完全消失。使用者無法在對話歷史中看到 AI 實際執行了什麼操作及其結果（如巴斯卡三角形的 bash 輸出）。同時，Tailwind CSS v4 的 cascade layer 機制導致自訂 CSS reset 覆蓋了所有 Tailwind 的 padding/margin utilities，造成 UI 元素間距失效。

**目標使用者：** 使用手機瀏覽器操作 AI Terminal 的開發者（個人工具）。
**使用情境：** 透過 Copilot Agent 下達指令，需要完整查看 AI 的思考過程、工具執行過程及結果。

## What Changes

- **修復 tool records 持久化**：將 streaming 期間的 tool records 和 reasoning text 保存至 message metadata，使其在 streaming 結束後仍可在對話歷史中查看
- **合併 assistant turn**：將同一個 turn 中多個 `copilot:message` 事件合併為一筆完整的 assistant message（含 text + tools + reasoning）
- **處理 `copilot:reasoning` 完整事件**：前端目前未處理此事件，僅處理 `copilot:reasoning_delta`
- **修復 Tailwind CSS cascade layer 衝突**：將 un-layered CSS reset 移入 `@layer base`，讓 Tailwind utilities 正確覆蓋

## Non-Goals

- **不修改 backend EventRelay**：後端已正確 relay 8 種核心事件，不在此次範圍內新增更多事件 relay（如 `tool.execution_partial_result`、`subagent.*` 等）
- **不修改 backend 訊息持久化**：後端資料庫目前只存 text content，metadata 持久化屬於未來增強
- **不重新設計 streaming UX**：streaming 期間的即時顯示邏輯保持不變
- **不新增事件類型的前端渲染**：僅修復現有已 relay 但未正確持久化/處理的事件

## Capabilities

### New Capabilities

_無新增 capability_

### Modified Capabilities

- `chat-ui`: Message 渲染需支援從 metadata 中讀取並顯示 tool records 和 reasoning（MessageBlock 元件需擴展）
- `design-system`: CSS reset 需遷移至 `@layer base` 以相容 Tailwind v4 cascade layers

## Impact

- **前端狀態管理**：`store/index.ts` 新增 `turnContentSegments` 狀態用於累積 turn 內容
- **前端事件處理**：`hooks/useCopilot.ts` 核心邏輯重寫（copilot:message 改為累積、copilot:idle 改為合併打包）
- **前端元件**：`MessageBlock.tsx` 需渲染歷史 tool records 和 reasoning
- **前端樣式**：`globals.css` reset 規則移入 `@layer base`，影響所有使用 padding/margin 的元素
- **型別定義**：`api.ts` 新增 `ToolRecord` 和 `MessageMetadata` 共用型別
- **測試**：`useCopilot.test.ts` 和 `MessageBlock.test.tsx` 需更新以覆蓋新邏輯
