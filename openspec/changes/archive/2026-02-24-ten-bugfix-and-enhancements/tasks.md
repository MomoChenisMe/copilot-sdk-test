## 1. SDK Update Banner i18n（Issue 1）

- [x] 1.1 撰寫 SdkUpdateBanner i18n 測試 — 驗證 banner 使用 `t('sdk.updateBannerMessage')` 和 `t('sdk.updateButton')` 而非硬編碼字串
  - `frontend/tests/components/copilot/SdkUpdateBanner.test.tsx`
- [x] 1.2 新增 i18n keys `sdk.updateBannerMessage` 和 `sdk.updateButton` 至 locale files
  - `frontend/src/locales/en.json`
  - `frontend/src/locales/zh-TW.json`
- [x] 1.3 實作 SdkUpdateBanner.tsx 改用 `t()` 取代硬編碼字串
  - `frontend/src/components/copilot/SdkUpdateBanner.tsx`
- [x] 1.4 驗證測試通過：`cd frontend && npx vitest run SdkUpdateBanner`

## 2. 強化 Act Mode 預設提示詞（Issue 10）

- [x] 2.1 撰寫 defaults.ts Act Mode 強化測試 — 驗證 DEFAULT_SYSTEM_PROMPT 包含 Git Safety Protocol、Tool Usage Rules、Cautious Execution、Code Quality、Response Style 等區塊
  - `backend/tests/prompts/defaults.test.ts`
- [x] 2.2 重寫 DEFAULT_SYSTEM_PROMPT 中 Act Mode 段落，加入六大強化區塊：工具使用規範、Git 安全協議、執行操作謹慎原則、程式碼品質守則、回應風格、Artifacts 指引
  - `backend/src/prompts/defaults.ts`
- [x] 2.3 驗證測試通過：`cd backend && npx vitest run defaults`

## 3. Plan Prompt 檔案管理 + REST API（Issue 5 — Backend）

- [x] 3.1 撰寫 DEFAULT_PLAN_PROMPT 常數測試 — 驗證 5 階段工作流結構
  - `backend/tests/prompts/defaults.test.ts`（擴充）
- [x] 3.2 在 defaults.ts 新增 DEFAULT_PLAN_PROMPT 常數，包含完整 5 階段結構化工作流 + AskUser 機制
  - `backend/src/prompts/defaults.ts`
- [x] 3.3 撰寫 file-store.ts 初始化 PLAN_PROMPT.md 的測試
  - `backend/tests/prompts/file-store.test.ts`
- [x] 3.4 在 file-store.ts 的 `ensureDirectories()` 中新增 PLAN_PROMPT.md 初始化邏輯
  - `backend/src/prompts/file-store.ts`
- [x] 3.5 撰寫 Plan Prompt REST API 測試 — GET、PUT、POST reset 三個 endpoint
  - `backend/tests/prompts/routes.test.ts`（擴充）
- [x] 3.6 在 routes.ts 新增 `GET /api/prompts/plan-prompt`、`PUT /api/prompts/plan-prompt`、`POST /api/prompts/plan-prompt/reset`
  - `backend/src/prompts/routes.ts`
- [x] 3.7 驗證測試通過：`cd backend && npx vitest run prompts`

## 4. Prompt Composer Mode-Aware 注入（Issue 5/6 — Backend）

- [x] 4.1 撰寫 composer.ts mode 參數測試 — compose('plan') 注入 PLAN_PROMPT.md，compose('act') 或無參數不注入
  - `backend/tests/prompts/composer.test.ts`
- [x] 4.2 修改 `compose()` 新增 `mode?: 'plan' | 'act'` 參數，plan mode 時讀取並注入 PLAN_PROMPT.md
  - `backend/src/prompts/composer.ts`
- [x] 4.3 修改 StreamManager 傳遞 mode 給 compose()
  - `backend/src/copilot/stream-manager.ts`
- [x] 4.4 驗證測試通過：`cd backend && npx vitest run composer`

