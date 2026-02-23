## ADDED Requirements

### Requirement: System prompt reset SHALL use ConfirmDialog

The SystemPromptTab's "Reset" action MUST use the shared `ConfirmDialog` component instead of native `window.confirm()`. The dialog MUST use destructive mode styling. The dialog MUST NOT require typed input confirmation (no `requiredInput` prop).

#### Scenario: Reset system prompt shows ConfirmDialog

- **WHEN** user clicks the "Reset" button in the System Prompt tab
- **THEN** a `ConfirmDialog` MUST appear with destructive styling
- **AND** the dialog title MUST convey that this action resets the system prompt to default
- **AND** the dialog description MUST warn that current content will be lost
- **AND** the dialog MUST have Confirm and Cancel buttons

#### Scenario: Confirming reset executes the reset

- **WHEN** user clicks Confirm in the reset system prompt ConfirmDialog
- **THEN** `promptsApi.resetSystemPrompt()` MUST be called
- **AND** the textarea content MUST be updated to the default system prompt
- **AND** the dialog MUST close

#### Scenario: Cancelling reset preserves current content

- **WHEN** user clicks Cancel or presses Escape in the reset system prompt ConfirmDialog
- **THEN** the system prompt content MUST NOT change
- **AND** the dialog MUST close

#### Scenario: Native window.confirm is not used

- **WHEN** user triggers system prompt reset from Settings
- **THEN** `window.confirm()` MUST NOT be called
