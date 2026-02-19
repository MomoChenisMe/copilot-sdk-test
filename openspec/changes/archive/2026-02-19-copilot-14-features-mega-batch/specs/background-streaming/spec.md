## ADDED Requirements

### Requirement: Pending user input 持久化
StreamManager SHALL 在 `PendingUserInput` 結構中同時儲存 resolve/reject callback 和完整的 request metadata（requestId, question, choices, allowFreeform, multiSelect）。此 metadata MUST 可透過 `getPendingUserInputs(conversationId)` 方法取得。

#### Scenario: 儲存 request metadata
- **WHEN** SDK 觸發 `onUserInputRequest` 帶有 `{question: "Pick one", choices: ["A", "B"], multiSelect: false}`
- **THEN** StreamManager 的 `pendingUserInputRequests` Map 儲存完整的 request data 和 resolve/reject

#### Scenario: 查詢 pending inputs
- **WHEN** 呼叫 `getPendingUserInputs("conv-123")`
- **THEN** 回傳該 conversation 所有 pending input 的 metadata（不含 resolve/reject callback）

### Requirement: 狀態查詢機制
StreamManager SHALL 提供 `getFullState()` 方法，回傳所有活躍串流的狀態和所有 pending user inputs。此方法 MUST 被 `copilot:query_state` WebSocket handler 呼叫。

#### Scenario: getFullState 回傳完整狀態
- **WHEN** 有 2 個活躍串流，其中 1 個有 pending user input
- **THEN** `getFullState()` 回傳 `{activeStreams: [{conversationId, status, startedAt}, ...], pendingUserInputs: [{conversationId, requestId, question, ...}]}`

#### Scenario: 無活躍串流時
- **WHEN** 無任何活躍串流
- **THEN** `getFullState()` 回傳 `{activeStreams: [], pendingUserInputs: []}`

### Requirement: 前端重連自動 re-subscribe
前端 SHALL 在 WebSocket 重連後，根據 `copilot:state_response` 的 `activeStreams` 資訊，自動為當前 Tab 對應的活躍串流重新發送 `copilot:subscribe`。

#### Scenario: 重連恢復訂閱
- **WHEN** 前端重連，state_response 包含當前 Tab 的 conversationId 在 activeStreams 中
- **THEN** 前端自動發送 `copilot:subscribe` 訂閱該串流

#### Scenario: 重連恢復 Tab 狀態
- **WHEN** 前端重連，state_response 顯示某 conversation 正在 streaming
- **THEN** 前端更新對應 Tab 的 `isStreaming` 為 true

## MODIFIED Requirements

### Requirement: WebSocket disconnect handling
StreamManager MUST 在所有 WebSocket 連線斷開後繼續執行串流。新增行為：當 AskUser 的 pending request 處於等待中且 `subscribers.size === 0` 時，timeout 計時器 MUST 暫停（clearTimeout）。當新訂閱者加入時 MUST 重設 timeout（使用剩餘時間）。

#### Scenario: 斷線後串流繼續
- **WHEN** 所有 WebSocket 連線斷開
- **THEN** StreamManager 繼續執行串流，事件存入 eventBuffer

#### Scenario: 斷線時暫停 AskUser timeout
- **WHEN** AskUser pending request 等待中且最後一個訂閱者斷線
- **THEN** timeout 計時器暫停，記錄已消耗時間

#### Scenario: 重連時恢復 AskUser timeout
- **WHEN** 新訂閱者加入且有暫停中的 AskUser timeout
- **THEN** 使用剩餘時間（30 分鐘 - 已消耗時間）重設 timeout 計時器
