## 1. SDK 版本升級

- [x] 1.1 在 `backend/package.json` 將 `@github/copilot-sdk` 從 `^0.1.25` 改為 `^0.1.26`，執行 `npm install` 更新 lock file
- [x] 1.2 驗證 TypeScript 編譯通過：`npm run build -w backend`（既有 TS 錯誤非 SDK 相關）

## 2. 替換 autoApprovePermission 為 SDK approveAll（TDD）

- [x] 2.1 更新 `backend/tests/copilot/permission.test.ts`：import 改為 `approveAll`，describe block 改名，所有 6 個測試呼叫改為 `approveAll(...)`
- [x] 2.2 修改 `backend/src/copilot/permission.ts`：移除 `autoApprovePermission` 函式，新增 `export { approveAll } from '@github/copilot-sdk'`
- [x] 2.3 更新 `backend/tests/copilot/session-manager.test.ts`：將 2 個包含 `autoApprovePermission` 的測試名稱和註解改為 `approveAll`
- [x] 2.4 修改 `backend/src/copilot/session-manager.ts`：import 改為 `approveAll`，兩處 `?? autoApprovePermission` 改為 `?? approveAll`
- [x] 2.5 執行測試驗證：`npm test --workspace=backend -- --run tests/copilot/permission.test.ts tests/copilot/session-manager.test.ts`

## 3. 新增 clientName 會話識別（TDD）

- [x] 3.1 在 `backend/tests/copilot/session-manager.test.ts` 新增 2 個測試：`createSession` 和 `resumeSession` 的 config 中包含 `clientName: 'codeforge'`
- [x] 3.2 修改 `backend/src/copilot/session-manager.ts`：在 `createSession()` 和 `resumeSession()` 的 config 中加入 `clientName: 'codeforge'`
- [x] 3.3 修改 `backend/src/memory/llm-caller.ts`：在一次性 session config 中加入 `clientName: 'codeforge'`
- [x] 3.4 執行測試驗證：`npm test --workspace=backend -- --run tests/copilot/session-manager.test.ts`

## 4. 全面驗證

- [x] 4.1 執行全部 backend 測試：`npm test --workspace=backend`
- [x] 4.2 驗證 TypeScript 編譯通過：`npm run build -w backend`（既有 TS 錯誤非 SDK 相關）
