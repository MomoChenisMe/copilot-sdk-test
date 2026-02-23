## ADDED Requirements

### Requirement: New tab shows recent conversations

When a new (draft) tab is created with no messages, the system SHALL display a list of recent conversations in the empty state area, allowing the user to quickly resume a previous conversation.

#### Scenario: New tab displays recent conversations

- **WHEN** a new tab is opened (draft tab with no messages and no conversation ID)
- **THEN** the empty state area SHALL display the "最近的對話" (Recent Conversations) list below the "發送訊息以開始..." prompt text
- **AND** the list SHALL show up to 10 most recent conversations
- **AND** each item SHALL display the conversation title and model badge (same as the welcome page)

#### Scenario: Clicking a recent conversation opens it in the current tab

- **WHEN** the user clicks on a conversation in the recent conversations list within a new tab
- **THEN** the system SHALL switch the current tab to that conversation (not open a new tab)
- **AND** the conversation messages SHALL be loaded into the current tab

#### Scenario: No conversations exist

- **WHEN** a new tab is opened and there are no existing conversations
- **THEN** the recent conversations list SHALL NOT be displayed
- **AND** only the "發送訊息以開始..." prompt text SHALL be shown
