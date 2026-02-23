## ADDED Requirements

### Requirement: Plan toggle blocked in terminal mode

The plan mode toggle (both keyboard shortcut and UI) SHALL be blocked when the active tab is in terminal mode.

#### Scenario: Keyboard shortcut blocked in terminal mode

- **WHEN** active tab is in `terminal` mode and user presses Shift+Tab
- **THEN** the system MUST NOT change `planMode`
- **AND** `e.preventDefault()` MUST still be called

#### Scenario: UI toggle disabled prop in terminal mode

- **WHEN** active tab is in `terminal` mode
- **THEN** the `PlanActToggle` component MUST receive `disabled={true}` (via `isStreaming || isTerminalMode`)

#### Scenario: Switching from terminal to copilot re-enables plan toggle

- **WHEN** user switches active tab from `terminal` to `copilot` mode
- **THEN** the `PlanActToggle` component MUST re-enable (assuming not streaming)
- **AND** Shift+Tab shortcut MUST resume normal plan toggle behavior