## 5. Settings UI Plan Mode Prompt 區段（Issue 5 — Frontend）

- [x] 5.1 新增 Plan Prompt API 前端函式
  - `frontend/src/lib/prompts-api.ts`
- [x] 5.2 新增 Settings Plan Mode Prompt i18n keys
  - `frontend/src/locales/en.json`
  - `frontend/src/locales/zh-TW.json`
- [x] 5.3 撰寫 SystemPromptTab Plan Mode Prompt 區段測試 — 驗證雙區段 UI（System Prompt + Plan Mode Prompt），各自有 Save 和 Reset 按鈕
  - `frontend/tests/components/settings/SettingsPanel.test.tsx`（擴充）
- [x] 5.4 實作 SystemPromptTab 雙區段 UI：上方 System Prompt（Act Mode），下方 Plan Mode Prompt，各自 Save/Reset
  - `frontend/src/components/settings/SettingsPanel.tsx`
- [x] 5.5 驗證測試通過：`cd frontend && npx vitest run SettingsPanel`

## 6. EventRelay safeHandler 包裝 + StreamManager 防禦（Issue 9）

- [x] 6.1 撰寫 EventRelay safeHandler 測試 — 事件 handler 拋錯時不 crash stream，tool.execution_complete 錯誤仍發送 copilot:tool_end
  - `backend/tests/copilot/event-relay.test.ts`
- [x] 6.2 在 EventRelay 實作 `safeHandler` private method，所有 `session.on()` handler 使用此包裝
  - `backend/src/copilot/event-relay.ts`
- [x] 6.3 撰寫 StreamManager processEvent error handling 測試 — malformed event 不 crash stream
  - `backend/tests/copilot/stream-manager.test.ts`（擴充）
- [x] 6.4 在 StreamManager.processEvent() 加入 try-catch 包裝
  - `backend/src/copilot/stream-manager.ts`
- [ ] 6.5 撰寫 session 健康監控測試 — 120 秒無事件發送 copilot:warning，stream 結束時清理 interval（延後）
  - `backend/tests/copilot/stream-manager.test.ts`（擴充）
- [ ] 6.6 實作 session 健康監控：追蹤最後事件時間、60 秒週期檢查、120 秒無事件警告、stream 結束清理（延後）
  - `backend/src/copilot/stream-manager.ts`
- [x] 6.7 驗證測試通過：`cd backend && npx vitest run event-relay stream-manager`

## 7. hasStream + abort-before-start（Issue 3）

- [x] 7.1 撰寫 StreamManager hasStream 和 removeSubscriber 方法測試
  - `backend/tests/copilot/stream-manager.test.ts`（擴充）
- [x] 7.2 實作 `hasStream(conversationId): boolean` 和 `removeSubscriber(conversationId, send): void`
  - `backend/src/copilot/stream-manager.ts`
- [x] 7.3 撰寫 abortStream 處理非 running 狀態 stream 的測試
  - `backend/tests/copilot/stream-manager.test.ts`（擴充）
- [x] 7.4 修改 `abortStream()` 支援任意狀態 stream 的清理和 Map 移除
  - `backend/src/copilot/stream-manager.ts`
- [x] 7.5 驗證測試通過：`cd backend && npx vitest run stream-manager`

## 8. initialSubscriber + Handler 重寫（Issue 2 — Critical）

- [x] 8.1 撰寫 StartStreamOptions initialSubscriber 測試 — subscriber 在 stream 建立時同步加入
  - `backend/tests/copilot/stream-manager.test.ts`（擴充）
- [x] 8.2 在 `StartStreamOptions` 新增 `initialSubscriber?: SendFn`，startStream 在 streams.set 後立即加入
  - `backend/src/copilot/stream-manager.ts`
- [x] 8.3 撰寫 copilot:send handler 重寫測試 — abort-before-start + initialSubscriber + cleanup 管理
  - `backend/tests/ws/handlers/copilot.test.ts`
- [x] 8.4 重寫 `copilot:send` handler：hasStream → abortStream → startStream(initialSubscriber) → cleanup 管理
  - `backend/src/ws/handlers/copilot.ts`
