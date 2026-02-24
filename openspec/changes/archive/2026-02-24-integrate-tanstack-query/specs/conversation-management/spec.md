## MODIFIED Requirements

### Requirement: Lazy Conversation Creation

新 tab SHALL 以 draft 狀態建立，不立即呼叫 API 建立對話記錄。

#### Scenario: 新增 Tab

- **WHEN** 使用者點擊 "+" 新增 tab
- **THEN** 系統 SHALL 建立 conversationId 為 null 的 draft tab，不呼叫 conversationApi.create()

#### Scenario: 首次發送訊息

- **WHEN** 使用者在 draft tab 發送第一條訊息
- **THEN** 系統 SHALL 先呼叫 `useCreateConversation().mutate()` 建立對話
- **AND** the mutation MUST optimistically add the conversation to the TanStack Query cache

#### Scenario: Draft tab 不 persist

- **WHEN** 頁面 reload
- **THEN** draft tabs（conversationId === null）SHALL 不被還原

#### Scenario: Draft tab 關閉

- **WHEN** 使用者關閉 draft tab
- **THEN** 系統 SHALL 直接關閉，不需要 API cleanup

### Requirement: 對話刪除

使用者 SHALL 能從對話列表中刪除對話。

#### Scenario: 顯示刪除按鈕

- **WHEN** 使用者 hover 在 ConversationPopover 的對話項目上
- **THEN** SHALL 顯示刪除按鈕（Trash2 icon）

#### Scenario: 確認刪除

- **WHEN** 使用者點擊刪除按鈕
- **THEN** 系統 SHALL 顯示 inline 確認（confirm/cancel）

#### Scenario: 執行刪除

- **WHEN** 使用者確認刪除
- **THEN** 系統 SHALL 關閉相關 tab、呼叫 `useDeleteConversation().mutate(id)`
- **AND** the mutation MUST optimistically remove the conversation from the TanStack Query cache

#### Scenario: 刪除進行中串流的對話

- **WHEN** 刪除的對話正在 streaming
- **THEN** 系統 SHALL 先 abort stream 再刪除

## ADDED Requirements

### Requirement: Conversation List from TanStack Query

The conversation list SHALL be sourced from TanStack Query instead of local useState or Zustand store.

#### Scenario: ConversationPopover reads from query cache

- **WHEN** ConversationPopover renders
- **THEN** it MUST use `useConversationsQuery()` to get the conversation list
- **AND** MUST NOT read conversations from Zustand store

#### Scenario: AppShell no longer syncs conversations to store

- **WHEN** AppShell initializes
- **THEN** it MUST NOT have a `useEffect` that syncs conversations to Zustand store
- **AND** any component needing conversations MUST use `useConversationsQuery()` directly

#### Scenario: Conversation update reflects immediately

- **WHEN** a conversation is updated (e.g., title change, pin toggle)
- **THEN** the `useUpdateConversation` mutation MUST update the query cache via `setQueryData`
- **AND** all components using `useConversationsQuery()` MUST reflect the change without an explicit refetch

### Requirement: activeConversationId Derived from Tab State

The `activeConversationId` SHALL be derived from the active tab's conversation ID instead of stored independently.

#### Scenario: Active conversation derived from active tab

- **WHEN** any component needs the current conversation ID
- **THEN** it MUST derive it from `tabs[activeTabId].conversationId` in Zustand
- **AND** there MUST NOT be a separate `activeConversationId` field in the Zustand store
