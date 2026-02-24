## ADDED Requirements

### Requirement: QueryClient Configuration

The system SHALL provide a global QueryClient instance with sensible defaults for the CodeForge application.

#### Scenario: QueryClient default options

- **WHEN** the application initializes
- **THEN** the QueryClient MUST be configured with `staleTime: 300000` (5 minutes), `gcTime: 1800000` (30 minutes), `retry: 1` for queries
- **AND** mutations MUST have `retry: 0`
- **AND** `refetchOnWindowFocus` MUST be `true`
- **AND** `refetchOnReconnect` MUST be `true`

#### Scenario: QueryClient exported as singleton

- **WHEN** any module imports from `lib/query-client.ts`
- **THEN** it MUST receive the same QueryClient instance
- **AND** the instance MUST be usable outside the React component tree (e.g., in WebSocket handlers)

### Requirement: QueryClientProvider Integration

The application SHALL wrap the React tree with QueryClientProvider at the root level.

#### Scenario: Provider placement in main.tsx

- **WHEN** the application renders
- **THEN** `QueryClientProvider` MUST wrap `<App />` inside `<StrictMode>`
- **AND** it MUST use the singleton QueryClient from `lib/query-client.ts`

#### Scenario: React Query Devtools in development

- **WHEN** the application runs in development mode
- **THEN** React Query Devtools MUST be available for debugging query states
- **AND** it MUST NOT be included in production builds

### Requirement: Centralized Query Key Factory

The system SHALL provide a centralized query key factory for type-safe, consistent query keys.

#### Scenario: Static query keys

- **WHEN** a query hook needs a key for a static resource (models, skills, settings, quota)
- **THEN** it MUST use the corresponding key from `queryKeys` (e.g., `queryKeys.models.all`, `queryKeys.skills.all`)
- **AND** each key MUST be a readonly tuple (`as const`)

#### Scenario: Dynamic query keys for conversations

- **WHEN** a query hook needs a key for a conversation-specific resource
- **THEN** it MUST use `queryKeys.conversations.detail(id)` for a single conversation
- **AND** `queryKeys.conversations.messages(id)` for conversation messages
- **AND** `queryKeys.conversations.search(query)` for search results
- **AND** each function MUST return a readonly tuple containing the parameter

#### Scenario: Key consistency across hooks and bridge

- **WHEN** the WebSocket bridge invalidates or updates a query
- **THEN** it MUST use the same keys from `queryKeys` as the corresponding query hooks
- **AND** no query key strings SHALL be hardcoded outside of `query-keys.ts`

### Requirement: Test Query Wrapper

The system SHALL provide a test utility for wrapping components and hooks with QueryClientProvider in tests.

#### Scenario: createTestQueryClient configuration

- **WHEN** a test creates a QueryClient via `createTestQueryClient()`
- **THEN** the client MUST have `retry: false` for queries to prevent flaky tests
- **AND** `gcTime: 0` to prevent cache leaking between tests

#### Scenario: createWrapper usage in renderHook

- **WHEN** a test renders a query hook via `renderHook`
- **THEN** it MUST use `createWrapper()` as the wrapper option
- **AND** each test invocation of `createWrapper()` MUST return a new QueryClient instance to ensure test isolation
