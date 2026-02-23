## ADDED Requirements

### Requirement: Tab context menu with delete option

The system SHALL provide a context menu on each tab that includes a "Delete conversation" action, accessible via right-click (desktop) or long-press (mobile).

#### Scenario: Right-click opens context menu on desktop

- **WHEN** the user right-clicks on a tab in the tab bar
- **THEN** a context menu SHALL appear with at least a "Delete conversation" option
- **AND** the default browser context menu SHALL be suppressed

#### Scenario: Long-press opens context menu on mobile

- **WHEN** the user long-presses (≥500ms) on a tab in the tab bar on a touch device
- **THEN** the same context menu SHALL appear with the "Delete conversation" option

#### Scenario: Context menu for draft tab

- **WHEN** the user opens the context menu on a tab that has no saved conversation (draft tab with null conversationId)
- **THEN** the "Delete conversation" option SHALL be disabled or hidden
- **AND** a "Close tab" option SHALL remain available

### Requirement: Delete conversation from tab confirms before deletion

The system SHALL require user confirmation before deleting a conversation from a tab to prevent accidental data loss.

#### Scenario: User confirms deletion

- **WHEN** the user selects "Delete conversation" from the tab context menu
- **THEN** a confirmation dialog SHALL appear asking the user to confirm
- **AND** upon confirmation, the system SHALL delete the conversation via the conversation API AND close the tab

#### Scenario: User cancels deletion

- **WHEN** the user selects "Delete conversation" and the confirmation dialog appears
- **AND** the user cancels
- **THEN** no deletion SHALL occur and the tab SHALL remain open

### Requirement: Delete conversation removes from all locations

When a conversation is deleted via the tab context menu, the system SHALL remove it from all relevant locations.

#### Scenario: Conversation is fully removed after deletion

- **WHEN** the user confirms deletion of a conversation from a tab
- **THEN** the conversation SHALL be deleted via the backend conversation API (DELETE endpoint)
- **AND** the tab SHALL be closed (removed from tab bar)
- **AND** the conversation SHALL no longer appear in the conversation history dropdown
- **AND** the conversations list in the store SHALL be refreshed

#### Scenario: Next tab activation after deletion

- **WHEN** the user deletes the currently active tab's conversation
- **THEN** the system SHALL activate the next available tab (same behavior as closing a tab)
