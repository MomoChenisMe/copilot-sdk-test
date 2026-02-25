## MODIFIED Requirements

### Requirement: Execute plan uses autopilot mode

The `copilot:execute_plan` WebSocket handler SHALL start the new stream in `autopilot` mode instead of the previous `act` mode.

#### Scenario: Execute plan starts autopilot stream

- **WHEN** a `copilot:execute_plan` message is received and a new stream is started
- **THEN** the stream SHALL be started with `mode: 'autopilot'`
- **AND** the SDK session mode SHALL be set to `'autopilot'` via RPC

#### Scenario: Plan content is sent as autopilot prompt

- **WHEN** the new autopilot stream starts with plan content
- **THEN** the first prompt SHALL contain the full plan content for the agent to execute
