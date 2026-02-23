## ADDED Requirements

### Requirement: Plan/Act toggle disabled in Bash mode

The PlanActToggle component SHALL be disabled when the active tab is in terminal (Bash) mode.

#### Scenario: PlanActToggle disabled in terminal mode

- **WHEN** the active tab's mode is `terminal`
- **THEN** the PlanActToggle component MUST render with `disabled={true}`
- **AND** both Plan and Act buttons MUST have `opacity-50 cursor-not-allowed` styling
- **AND** clicking either button MUST NOT change `planMode`

#### Scenario: PlanActToggle enabled in copilot mode

- **WHEN** the active tab's mode is `copilot` and streaming is not active
- **THEN** the PlanActToggle component MUST render with `disabled={false}`
- **AND** clicking Plan/Act buttons MUST toggle `planMode` normally

#### Scenario: PlanActToggle disabled during streaming regardless of mode

- **WHEN** the active tab is streaming (regardless of copilot or terminal mode)
- **THEN** the PlanActToggle component MUST render with `disabled={true}`

### Requirement: Web Search and Schedule buttons hidden in Bash mode

When the active tab is in terminal (Bash) mode, the forced web search toggle button and the schedule (cron) button SHALL be hidden from the input toolbar, as these features are not applicable to Bash execution.

#### Scenario: Web Search toggle hidden in terminal mode

- **WHEN** the active tab's mode is `terminal`
- **THEN** the WebSearchToggle component MUST NOT be rendered in the input area
- **AND** the web search toggle in MobileToolbarPopup MUST also be hidden

#### Scenario: Schedule button hidden in terminal mode

- **WHEN** the active tab's mode is `terminal`
- **THEN** the schedule (Clock icon) button MUST NOT be rendered in the input area

#### Scenario: Buttons visible in copilot mode

- **WHEN** the active tab's mode is `copilot`
- **THEN** the WebSearchToggle and schedule button MUST be rendered normally
- **AND** their existing enable/disable logic (streaming, activeConversationId) MUST still apply
