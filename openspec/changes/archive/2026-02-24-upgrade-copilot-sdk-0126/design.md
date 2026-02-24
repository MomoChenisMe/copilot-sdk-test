## Context

專案目前使用 `@github/copilot-sdk` 0.1.25。SDK 0.1.26 新增了：
1. `approveAll` — 內建的 `PermissionHandler`，等同於專案自定義的 `autoApprovePermission`
2. `clientName` — session config 新增可選欄位，標識應用程式身份（寫入 User-Agent header）
3. `requestPermission` 改為恆定 `true`（不影響專案，因為我們一律提供 `onPermissionRequest`）

目前 `permission.ts` 中的 `autoApprovePermission` 與 SDK 的 `approveAll` 實作完全一致：`() => ({ kind: 'approved' })`。

## Goals / Non-Goals

**Goals:**

- 升級 SDK 至 0.1.26，採用 `approveAll` 取代自定義實作
- 在所有 session 建立路徑加入 `clientName: 'codeforge'` 以利 API 追蹤
- 更新對應測試

**Non-Goals:**

- 不變更 `createPermissionHandler`（它有 plan mode 的條件判斷邏輯，非單純 approve-all）
- 不變更 event-relay、stream-manager 的事件處理邏輯
- 不引入 `reasoning_effort` 等其他 0.1.26 新功能

## Decisions

### Decision 1: 使用 re-export 而非直接 import

`permission.ts` 改為 `export { approveAll } from '@github/copilot-sdk'`，而非讓 `session-manager.ts` 直接從 SDK import。

- **選擇理由**: 維持 `permission.ts` 作為權限相關功能的統一入口，`session-manager.ts` 無需關心權限 handler 的來源
- **替代方案**: `session-manager.ts` 直接 `import { approveAll } from '@github/copilot-sdk'` — 更簡單但破壞了模組封裝，使 permission 相關邏輯分散在兩個模組

### Decision 2: hardcode `clientName: 'codeforge'`

直接在 `session-manager.ts` 的 config 中硬編碼 `clientName: 'codeforge'`。

- **選擇理由**: 應用程式名稱是穩定的常量，不需要可配置性
- **替代方案**: 透過 `CreateSessionOptions` 接口傳入 — 過度工程，個人工具不需要

### Decision 3: 在 `llm-caller.ts` 也加上 `clientName`

Memory LLM caller 使用獨立的一次性 session，也應帶上 `clientName` 以利識別。

- **選擇理由**: 確保所有 API 請求都能被追蹤
- **替代方案**: 僅在主要 session 路徑加 — 會造成部分請求無法被識別

## Risks / Trade-offs

- **[風險] SDK `approveAll` 簽名不匹配** → 已驗證：SDK 的 `approveAll` 型別為 `PermissionHandler`（接受 `(request, invocation)` 參數），與現有使用方式完全相容。緩解：測試會驗證回傳值。
- **[風險] `requestPermission: true` 硬編碼行為變更** → 已驗證：專案所有路徑都提供 `onPermissionRequest`，SDK 的行為變更對專案無影響。
- **[取捨] 移除自定義函式增加 SDK 耦合** → 可接受：`approveAll` 是穩定的 trivial 函式，即使未來 SDK 移除也容易重新實作。
