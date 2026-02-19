## ADDED Requirements

### Requirement: copilot:user_input_timeout WebSocket 事件

Backend SHALL 在 user input request 超時前，先廣播 `copilot:user_input_timeout` WebSocket 事件通知 frontend。

#### Scenario: 超時前廣播事件

- WHEN user input request 的 5 分鐘超時計時器到期
- THEN backend MUST 先廣播 `copilot:user_input_timeout` 事件
- AND 廣播 MUST 發生在 reject pending Promise 之前

#### Scenario: 事件 payload 格式

- WHEN backend 廣播 `copilot:user_input_timeout`
- THEN payload MUST 包含以下欄位：
  - `requestId`：原始 request 的唯一識別碼
  - `conversationId`：對應的對話 ID
  - `question`：原始問題文字
  - `choices`：原始選項陣列（若有）
  - `allowFreeform`：是否允許自由輸入（預設 true）

#### Scenario: 超時後 Promise reject

- WHEN `copilot:user_input_timeout` 事件廣播完成
- THEN backend MUST reject 對應的 pending Promise
- AND reject 的 Error message MUST 為 `'User input request timed out'`

#### Scenario: 使用者在超時前回應

- WHEN 使用者在 5 分鐘內透過 `copilot:user_input_response` 回應
- THEN 系統 MUST 取消超時計時器
- AND MUST NOT 廣播 `copilot:user_input_timeout` 事件

---

### Requirement: UserInputDialog Skip 按鈕

UserInputDialog SHALL 提供 Skip 按鈕，讓使用者可以跳過 AI 的提問，由 AI 自行決定後續行為。

#### Scenario: Skip 按鈕顯示

- WHEN UserInputDialog 開啟且 request 尚未超時
- THEN dialog MUST 顯示 Skip 按鈕
- AND 按鈕文字 MUST 使用 `t('userInput.skip')` 取得翻譯

#### Scenario: 點擊 Skip

- WHEN 使用者點擊 Skip 按鈕
- THEN frontend MUST 發送 `copilot:user_input_response`
- AND `answer` MUST 為 `"user chose to skip"` 或等效的 freeform 文字
- AND dialog MUST 關閉

#### Scenario: Skip 在超時後不可用

- WHEN UserInputDialog 處於超時狀態（`timedOut === true`）
- THEN Skip 按鈕 MUST NOT 被渲染
- AND dialog MUST 顯示超時狀態 UI

---

### Requirement: UserInputDialog 超時狀態

UserInputDialog SHALL 在收到超時事件後顯示黃色警告 banner，並提供 dismiss 按鈕。

#### Scenario: 超時狀態 UI

- WHEN `timedOut` 屬性為 `true`
- THEN dialog MUST 顯示黃色（warning）背景的 banner
- AND banner 內容 MUST 使用 `t('userInput.timedOut')` 顯示超時訊息
- AND banner MUST 包含 dismiss 按鈕

#### Scenario: Dismiss 超時提示

- WHEN 使用者點擊超時 banner 的 dismiss 按鈕
- THEN dialog MUST 關閉
- AND frontend MUST 清除該 tab 的 `userInputRequest` 狀態

#### Scenario: 超時時隱藏輸入元素

- WHEN dialog 處於超時狀態
- THEN choice buttons MUST NOT 被渲染
- AND 自由文字輸入欄位 MUST NOT 被渲染
- AND submit 按鈕 MUST NOT 被渲染
- AND 僅顯示超時 banner 和 dismiss 按鈕

---

### Requirement: UserInputRequest.timedOut 欄位

Zustand store 的 `UserInputRequest` interface SHALL 包含 `timedOut` optional boolean 欄位。

#### Scenario: 初始狀態

- WHEN 收到 `copilot:user_input_request` 事件並建立 UserInputRequest
- THEN `timedOut` MUST 為 `undefined` 或 `false`

#### Scenario: 超時後更新

- WHEN 收到 `copilot:user_input_timeout` 事件
- THEN 對應的 UserInputRequest 的 `timedOut` MUST 被設為 `true`

---

### Requirement: useTabCopilot handler — copilot:user_input_timeout

`useTabCopilot` hook SHALL 處理 `copilot:user_input_timeout` WebSocket 事件，更新 store 中的 user input request 狀態。

#### Scenario: 處理 timeout 事件

- WHEN WebSocket 收到 `copilot:user_input_timeout` 事件
- THEN handler MUST 呼叫 `setTabUserInputRequest(tabId, { requestId, question, choices, allowFreeform, timedOut: true })`
- AND store 中對應 tab 的 userInputRequest MUST 被更新為包含 `timedOut: true`

#### Scenario: Tab 不匹配

- WHEN 收到 `copilot:user_input_timeout` 事件但 conversationId 不匹配當前 tab
- THEN handler MUST 根據 conversationId 找到正確的 tab 進行更新
- AND 不影響其他 tab 的狀態

#### Scenario: 重複 timeout 事件

- WHEN 同一 requestId 收到多次 `copilot:user_input_timeout` 事件
- THEN handler MUST 冪等處理，最終狀態不變
