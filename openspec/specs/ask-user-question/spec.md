## ADDED Requirements

### Requirement: User input request relay

當 SDK 觸發 `onUserInputRequest` 時，backend SHALL 將問題透過 `copilot:user_input_request` WebSocket message 轉發至 frontend。

#### Scenario: SDK 觸發 user input request 時轉發至 frontend

- WHEN SDK 的 `onUserInputRequest` callback 被觸發
- THEN backend SHALL 發送 `copilot:user_input_request` WebSocket message 至對應的 frontend client
- AND message 內容 SHALL 包含 SDK 提供的 question 及相關參數

#### Scenario: Request 包含完整資訊

- WHEN backend 發送 `copilot:user_input_request` message
- THEN message payload SHALL 包含從 SDK callback 取得的所有必要欄位
- AND frontend 能根據此 payload 正確渲染 UI

---

### Requirement: User input response bridge

Frontend SHALL 透過 `copilot:user_input_response` 回應使用者輸入，backend SHALL 解析該 response 並 resolve 對應的 pending Promise。

#### Scenario: Frontend 回應使用者輸入

- WHEN 使用者在 modal dialog 中提供回答
- THEN frontend SHALL 發送 `copilot:user_input_response` WebSocket message
- AND message SHALL 包含 `requestId` 與使用者的 `answer`
- AND backend SHALL 使用該 answer resolve 對應的 pending Promise
- AND SDK stream 繼續執行

#### Scenario: Response 正確匹配 request

- WHEN backend 收到 `copilot:user_input_response`
- THEN backend SHALL 根據 `requestId` 找到對應的 pending Promise
- AND 使用該 response 的 answer 來 resolve Promise
- AND 若 `requestId` 不匹配任何 pending request，SHALL 忽略該 response

---

### Requirement: Request format

`copilot:user_input_request` message SHALL 包含 `requestId`、`question`、optional `choices` array、以及 optional `allowFreeform` boolean。

#### Scenario: 包含所有必要欄位的 request

- WHEN backend 發送 `copilot:user_input_request`
- THEN payload MUST 包含 `requestId`（unique string identifier）
- AND payload MUST 包含 `question`（string，顯示給使用者的問題）
- AND payload 可選包含 `choices`（string array，預設選項清單）
- AND payload 可選包含 `allowFreeform`（boolean，是否允許自由文字輸入）

#### Scenario: 僅有 question 無 choices 的 request

- WHEN SDK request 未提供 choices
- THEN `choices` 欄位 SHALL 為 undefined 或空 array
- AND `allowFreeform` SHALL 預設為 `true`
- AND frontend SHALL 僅顯示自由文字輸入欄位

---

### Requirement: Modal dialog

Frontend SHALL 顯示一個不可關閉的 modal dialog，呈現問題、choice buttons（若有提供 choices）、以及自由文字輸入欄位（若 `allowFreeform` 為 true）。

#### Scenario: 顯示包含 choices 的 modal dialog

- WHEN frontend 收到 `copilot:user_input_request` 且 `choices` 非空
- THEN SHALL 顯示一個 modal dialog
- AND dialog SHALL 顯示 `question` 文字
- AND dialog SHALL 為每個 choice 顯示一個可點擊的 button
- AND dialog SHALL 不可透過點擊外部區域或按 Escape 關閉

#### Scenario: 顯示包含自由文字輸入的 modal dialog

- WHEN frontend 收到 `copilot:user_input_request` 且 `allowFreeform` 為 `true`
- THEN dialog SHALL 包含一個 text input 欄位
- AND 使用者可輸入自由文字作為回答
- AND SHALL 提供 submit button 送出回答

#### Scenario: 使用者透過 choice button 回答

- WHEN 使用者點擊一個 choice button
- THEN frontend SHALL 立即發送 `copilot:user_input_response`，answer 為所選的 choice 值
- AND modal dialog SHALL 關閉

#### Scenario: 使用者透過自由文字回答

- WHEN 使用者在 text input 中輸入文字並點擊 submit
- THEN frontend SHALL 發送 `copilot:user_input_response`，answer 為輸入的文字
- AND modal dialog SHALL 關閉

---

### Requirement: Timeout handling

若在 5 分鐘內未收到 response，pending request SHALL 被 reject，stream 以 error 繼續執行。

#### Scenario: Request 超時

- WHEN `copilot:user_input_request` 已發送
- AND 超過 5 分鐘（300 秒）未收到 `copilot:user_input_response`
- THEN backend SHALL reject 對應的 pending Promise
- AND SDK stream SHALL 以 timeout error 繼續執行
- AND frontend 的 modal dialog SHALL 自動關閉（若仍開啟）

#### Scenario: 在 timeout 前回應

- WHEN 使用者在 5 分鐘內回應
- THEN timeout timer SHALL 被取消
- AND response 正常處理

---

### Requirement: Cleanup on abort

若 stream 在 user input request pending 時被中斷，所有 pending requests SHALL 被 reject。

#### Scenario: Stream abort 時清理 pending requests

- WHEN SDK stream 被使用者中斷（abort）
- AND 有一個 user input request 正在 pending
- THEN 該 pending request SHALL 被 reject
- AND frontend 的 modal dialog SHALL 關閉
- AND timeout timer SHALL 被清除

#### Scenario: 正常結束時無需清理

- WHEN SDK stream 正常完成
- AND 沒有 pending 的 user input request
- THEN 不需要進行額外清理操作

---

### Requirement: Waiting indicator

當 modal dialog 開啟時，chat 區域 SHALL 顯示 "waiting for response" indicator。

#### Scenario: 顯示等待指示

- WHEN user input request modal dialog 開啟
- THEN chat message 區域 SHALL 顯示一個 "waiting for response" indicator
- AND indicator SHALL 明確告知使用者系統正在等待輸入

#### Scenario: 回應後移除等待指示

- WHEN 使用者提供回答並關閉 modal dialog
- THEN "waiting for response" indicator SHALL 從 chat 區域移除
- AND chat 恢復正常顯示

---

### Requirement: Multiple requests

系統 SHALL 支援每個 stream 中 sequential（非 concurrent）的 user input requests。

#### Scenario: Sequential user input requests

- WHEN SDK 在同一 stream 中觸發第二個 `onUserInputRequest`
- AND 第一個 request 已被回應
- THEN 第二個 request SHALL 正常被處理
- AND 新的 modal dialog SHALL 顯示第二個問題

#### Scenario: 不支援 concurrent requests

- WHEN 第一個 user input request 尚在 pending
- AND SDK 觸發第二個 `onUserInputRequest`
- THEN 系統 MUST 依序處理，不可同時顯示兩個 modal dialog
- AND 第二個 request SHALL 在第一個完成後才被處理
