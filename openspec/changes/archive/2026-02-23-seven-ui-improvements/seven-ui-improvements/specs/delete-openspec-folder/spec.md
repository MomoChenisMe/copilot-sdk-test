## ADDED Requirements

### Requirement: Delete openspec folder button

The OpenSpec panel SHALL provide a button to delete the openspec folder for the current project, allowing users to completely remove OpenSpec configuration. The deletion requires double confirmation to prevent accidental data loss.

#### Scenario: Delete button is visible when openspec folder exists

- **WHEN** the OpenSpec panel is open and the project has an openspec folder
- **THEN** a "Delete OpenSpec" button SHALL be displayed in the panel
- **AND** the button SHALL use a destructive style (red text or outline) to indicate danger

#### Scenario: First confirmation dialog

- **WHEN** the user clicks the "Delete OpenSpec" button
- **THEN** a first confirmation dialog SHALL appear asking "Are you sure you want to delete the openspec folder?"
- **AND** the dialog SHALL explain that all changes, specs, and configuration will be permanently removed

#### Scenario: Second confirmation dialog (double check)

- **WHEN** the user confirms the first dialog
- **THEN** a second confirmation dialog SHALL appear asking the user to type the project name or "DELETE" to confirm
- **AND** the deletion SHALL NOT proceed until the user provides the correct confirmation text

#### Scenario: Successful deletion

- **WHEN** the user completes both confirmation steps
- **THEN** the system SHALL call the backend API to delete the openspec folder
- **AND** the panel SHALL refresh to show the "no openspec" state (with init button)
- **AND** a success message SHALL briefly appear

#### Scenario: User cancels at any step

- **WHEN** the user cancels at either confirmation step
- **THEN** no deletion SHALL occur
- **AND** the panel SHALL remain unchanged

#### Scenario: Delete button not shown when no openspec folder

- **WHEN** the OpenSpec panel is open and the project does NOT have an openspec folder
- **THEN** the delete button SHALL NOT be displayed
