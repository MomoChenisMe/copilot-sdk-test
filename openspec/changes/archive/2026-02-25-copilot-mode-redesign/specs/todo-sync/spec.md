## MODIFIED Requirements

### Requirement: Todo sync hook resolves workspacePath with fallback

The `createTodoSyncHook` SHALL resolve the SDK session's workspace path using a fallback mechanism when the primary `session.workspacePath` is unavailable (e.g., on resumed sessions).

#### Scenario: Primary workspacePath is available

- **WHEN** the todo sync hook fires and `session.workspacePath` is defined
- **THEN** the system SHALL use `session.workspacePath` to locate `session.db`

#### Scenario: Fallback to SDK session directory pattern

- **WHEN** the todo sync hook fires and `session.workspacePath` is undefined
- **THEN** the system SHALL attempt to find `session.db` using the SDK's conventional session directory pattern (e.g., `~/.copilot-cli/sessions/{sessionId}/`)
- **AND** if `session.db` is found at the fallback path, the system SHALL use it

#### Scenario: Both paths are unavailable

- **WHEN** neither `session.workspacePath` nor the fallback path contains `session.db`
- **THEN** the system SHALL log a debug message and skip the todo sync without error

### Requirement: Todo sync hook includes debug logging

The todo sync hook SHALL log detailed debug information at each decision point to aid in troubleshooting.

#### Scenario: Logging when hook is triggered

- **WHEN** the `onPostToolUse` hook fires for a `sql` tool call matching the todos pattern
- **THEN** the system SHALL log the `sessionId`, resolved `workspacePath`, and whether a fallback was used

#### Scenario: Logging when workspacePath is unavailable

- **WHEN** both primary and fallback workspacePath resolution fails
- **THEN** the system SHALL log a debug message including the `sessionId` and the paths that were attempted

#### Scenario: Logging on successful broadcast

- **WHEN** todos are successfully read from `session.db` and broadcast
- **THEN** the system SHALL log the `conversationId` and the number of todos broadcast

### Requirement: Stream manager logs workspacePath on session creation

The StreamManager SHALL log the `workspacePath` value after creating or resuming an SDK session.

#### Scenario: workspacePath logged after session creation

- **WHEN** a new SDK session is created via `startStream()`
- **THEN** the system SHALL log `workspacePath` at info level, including whether it is defined or undefined
