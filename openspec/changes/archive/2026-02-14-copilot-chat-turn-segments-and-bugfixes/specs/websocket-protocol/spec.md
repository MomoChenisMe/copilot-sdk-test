## MODIFIED Requirements

### Requirement: 訊息路由

系統 SHALL 根據 WebSocket 訊息的 `type` 前綴分派到對應的 handler。copilot handler MUST 使用 accumulatingSend 取代 wrappedSend 來處理事件累積和持久化。

#### Scenario: Copilot 訊息路由

- **WHEN** 收到 type 以 `copilot:` 開頭的訊息
- **THEN** 系統 MUST 將訊息分派到 copilot handler 處理

#### Scenario: Terminal 訊息路由

- **WHEN** 收到 type 以 `terminal:` 開頭的訊息
- **THEN** 系統 MUST 將訊息分派到 terminal handler 處理

#### Scenario: 未知訊息類型

- **WHEN** 收到無法識別的 type
- **THEN** 系統 MUST 發送 `error` 訊息回客戶端，包含錯誤描述

## ADDED Requirements

### Requirement: Copilot Handler 事件累積策略

copilot handler MUST 使用 `accumulatingSend` 包裝器取代現有的 `wrappedSend`，在 turn 期間累積事件，在 `session.idle` 時持久化。

#### Scenario: accumulatingSend 建立

- **WHEN** 收到 `copilot:send` 訊息
- **THEN** handler MUST 建立 `accumulatingSend` 包裝器，此包裝器 MUST：
  1. 攔截所有事件進行累積
  2. 在累積之後將事件轉發到前端（呼叫原始 `send`）

#### Scenario: 累積 copilot:message

- **WHEN** accumulatingSend 接收到 `copilot:message` 事件
- **THEN** 系統 MUST 將 content 推入 `turnContentSegments` 和 `turnSegments`

#### Scenario: 累積 copilot:tool_start

- **WHEN** accumulatingSend 接收到 `copilot:tool_start` 事件
- **THEN** 系統 MUST 將 tool record 推入 `turnToolRecords` 和 `turnSegments`

#### Scenario: 累積 copilot:tool_end

- **WHEN** accumulatingSend 接收到 `copilot:tool_end` 事件
- **THEN** 系統 MUST 更新 `turnToolRecords` 和 `turnSegments` 中對應的 tool record

#### Scenario: 累積 copilot:reasoning

- **WHEN** accumulatingSend 接收到 `copilot:reasoning_delta` 或 `copilot:reasoning` 事件
- **THEN** 系統 MUST 累積 reasoning text

#### Scenario: copilot:idle 觸發持久化

- **WHEN** accumulatingSend 接收到 `copilot:idle` 事件
- **THEN** 系統 MUST：
  1. 合併 `turnContentSegments` 為 content
  2. 組裝 metadata（turnSegments、toolRecords、reasoning）
  3. 呼叫 `repo.addMessage()` 存入 DB
  4. 重設所有累積狀態
  5. 轉發 idle 事件到前端

#### Scenario: copilot:send 重設累積

- **WHEN** 收到新的 `copilot:send` 訊息
- **THEN** handler MUST 在處理新訊息前重設所有累積狀態（turnContentSegments、turnToolRecords、turnReasoningText、turnSegments）

#### Scenario: copilot:abort 保存

- **WHEN** 收到 `copilot:abort` 且有累積內容
- **THEN** handler MUST 先保存已累積的 turn 內容到 DB，再執行中止操作
