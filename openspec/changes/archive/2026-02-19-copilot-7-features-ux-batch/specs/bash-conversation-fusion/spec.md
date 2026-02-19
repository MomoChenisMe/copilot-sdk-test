## ADDED Requirements

### Requirement: bash-exec handler onBashComplete callback

`createBashExecHandler` SHALL 接受 optional `onBashComplete` callback 參數，在 bash command 執行完成時呼叫，並提供累積的 stdout/stderr output。

#### Scenario: callback 簽名

- WHEN `createBashExecHandler` 被呼叫
- THEN 第二個參數 SHALL 為 optional callback，簽名為 `(command: string, output: string, exitCode: number, cwd: string) => void`

#### Scenario: 正常執行完成觸發 callback

- WHEN bash command 執行完成（child process close 事件觸發）
- THEN handler MUST 呼叫 `onBashComplete(command, accumulatedOutput, exitCode, finalCwd)`
- AND `accumulatedOutput` MUST 包含所有已累積的 stdout 和 stderr 內容

#### Scenario: Output 累積

- WHEN bash command 執行過程中持續產生 stdout/stderr output
- THEN handler MUST 將所有 stdout 和 stderr 內容累積到 `accumulatedOutput` 字串中
- AND 累積順序 MUST 按照收到 data 事件的時間順序

#### Scenario: 未提供 callback

- WHEN `createBashExecHandler` 被呼叫但未提供 `onBashComplete` callback
- THEN handler MUST 正常運作，不拋出錯誤
- AND bash 執行完成時 MUST 跳過 callback 呼叫

#### Scenario: Command 執行失敗

- WHEN bash command 執行失敗（exitCode !== 0）
- THEN handler MUST 仍然呼叫 `onBashComplete`
- AND `exitCode` MUST 反映實際的非零退出碼
- AND `accumulatedOutput` MUST 包含 stderr 內容

---

### Requirement: Copilot handler bash context 管理

Copilot handler SHALL 維護 `pendingBashContext` Map 和 `addBashContext` 方法，支援將 bash 執行結果注入下一次 AI 對話。

#### Scenario: addBashContext 方法

- WHEN 呼叫 `copilotHandler.addBashContext(conversationId, context)`
- THEN handler MUST 將 context 字串加入 `pendingBashContext` Map 中對應 conversationId 的陣列

#### Scenario: 多次 bash 結果累積

- WHEN 使用者在同一 conversation 中連續執行 3 個 bash 指令
- THEN `pendingBashContext.get(conversationId)` MUST 包含 3 個 context 項目
- AND 順序 MUST 按照 `addBashContext` 呼叫的時間順序

#### Scenario: lastConversationId getter

- WHEN copilot handler 處理過至少一次 `copilot:send` 訊息
- THEN `copilotHandler.lastConversationId` MUST 回傳最後一次處理的 conversation ID
- AND 此值用於在 bash callback 中關聯 bash 結果到正確的對話

#### Scenario: lastConversationId 初始值

- WHEN copilot handler 尚未處理任何 `copilot:send` 訊息
- THEN `copilotHandler.lastConversationId` MUST 為 `null` 或 `undefined`

---

### Requirement: copilot:send bash context 注入

Copilot handler 在處理 `copilot:send` 訊息時，SHALL 檢查 `pendingBashContext` 並將 bash 結果前綴到使用者 prompt。

#### Scenario: 注入 bash context

- WHEN handler 收到 `copilot:send` 且 `pendingBashContext` 中有該 conversation 的 context
- THEN handler MUST 將所有 pending contexts 以 `[Bash executed by user]\n{context}` 格式前綴到使用者 prompt
- AND 多個 context 之間 MUST 以 `\n\n` 分隔
- AND 原始 prompt MUST 接在所有 context 之後

#### Scenario: 注入後清除 context

- WHEN bash context 成功注入到 prompt
- THEN handler MUST 清除該 conversation 的 `pendingBashContext`（呼叫 `pendingBashContext.delete(conversationId)`）

#### Scenario: 無 pending context

- WHEN handler 收到 `copilot:send` 但 `pendingBashContext` 中無該 conversation 的 context
- THEN handler MUST 直接使用原始 prompt，不做任何修改

---

### Requirement: DB 持久化 bash 結果

系統 SHALL 將 bash 執行結果以 user message 形式儲存到對話資料庫中，附帶 `metadata.bash = true` 標記。

#### Scenario: 儲存 bash 結果

- WHEN bash command 執行完成且可關聯到有效的 conversation ID
- THEN 系統 MUST 呼叫 `repo.addMessage(conversationId, { role: 'user', content: ctx, metadata: { bash: true, exitCode, cwd } })`
- AND `content` MUST 包含 command 和 output 資訊

#### Scenario: 無法關聯 conversation

- WHEN bash command 執行完成但 `copilotHandler.lastConversationId` 為 null
- THEN 系統 MUST NOT 嘗試儲存 bash 結果
- AND MUST NOT 呼叫 `addBashContext`

---

### Requirement: 前端 !command 語法

前端 SHALL 支援在聊天輸入框中以 `!` 前綴觸發 bash command 執行。

#### Scenario: !command 偵測與路由

- WHEN 使用者在聊天輸入框輸入 `!ls -la` 並送出
- THEN 前端 MUST 偵測到 `!` 前綴
- AND 提取 `ls -la` 作為 bash command
- AND 呼叫 `handleBashSend(command)` 路由到 bash 執行
- AND MUST NOT 發送至 copilot handler

#### Scenario: 僅有 ! 前綴

- WHEN 使用者輸入 `!` 後直接送出（無實際 command）
- THEN 前端 MUST 忽略此輸入，不觸發 bash 執行

#### Scenario: 正常訊息不受影響

- WHEN 使用者輸入不以 `!` 開頭的一般文字
- THEN 前端 MUST 按照正常流程發送至 copilot handler

#### Scenario: ! 後有空白

- WHEN 使用者輸入 `!  ls`（! 與 command 間有空白）
- THEN 前端 MUST trim 後提取 `ls` 作為 command

---

### Requirement: Output 截斷

系統 SHALL 對 bash output 執行截斷，注入到 AI context 的 output 上限為 10KB。

#### Scenario: Output 超過 10KB

- WHEN bash command 的累積 output 超過 10,000 字元
- THEN 系統 MUST 截斷至前 10,000 字元
- AND 在截斷處附加 `\n...[truncated]` 標記

#### Scenario: Output 未超過限制

- WHEN bash command 的累積 output 為 5,000 字元
- THEN 系統 MUST 使用完整 output，不做截斷

#### Scenario: 截斷後的 context 格式

- WHEN output 被截斷後注入 context
- THEN context 格式 MUST 為 `$ {command}\n{truncatedOutput}\n[exit code: {exitCode}]`
