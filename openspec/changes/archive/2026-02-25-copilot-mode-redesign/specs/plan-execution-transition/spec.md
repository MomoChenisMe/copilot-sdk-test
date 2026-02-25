## ADDED Requirements

### Requirement: Execute plan creates a new conversation

When the user chooses to execute a plan after plan mode completes, the backend SHALL create a new conversation record and a new SDK session, rather than reusing the existing conversation.

#### Scenario: Successful plan execution initiation

- **WHEN** the backend receives a `copilot:execute_plan` WebSocket message with `conversationId` and `planContent`
- **THEN** the system SHALL:
  1. Retrieve the original conversation's `model` and `cwd`
  2. Create a new conversation via `repo.create({ model, cwd })`
  3. Start a new stream on the new conversationId with `mode: 'autopilot'` and the plan content as prompt
  4. Broadcast a `copilot:plan_execution_started` event with `{ oldConversationId, newConversationId, title }`

#### Scenario: New conversation title is derived from plan

- **WHEN** a new conversation is created for plan execution
- **THEN** the conversation title SHALL be set to `"Execute: {planTopic}"` where `planTopic` is extracted from the plan content (first heading or first line)

#### Scenario: Original plan conversation is preserved

- **WHEN** the system creates a new conversation for plan execution
- **THEN** the original plan conversation SHALL remain in the database with its full message history intact and its SDK session ID preserved

### Requirement: Frontend switches tab to new conversation on plan execution

The frontend SHALL handle the `copilot:plan_execution_started` event by switching the current tab to the new conversation.

#### Scenario: Tab switches to new conversation

- **WHEN** the frontend receives a `copilot:plan_execution_started` event with `{ oldConversationId, newConversationId, title }`
- **THEN** the system SHALL call `switchTabConversation(tabId, newConversationId, title)` to update the tab's conversation binding

#### Scenario: Plan mode state is cleared on transition

- **WHEN** the tab switches to the new conversation for plan execution
- **THEN** the system SHALL:
  1. Set `planMode` to `false`
  2. Set `showPlanCompletePrompt` to `false`
  3. Clear `planContent` to `null`
  4. Set `isStreaming` to `true` (since the new stream starts immediately)

### Requirement: handleExecutePlan delegates to WebSocket

The `handleExecutePlan` function in AppShell SHALL only send the WebSocket message and let `useTabCopilot` handle the state transitions via the `copilot:plan_execution_started` event.

#### Scenario: AppShell sends execute plan message

- **WHEN** the user clicks "Execute Plan" in the plan complete prompt
- **THEN** `handleExecutePlan` SHALL send a `copilot:execute_plan` WebSocket message with `{ conversationId, planContent }` and SHALL NOT directly manipulate store state (plan mode, streaming, etc.)