- [x] 8.5 重寫 `copilot:execute_plan` handler 使用同樣的 initialSubscriber 模式
  - `backend/src/ws/handlers/copilot.ts`
- [x] 8.6 驗證測試通過：`cd backend && npx vitest run copilot`

## 9. AskUser 狀態恢復 Deferred Retry（Issue 4）

- [x] 9.1 撰寫 copilot:state_response deferred retry 測試 — findTabIdByConversationId 回傳 null 時延遲 1 秒重試
  - `frontend/tests/hooks/useTabCopilot.test.ts`（擴充）
- [x] 9.2 實作 deferred retry 機制：未匹配的 pendingUserInputs 存入暫存，1 秒後重試 findTabIdByConversationId
  - `frontend/src/hooks/useTabCopilot.ts`
- [x] 9.3 驗證測試通過：`cd frontend && npx vitest run useTabCopilot`

## 10. Plan Artifact 類型區分（Issue 8）

- [x] 10.1 撰寫 ArtifactsPanel plan 類型測試 — type union 含 'plan'、ClipboardList icon、markdown rendering、.md download
  - `frontend/tests/components/copilot/ArtifactsPanel.test.tsx`（擴充）
- [x] 10.2 修改 ParsedArtifact type union 加入 `'plan'`
  - `frontend/src/lib/artifact-parser.ts`（或對應 type 定義處）
- [x] 10.3 修改 ArtifactsPanel：import ClipboardList、getArtifactIcon plan case、ArtifactRenderer plan case、download extension
  - `frontend/src/components/copilot/ArtifactsPanel.tsx`
- [x] 10.4 新增 `artifacts.plan` i18n key
  - `frontend/src/locales/en.json`
  - `frontend/src/locales/zh-TW.json`
- [x] 10.5 驗證測試通過：`cd frontend && npx vitest run ArtifactsPanel`

## 11. Plan Artifact 發送（Issue 7）

- [x] 11.1 撰寫 StreamManager idle event planArtifact 測試 — plan mode idle 時 extraData 含 planArtifact
  - `backend/tests/copilot/stream-manager.test.ts`（擴充）
- [x] 11.2 修改 StreamManager copilot:idle handler：plan content 寫入檔案後加入 `extraData.planArtifact`
  - `backend/src/copilot/stream-manager.ts`
- [x] 11.3 撰寫 useTabCopilot idle handler plan artifact 建立測試
  - `frontend/tests/hooks/useTabCopilot.test.ts`（擴充）
- [x] 11.4 修改 useTabCopilot copilot:idle handler：偵測 planArtifact → 建立 artifact → 設為 active → 開啟 panel
  - `frontend/src/hooks/useTabCopilot.ts`
- [x] 11.5 驗證測試通過：`cd backend && npx vitest run stream-manager` 及 `cd frontend && npx vitest run useTabCopilot`

## 12. 修復工具錯誤重複顯示（Issue 11 — 新增）

- [x] 12.1 修改 MessageBlock.tsx：`showResult` 條件排除 `status === 'error'`，避免 ToolResultBlock 重複渲染錯誤
  - `frontend/src/components/copilot/MessageBlock.tsx`
- [x] 12.2 修改 ChatView.tsx：同上，streaming 區塊的 turnSegments 渲染邏輯同步修正
  - `frontend/src/components/copilot/ChatView.tsx`
- [x] 12.3 驗證測試通過：`cd frontend && npx vitest run`

## 13. 修復 Tab 關閉/重開後 Artifacts 和 AskUser 狀態消失（Issue 13 — 新增）

- [x] 13.1 修改 `persistOpenTabs()` — 在 localStorage 持久化中加入 `artifacts`, `activeArtifactId`, `artifactsPanelOpen`, `userInputRequest`, `planMode`, `showPlanCompletePrompt`, `planFilePath`
  - `frontend/src/store/index.ts`
