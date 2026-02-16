## ADDED Requirements

### Requirement: 第一條訊息自動命名對話
系統 SHALL 在使用者發送對話的第一條訊息時，自動截取訊息內容前 50 字元作為對話標題。

#### Scenario: 首條訊息觸發自動命名
- **WHEN** 使用者在一個全新對話中發送第一條訊息（`tab.messages.length === 0`）
- **THEN** 系統 SHALL 截取 prompt 文字的前 50 字元作為對話標題
- **AND** 呼叫 `PATCH /api/conversations/:id` 更新後端標題
- **AND** 呼叫 `updateTabTitle(tabId, title)` 更新前端 tab 標題

#### Scenario: 標題長度處理
- **WHEN** 第一條訊息長度超過 50 字元
- **THEN** 標題截取前 50 字元，不加省略號

#### Scenario: 短訊息命名
- **WHEN** 第一條訊息為 「Hello」
- **THEN** 對話標題設為 「Hello」

#### Scenario: 空白訊息 fallback
- **WHEN** 第一條訊息的前 50 字元 trim 後為空字串
- **THEN** 對話標題設為預設值 「New Chat」

#### Scenario: 非第一條訊息不觸發
- **WHEN** 對話已有歷史訊息（`tab.messages.length > 0`），使用者發送新訊息
- **THEN** 系統 SHALL NOT 修改對話標題

#### Scenario: Tab 標題同步更新
- **WHEN** 自動命名觸發成功
- **THEN** TabBar 中對應 tab 的顯示標題 MUST 立即更新為新標題
- **AND** ConversationPopover 中的對話列表標題也 MUST 反映更新
