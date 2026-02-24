## Why

`@github/copilot-sdk` 0.1.26 已釋出，包含內建 `approveAll` 權限 handler 與 `clientName` 會話識別欄位。目前專案使用 0.1.25，自行實作了與 SDK 新增 `approveAll` 功能完全相同的 `autoApprovePermission`。升級可減少自定義程式碼，並透過 `clientName` 改善 API 請求追蹤能力。

目標使用者：開發者（個人使用），在升級後獲得更乾淨的程式碼與更好的 debug 能力。

## What Changes

- 升級 `@github/copilot-sdk` 從 `^0.1.25` → `^0.1.26`
- 移除自定義 `autoApprovePermission` 函式，改用 SDK 內建 `approveAll`
- 在 session 建立/恢復時傳入 `clientName: 'codeforge'` 以標識應用程式
- 更新對應的測試以反映 API 命名變更

## Non-Goals

- 不涉及 SDK 事件格式或串流處理的變更（event-relay、stream-manager 無需修改）
- 不新增任何 REST API 端點或 WebSocket 訊息類型
- 不涉及前端或 SQLite schema 變更
- 不處理 Bun 相容性（專案使用 Node.js）

## Capabilities

### New Capabilities

（無新增能力 — 此為純升級與程式碼簡化）

### Modified Capabilities

- `copilot-agent`: 權限 handler 改用 SDK 內建 `approveAll`，session config 新增 `clientName` 欄位

## Impact

- **影響模組**: `src/copilot/`（permission.ts、session-manager.ts）、`src/memory/`（llm-caller.ts）
- **依賴變更**: `@github/copilot-sdk` `^0.1.25` → `^0.1.26`（內部依賴 `@github/copilot` `^0.0.411` → `^0.0.414`）
- **風險等級**: LOW — 所有 SDK 變更皆為 additive，無 breaking changes
- **測試影響**: 2 個測試檔案需更新命名 + 新增 2 個 `clientName` 測試
