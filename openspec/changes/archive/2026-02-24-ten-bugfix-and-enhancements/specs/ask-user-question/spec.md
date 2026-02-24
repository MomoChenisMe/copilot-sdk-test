## MODIFIED Requirements

### Requirement: Stream subscription SHALL be synchronous with stream creation

The `StreamManager.startStream()` method SHALL accept an optional `initialSubscriber` parameter of type `SendFn`. When provided, the subscriber SHALL be added to `stream.subscribers` synchronously after the stream object is created and before any async work (session creation, `session.send()`) begins.

#### Scenario: User sends message and AskUser is triggered

- **WHEN** user sends a message via `copilot:send` that triggers an `ask_user` tool call
- **THEN** all events (deltas, tool_start, user_input_request) SHALL be forwarded to the frontend in real-time via the initialSubscriber, not only via buffer replay

#### Scenario: User responds to AskUser prompt

- **WHEN** user selects a choice and frontend sends `copilot:user_input_response`
- **THEN** the backend SHALL resolve the pending Promise and the SDK SHALL continue processing
- **AND** all subsequent events (deltas, tool calls, idle) SHALL be forwarded to the existing subscriber in real-time

### Requirement: Stale stream cleanup before new stream creation

The `copilot:send` handler SHALL check `streamManager.hasStream(conversationId)` before calling `startStream()`. If a stream exists, it SHALL call `streamManager.abortStream(conversationId)` to clean up the stale stream before creating a new one.

#### Scenario: Page refresh during active stream then send new message

- **WHEN** user refreshes the page while a stream is running (including during pending ask_user)
- **AND** user sends a new message for the same conversation
- **THEN** the old stream SHALL be aborted and cleaned up
- **AND** a new stream SHALL be created successfully without "Stream already exists" error

#### Scenario: Page refresh during active stream triggers error log

- **WHEN** user refreshes and sends a new message for a conversation with an existing stream
- **THEN** the backend SHALL NOT throw `Error('Stream already exists for conversation ...')`
- **AND** the old stream's pending user inputs SHALL be rejected with `Error('Stream aborted')`

### Requirement: StreamManager SHALL expose hasStream and removeSubscriber methods

`StreamManager` SHALL provide:
- `hasStream(conversationId: string): boolean` — returns true if a stream exists in the map
- `removeSubscriber(conversationId: string, send: SendFn): void` — removes a subscriber and pauses timeouts if no subscribers remain

#### Scenario: hasStream returns true for active stream

- **WHEN** a stream exists for conversationId "abc-123"
- **THEN** `hasStream("abc-123")` SHALL return `true`

#### Scenario: removeSubscriber cleans up correctly

- **WHEN** `removeSubscriber` is called for the last subscriber of a stream
- **THEN** the subscriber SHALL be removed from `stream.subscribers`
- **AND** pending user input timeouts SHALL be paused

### Requirement: abortStream SHALL handle non-running streams

The `abortStream()` method SHALL work for streams in any status (running, idle, error), not only `running`. After abort, the stream SHALL be removed from the `streams` Map.

#### Scenario: Abort idle stream

- **WHEN** `abortStream` is called for a stream with status `idle`
- **THEN** the stream SHALL be cleaned up and removed from the Map
- **AND** no error SHALL be thrown

### Requirement: AskUser state restoration with deferred retry

The frontend `copilot:state_response` handler SHALL implement a deferred retry mechanism. When `findTabIdByConversationId()` returns null for a pending user input, the input SHALL be stored and retried after 1 second.

#### Scenario: Browser close and reopen with pending AskUser

- **WHEN** user closes the browser while an ask_user prompt is pending
- **AND** user reopens the browser
- **THEN** the pending ask_user choices SHALL be restored and displayed in the correct tab

#### Scenario: Tab not yet loaded from localStorage

- **WHEN** `copilot:state_response` arrives before tabs are fully hydrated from localStorage
- **AND** `findTabIdByConversationId` returns null
- **THEN** the pending input SHALL be retried after 1 second
- **AND** if the tab is found on retry, the user input request SHALL be set on that tab

### Requirement: copilot:execute_plan handler SHALL use initialSubscriber

The `copilot:execute_plan` handler SHALL use the same `initialSubscriber` pattern as `copilot:send`, including stale stream cleanup.

#### Scenario: Execute plan with initialSubscriber

- **WHEN** user clicks "Execute Plan"
- **THEN** the handler SHALL pass `send` as `initialSubscriber` to `startStream`
- **AND** plan execution events SHALL be forwarded in real-time
