## 1. Fix Tailwind CSS Cascade Layer

- [x] 1.1 將 `globals.css` 中的 CSS reset（`*`、`html, body, #root`、`body` 規則）包裹於 `@layer base {}` 中
- [x] 1.2 驗證 Tailwind utilities（`px-4`、`py-3`、`mb-6` 等）在瀏覽器 DevTools 中正確生效

## 2. 共用型別定義

- [x] 2.1 撰寫 `ToolRecord` 和 `MessageMetadata` 型別的單元測試（驗證型別 export 和 re-export）
- [x] 2.2 在 `frontend/src/lib/api.ts` 新增 `ToolRecord` 和 `MessageMetadata` interface 定義
- [x] 2.3 修改 `frontend/src/store/index.ts`：移除本地 `ToolRecord` interface，改為從 `api.ts` import 並 re-export
- [x] 2.4 執行 `tsc --noEmit` 確認所有既有 import 無破壞

## 3. Store Turn 累積狀態

- [x] 3.1 撰寫 `turnContentSegments` 相關測試：`addTurnContentSegment` 累積、`clearStreaming` 清除、`setActiveConversationId` 重置
- [x] 3.2 在 `frontend/src/store/index.ts` 實作：新增 `turnContentSegments: string[]` state 和 `addTurnContentSegment` action
- [x] 3.3 更新 `clearStreaming()` 和 `setActiveConversationId()` 以同時重置 `turnContentSegments`
- [x] 3.4 執行測試驗證 store 狀態變更正確

## 4. useCopilot 事件處理重寫

- [x] 4.1 撰寫 `copilot:message` 累積行為測試：content 推入 `turnContentSegments` 而非建立永久 message，空 content 被忽略，`streamingText` 被清除
- [x] 4.2 撰寫 `copilot:reasoning` 完整事件 fallback 測試：空 reasoningText 時使用 complete event content，已有 reasoningText 時忽略
- [x] 4.3 撰寫 `copilot:idle` turn 合併測試：多個 segments 合併為單一 message、metadata 含 toolRecords 和 reasoning、無內容無 metadata 時不建立 message、僅有 streamingText 的 fallback
- [x] 4.4 重寫 `copilot:message` handler：推入 `turnContentSegments`、清除 `streamingText`、設定 `receivedMessageRef`
- [x] 4.5 新增 `copilot:reasoning` handler：作為 delta 的 fallback
- [x] 4.6 重寫 `copilot:idle` handler：合併 segments → 建立含 metadata 的 message → `clearStreaming()`
- [x] 4.7 更新 `useEffect` dependency array 加入 `addTurnContentSegment`
- [x] 4.8 執行所有 `useCopilot.test.ts` 測試確認通過

## 5. MessageBlock 歷史訊息渲染

- [x] 5.1 撰寫 MessageBlock 測試：助手訊息含 `metadata.toolRecords` 時渲染 ToolRecord 元件
- [x] 5.2 撰寫 MessageBlock 測試：助手訊息含 `metadata.reasoning` 時渲染 ReasoningBlock 元件
- [x] 5.3 撰寫 MessageBlock 測試：`metadata` 為 `null` 時不渲染 ToolRecord 和 ReasoningBlock
- [x] 5.4 撰寫 MessageBlock 測試：content 為空但有 metadata 時仍渲染 tool records
- [x] 5.5 修改 `MessageBlock.tsx`：import `ReasoningBlock` 和 `ToolRecord` 元件，解析 `message.metadata`
- [x] 5.6 實作助手訊息渲染：Reasoning → Tool Records → Text Content 順序
- [x] 5.7 執行所有 `MessageBlock.test.tsx` 測試確認通過

## 6. 整合驗證

- [x] 6.1 執行 `npx vitest run` 確認所有前端測試通過
- [x] 6.2 執行 `npm run build` 確認 production build 成功
- [x] 6.3 啟動 dev server，在瀏覽器中驗證 Tailwind padding/margin 正確生效
- [x] 6.4 發送觸發工具呼叫的訊息，驗證 streaming 期間工具記錄即時顯示
- [x] 6.5 驗證 streaming 結束後 tool records 和 reasoning 持久化於對話歷史中
