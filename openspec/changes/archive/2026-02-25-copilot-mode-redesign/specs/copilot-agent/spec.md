## MODIFIED Requirements

### Requirement: Mode type system

The internal mode type SHALL be `'plan' | 'autopilot'` throughout the backend system, replacing the previous `'plan' | 'act'` type.

#### Scenario: ConversationStream mode type

- **WHEN** a ConversationStream is created
- **THEN** the `mode` field SHALL be typed as `'plan' | 'autopilot'`
- **AND** the default mode SHALL be `'autopilot'`

#### Scenario: StartStreamOptions mode type

- **WHEN** `startStream()` is called with a mode option
- **THEN** the `mode` parameter SHALL accept `'plan' | 'autopilot'`

#### Scenario: setMode accepts new mode type

- **WHEN** `setMode(conversationId, mode)` is called
- **THEN** the `mode` parameter SHALL accept `'plan' | 'autopilot'`

### Requirement: SDK mode mapping

The StreamManager SHALL map internal modes to SDK modes as follows: `'plan'` → SDK `'plan'`, `'autopilot'` → SDK `'autopilot'`.

#### Scenario: Plan mode maps to SDK plan

- **WHEN** `setMode()` is called with mode `'plan'`
- **THEN** the system SHALL call `sessionManager.setMode(session, 'plan')` via RPC

#### Scenario: Autopilot mode maps to SDK autopilot

- **WHEN** `setMode()` is called with mode `'autopilot'`
- **THEN** the system SHALL call `sessionManager.setMode(session, 'autopilot')` via RPC

#### Scenario: Autopilot mode is set on stream start

- **WHEN** `startStream()` is called with mode `'autopilot'` (or no mode, defaulting to autopilot)
- **THEN** the system SHALL call `sessionManager.setMode(session, 'autopilot')` to explicitly set the SDK mode

### Requirement: WebSocket set_mode handler accepts new mode type

The `copilot:set_mode` WebSocket handler SHALL accept mode values `'plan'` or `'autopilot'`.

#### Scenario: Set mode to autopilot via WebSocket

- **WHEN** a `copilot:set_mode` message is received with `mode: 'autopilot'`
- **THEN** the system SHALL call `streamManager.setMode(conversationId, 'autopilot')`

#### Scenario: Mode changed event broadcasts new mode value

- **WHEN** the mode is changed to `'autopilot'`
- **THEN** the system SHALL broadcast `copilot:mode_changed` with `data: { mode: 'autopilot', conversationId }`
