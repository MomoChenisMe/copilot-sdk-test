## ADDED Requirements

### Requirement: useModelsQuery Hook

The system SHALL provide a `useModelsQuery` hook that fetches and caches the available LLM models list.

#### Scenario: Fetch models on mount

- **WHEN** a component calls `useModelsQuery()`
- **THEN** the hook MUST fetch from `GET /api/copilot/models`
- **AND** return `{ data: ModelInfo[], isLoading, isError, error }` matching TanStack Query's standard return shape

#### Scenario: 30-minute stale time

- **WHEN** models were fetched less than 30 minutes ago
- **THEN** subsequent calls to `useModelsQuery()` MUST return cached data without a network request

#### Scenario: Validate lastSelectedModel on fetch

- **WHEN** models are successfully fetched
- **THEN** the hook MUST validate that the Zustand store's `lastSelectedModel` exists in the fetched model list
- **AND** if the saved model does not exist, it MUST update `lastSelectedModel` to the first model's id

#### Scenario: Loading state

- **WHEN** the models request is in flight
- **THEN** `isLoading` MUST be `true` and `data` MUST be `undefined`

#### Scenario: Error state

- **WHEN** the models request fails
- **THEN** `isError` MUST be `true` and `error` MUST contain the error details

### Requirement: useSkillsQuery Hook

The system SHALL provide a `useSkillsQuery` hook that fetches and caches the available skills list.

#### Scenario: Fetch skills on mount

- **WHEN** a component calls `useSkillsQuery()`
- **THEN** the hook MUST fetch from the skills API via `skillsApi.list()`
- **AND** return the `skills` array from the response

#### Scenario: Load-once caching

- **WHEN** skills have been fetched once
- **THEN** the hook MUST use `staleTime: Infinity` to prevent automatic refetching
- **AND** skills SHALL only be refetched when explicitly invalidated (e.g., after skill install/delete)

### Requirement: useSdkCommandsQuery Hook

The system SHALL provide a `useSdkCommandsQuery` hook that fetches and caches the SDK command list.

#### Scenario: Fetch SDK commands on mount

- **WHEN** a component calls `useSdkCommandsQuery()`
- **THEN** the hook MUST fetch from `copilotApi.listCommands()`
- **AND** return the commands array

#### Scenario: Load-once caching

- **WHEN** SDK commands have been fetched once
- **THEN** the hook MUST use `staleTime: Infinity` to prevent automatic refetching

### Requirement: useSettingsQuery Hook

The system SHALL provide a `useSettingsQuery` hook that fetches and caches application settings.

#### Scenario: Fetch settings on mount

- **WHEN** a component calls `useSettingsQuery()`
- **THEN** the hook MUST fetch from `settingsApi.get()`
- **AND** return the settings object

#### Scenario: 10-minute stale time

- **WHEN** settings were fetched less than 10 minutes ago
- **THEN** subsequent calls MUST return cached data without a network request

#### Scenario: Invalidation after settings change

- **WHEN** the user changes a setting via `settingsApi.patch()`
- **THEN** the calling code MUST invalidate `queryKeys.settings.all` to trigger a refetch

### Requirement: useQuotaQuery Hook

The system SHALL provide a `useQuotaQuery` hook that fetches and polls premium quota information.

#### Scenario: Fetch quota on mount

- **WHEN** a component calls `useQuotaQuery()`
- **THEN** the hook MUST fetch from `GET /api/copilot/quota`
- **AND** return the quota object (`{ used, total, resetDate, unlimited }`) or `null`

#### Scenario: 30-second polling

- **WHEN** the quota query is active
- **THEN** it MUST use `refetchInterval: 30000` to poll for updates every 30 seconds

#### Scenario: WebSocket quota update via bridge

- **WHEN** a `copilot:quota` WebSocket event arrives
- **THEN** the WebSocket bridge MUST call `queryClient.setQueryData()` to update the quota cache directly
- **AND** the next poll cycle SHALL still run normally

### Requirement: useConfigQuery Hook

The system SHALL provide config query hooks for fetching application configuration.

#### Scenario: Brave API key availability

- **WHEN** a component calls `useBraveApiKeyQuery()`
- **THEN** the hook MUST fetch from `configApi.getBraveApiKey()`
- **AND** return a boolean indicating whether the key is configured (`data.hasKey`)
- **AND** use `staleTime: Infinity` (config rarely changes)

### Requirement: useConversationsQuery Hook

The system SHALL provide a `useConversationsQuery` hook that fetches and caches the conversation list.

#### Scenario: Fetch conversations on mount

- **WHEN** a component calls `useConversationsQuery()`
- **THEN** the hook MUST fetch from `conversationApi.list()`
- **AND** return the conversations array

#### Scenario: 2-minute stale time

- **WHEN** conversations were fetched less than 2 minutes ago
- **THEN** subsequent calls MUST return cached data without a network request

#### Scenario: Search conversations

- **WHEN** a component calls `useConversationSearchQuery(query)` with a non-empty query
- **THEN** the hook MUST fetch from `conversationApi.search(query)`
- **AND** use `enabled: query.length > 0` to prevent fetching on empty query

### Requirement: Conversation Mutation Hooks

The system SHALL provide mutation hooks for conversation CRUD operations with optimistic cache updates.

#### Scenario: Create conversation

- **WHEN** `useCreateConversation().mutate({ model, cwd })` is called
- **THEN** it MUST call `conversationApi.create(model, cwd)`
- **AND** on success, prepend the new conversation to the cached list via `queryClient.setQueryData()`

#### Scenario: Update conversation

- **WHEN** `useUpdateConversation().mutate({ id, updates })` is called
- **THEN** it MUST call `conversationApi.update(id, updates)`
- **AND** on success, update the matching conversation in the cached list

#### Scenario: Delete conversation

- **WHEN** `useDeleteConversation().mutate(id)` is called
- **THEN** it MUST call `conversationApi.delete(id)`
- **AND** on success, filter the deleted conversation from the cached list

### Requirement: useMessagesQuery Hook

The system SHALL provide a `useMessagesQuery` hook that fetches and caches messages for a specific conversation.

#### Scenario: Fetch messages for a conversation

- **WHEN** a component calls `useMessagesQuery(conversationId)` with a valid conversation ID
- **THEN** the hook MUST fetch from `conversationApi.getMessages(conversationId)`
- **AND** use `queryKey: queryKeys.conversations.messages(conversationId)`

#### Scenario: Disabled when no conversation

- **WHEN** `conversationId` is `null`
- **THEN** the hook MUST use `enabled: false` to prevent fetching

#### Scenario: 5-minute stale time

- **WHEN** messages were fetched less than 5 minutes ago for a given conversation
- **THEN** subsequent calls with the same conversation ID MUST return cached data

#### Scenario: Cache hit on tab switch

- **WHEN** a user switches away from a tab and back
- **THEN** the messages MUST be served from the TanStack Query cache instantly (no loading spinner)
- **AND** a background refetch MAY occur if the data is stale
