## ADDED Requirements

### Requirement: Backend relays sub-agent lifecycle events

The EventRelay SHALL listen to SDK session events `subagent.started`, `subagent.completed`, `subagent.failed`, and `subagent.selected`, and forward them as WebSocket messages to all subscribers of the conversation stream.

#### Scenario: Sub-agent started event is relayed

- **WHEN** the SDK session emits a `subagent.started` event with `toolCallId`, `agentName`, `agentDisplayName`, and `agentDescription`
- **THEN** the system SHALL broadcast a WebSocket message of type `copilot:subagent_started` with data `{ toolCallId, agentName, agentDisplayName, agentDescription }`

#### Scenario: Sub-agent completed event is relayed

- **WHEN** the SDK session emits a `subagent.completed` event with `toolCallId`, `agentName`, and `agentDisplayName`
- **THEN** the system SHALL broadcast a WebSocket message of type `copilot:subagent_completed` with data `{ toolCallId, agentName, agentDisplayName }`

#### Scenario: Sub-agent failed event is relayed

- **WHEN** the SDK session emits a `subagent.failed` event with `toolCallId`, `agentName`, `agentDisplayName`, and `error`
- **THEN** the system SHALL broadcast a WebSocket message of type `copilot:subagent_failed` with data `{ toolCallId, agentName, agentDisplayName, error }`

#### Scenario: Sub-agent selected event is relayed

- **WHEN** the SDK session emits a `subagent.selected` event with `agentName`, `agentDisplayName`, and `tools`
- **THEN** the system SHALL broadcast a WebSocket message of type `copilot:subagent_selected` with data `{ agentName, agentDisplayName, tools }`

### Requirement: Frontend displays sub-agent status

The frontend SHALL display a SubagentPanel component showing active sub-agents and their statuses when any sub-agent events have been received for the current conversation.

#### Scenario: SubagentPanel appears when sub-agents are active

- **WHEN** a `copilot:subagent_started` event is received for the active tab's conversation
- **THEN** the SubagentPanel SHALL become visible in the ChatView, displaying the sub-agent's `agentDisplayName` with a "running" status indicator (spinning loader icon)

#### Scenario: SubagentPanel updates on sub-agent completion

- **WHEN** a `copilot:subagent_completed` event is received for a previously started sub-agent
- **THEN** the SubagentPanel SHALL update that sub-agent's status to "completed" with a check icon

#### Scenario: SubagentPanel updates on sub-agent failure

- **WHEN** a `copilot:subagent_failed` event is received for a previously started sub-agent
- **THEN** the SubagentPanel SHALL update that sub-agent's status to "failed" with an alert icon and display the error message

#### Scenario: SubagentPanel shows progress

- **WHEN** multiple sub-agents are active (some completed, some running)
- **THEN** the SubagentPanel SHALL display a progress bar showing the ratio of completed sub-agents to total sub-agents

#### Scenario: SubagentPanel is collapsible

- **WHEN** the user clicks the SubagentPanel header
- **THEN** the panel SHALL toggle between collapsed (showing only header with count) and expanded (showing all sub-agent details) states

#### Scenario: Sub-agents are cleared on idle

- **WHEN** a `copilot:idle` event is received
- **THEN** the sub-agents list in the store SHALL be cleared, and the SubagentPanel SHALL be hidden

### Requirement: Zustand store manages sub-agent state

The Zustand store SHALL maintain sub-agent state per tab using a `subagents: SubagentItem[]` array in `TabState`.

#### Scenario: Adding a new sub-agent

- **WHEN** `addTabSubagent` is called with a `SubagentItem` containing `toolCallId`, `agentName`, `displayName`, `status: 'running'`, and optional `description`
- **THEN** the sub-agent SHALL be appended to the tab's `subagents` array

#### Scenario: Updating an existing sub-agent

- **WHEN** `updateTabSubagent` is called with a `toolCallId` and updated fields (e.g., `status: 'completed'`)
- **THEN** the matching sub-agent in the tab's `subagents` array SHALL be updated with the new fields

#### Scenario: Clearing all sub-agents

- **WHEN** `clearTabSubagents` is called for a tab
- **THEN** the tab's `subagents` array SHALL be set to an empty array
