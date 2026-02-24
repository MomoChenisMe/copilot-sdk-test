## ADDED Requirements

### Requirement: WebSocket-to-Query Bridge Module

The system SHALL provide a `ws-query-bridge.ts` module that centralizes all synchronization between WebSocket events and TanStack Query cache.

#### Scenario: Module exports named bridge methods

- **WHEN** any module imports from `lib/ws-query-bridge.ts`
- **THEN** it MUST have access to named methods: `appendMessageToCache`, `updateConversationInCache`, `addConversationToCache`, `setQuotaInCache`, `invalidateConversations`, `invalidateSkills`
- **AND** all methods MUST use the global `queryClient` singleton and `queryKeys` factory

### Requirement: appendMessageToCache

The bridge SHALL append a committed message to the conversation messages cache.

#### Scenario: Append assistant message on copilot:idle

- **WHEN** `appendMessageToCache(conversationId, message)` is called
- **THEN** the message MUST be appended to the `queryKeys.conversations.messages(conversationId)` cache
- **AND** if no cache entry exists, the cache MUST be initialized with `[message]`

#### Scenario: Deduplicate messages by id

- **WHEN** `appendMessageToCache` is called with a message whose `id` already exists in the cache
- **THEN** the cache MUST NOT contain duplicate entries
- **AND** the existing entry MUST be preserved

### Requirement: updateConversationInCache

The bridge SHALL update a specific conversation's fields in the cached conversation list.

#### Scenario: Update conversation title

- **WHEN** `updateConversationInCache(id, { title })` is called
- **THEN** the matching conversation in `queryKeys.conversations.all` cache MUST be updated with the new title
- **AND** other conversations in the list MUST NOT be affected

### Requirement: addConversationToCache

The bridge SHALL prepend a new conversation to the cached conversation list.

#### Scenario: Add new conversation from WebSocket flow

- **WHEN** `addConversationToCache(conversation)` is called
- **THEN** the conversation MUST be prepended to the `queryKeys.conversations.all` cache
- **AND** if no cache entry exists, the cache MUST be initialized with `[conversation]`

### Requirement: setQuotaInCache

The bridge SHALL directly update the quota cache from WebSocket events.

#### Scenario: Update quota on copilot:quota event

- **WHEN** `setQuotaInCache(quota)` is called with `{ used, total, resetDate, unlimited }`
- **THEN** the `queryKeys.quota.all` cache MUST be updated with the new quota data
- **AND** the update MUST NOT trigger a refetch (it is a direct cache write)

### Requirement: invalidateConversations

The bridge SHALL invalidate the conversations cache to trigger a refetch.

#### Scenario: Invalidate after external change

- **WHEN** `invalidateConversations()` is called
- **THEN** `queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all })` MUST be called
- **AND** any active `useConversationsQuery` hook MUST refetch on next render

### Requirement: invalidateSkills

The bridge SHALL invalidate the skills cache to trigger a refetch.

#### Scenario: Invalidate after skill install or delete

- **WHEN** `invalidateSkills()` is called
- **THEN** `queryClient.invalidateQueries({ queryKey: queryKeys.skills.all })` MUST be called
- **AND** any active `useSkillsQuery` hook MUST refetch on next render