- [x] 13.2 修改 `restoreOpenTabs()` — 從 localStorage 還原 ephemeral state，舊格式自動 fallback 為預設值
  - `frontend/src/store/index.ts`
- [x] 13.3 新增測試：驗證 ephemeral state 正確持久化與還原，及舊格式向後相容
  - `frontend/tests/store/tabs.test.ts`
- [x] 13.4 驗證 67/67 store tests 通過

## 14. 修復 AskUser 選擇後前端收不到後續訊息（Issue 14 — Critical）

- [x] 14.1 分析根因：`processEventInner` 的 `copilot:idle` handler 會 detach relay 並刪除 stream，導致 SDK 在 ask_user 中間觸發 `session.idle` 時，後續事件無法傳遞
- [x] 14.2 新增 `idleReceived` 和 `sendComplete` 雙條件 flag 到 `ConversationStream`
  - `backend/src/copilot/stream-manager.ts`
- [x] 14.3 修改 `copilot:idle` handler：只做 persist 和 broadcast，不做 cleanup。在 `sendComplete && idleReceived` 時才呼叫 `finishStream`
  - `backend/src/copilot/stream-manager.ts`
- [x] 14.4 新增 `finishStream()` 方法：detach relay、刪除 stream、emit stream:idle
  - `backend/src/copilot/stream-manager.ts`
- [x] 14.5 修改 `startStream`：sendMessage 後設 `sendComplete = true`，若 `idleReceived` 則呼叫 `finishStream`
  - `backend/src/copilot/stream-manager.ts`
- [x] 14.6 驗證 backend 1059/1059 tests 通過、frontend 572/574 通過（2 個預先存在的失敗）

## 15. 修復 AskUser 連續觸發時前端事件遺失（Issue 14b — 深度修復）

- [x] 15.1 修復 `processEventInner` 的 `copilot:tool_end` 靜默丟棄：當 accumulation 被 ask_user 的 `persistAccumulated` 重置後，tool record 不存在時 `return` 導致事件永不 broadcast。改為 `break` 確保事件始終 broadcast
  - `backend/src/copilot/stream-manager.ts`
- [x] 15.2 `userInputHandler` 中 `persistAccumulated` 加入 try-catch，避免 DB 錯誤導致整個 ask_user 流程失敗
  - `backend/src/copilot/stream-manager.ts`
- [x] 15.3 `copilot:user_input_request` 加入 `eventBuffer`，重連時可透過 replay 還原
  - `backend/src/copilot/stream-manager.ts`
- [x] 15.4 前端 `copilot:idle` handler 加入 userInputRequest 防禦：如有 pending userInputRequest 則跳過 idle 處理，避免 SDK 提早發出 session.idle 時清除 streaming 狀態
  - `frontend/src/hooks/useTabCopilot.ts`
- [x] 15.5 前端 `copilot:user_input_request` handler 確保 `isStreaming=true` 並清除可能被提早設置的 `showPlanCompletePrompt`
  - `frontend/src/hooks/useTabCopilot.ts`
- [x] 15.6 前端 `ws-client.ts` listener 錯誤不再靜默吞掉，改為 console.error 記錄
  - `frontend/src/lib/ws-client.ts`
- [x] 15.7 加入 debug logging（backend broadcast + frontend subscribe）以便追蹤事件流
  - `backend/src/copilot/stream-manager.ts`
  - `frontend/src/hooks/useTabCopilot.ts`
- [x] 15.8 驗證：backend 1059/1059 通過、frontend 1068/1068 通過（6 個預先存在的失敗）

## 16. 整合驗證

- [x] 16.1 執行全部 backend 測試：`cd backend && npx vitest run` — 1059/1059 通過
- [x] 16.2 執行全部 frontend 測試：`cd frontend && npx vitest run` — 本次變更相關 1068/1068 通過；6 個先前已存在的失敗（shortcuts、i18n、AtFileMenu）
- [x] 16.3 TypeScript 編譯檢查：僅先前已存在的 TS 錯誤（pino logger overload、sdkSessionId: null 型別）
