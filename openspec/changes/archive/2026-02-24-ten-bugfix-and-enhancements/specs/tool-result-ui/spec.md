## MODIFIED Requirements

### Requirement: EventRelay safe handler wrapper

The `EventRelay` class SHALL implement a `safeHandler` private method that wraps event callbacks in try-catch. All `session.on()` registrations SHALL use this wrapper.

For `tool.execution_complete`, if the handler throws, it SHALL still emit a `copilot:tool_end` event with `success: false` and a descriptive error message.

#### Scenario: SDK event handler throws unhandled error

- **WHEN** a `tool.execution_complete` event triggers an internal error (e.g., `Cannot read properties of undefined (reading 'map')`)
- **THEN** the error SHALL be caught by safeHandler
- **AND** the error SHALL be logged via `log.error`
- **AND** a `copilot:tool_end` event SHALL be emitted with `success: false` and error message
- **AND** the stream SHALL NOT be interrupted

#### Scenario: Non-tool event handler throws

- **WHEN** any event handler (e.g., `assistant.message_delta`, `assistant.usage`) throws
- **THEN** the error SHALL be caught and logged
- **AND** the stream SHALL continue processing subsequent events

### Requirement: StreamManager processEvent error handling

The `StreamManager.processEvent()` method SHALL wrap its switch statement in a try-catch block. Errors SHALL be logged but SHALL NOT crash the stream.

#### Scenario: processEvent encounters unexpected data

- **WHEN** `processEvent` throws due to malformed event data
- **THEN** the error SHALL be logged with conversation ID context
- **AND** the stream SHALL continue processing future events

### Requirement: Session health monitor

The `StreamManager` SHALL track the last event timestamp for each running stream. A periodic check (every 60 seconds) SHALL detect stalled sessions. If no events are received for 120 seconds while the stream status is `running`, a `copilot:warning` message SHALL be broadcast to subscribers.

#### Scenario: Stream stalls for 2 minutes

- **WHEN** a stream is in `running` status
- **AND** no events are received from the SDK for 120 seconds
- **THEN** a `copilot:warning` event SHALL be broadcast with message indicating the session may be stalled

#### Scenario: Health monitor cleanup on stream end

- **WHEN** a stream transitions to `idle` or is aborted
- **THEN** the health monitor interval SHALL be cleared
