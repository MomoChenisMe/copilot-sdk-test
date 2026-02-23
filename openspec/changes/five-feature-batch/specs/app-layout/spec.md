## ADDED Requirements

### Requirement: Tab close triggers lazy-load on newly active tab

When a tab is closed, the system SHALL trigger message lazy-loading for the newly activated tab to prevent infinite loading state.

#### Scenario: Close tab with subsequent tab having unloaded messages

- **WHEN** user closes a tab and the next active tab has `messagesLoaded === false` and a valid `conversationId`
- **THEN** the system MUST call `handleSelectTab(newActiveTabId)` which triggers `conversationApi.getMessages()` to lazy-load messages
- **AND** the newly active tab MUST display its messages after loading completes

#### Scenario: Close tab with subsequent tab already loaded

- **WHEN** user closes a tab and the next active tab has `messagesLoaded === true`
- **THEN** `handleSelectTab` MUST be called but SHALL skip the API fetch (existing guard: `if (!tab.messagesLoaded)`)
- **AND** the newly active tab MUST immediately display its messages

#### Scenario: Close last remaining tab

- **WHEN** user closes the only remaining tab
- **THEN** `activeTabId` MUST become `null`
- **AND** `activeConversationId` MUST be set to `null`
- **AND** `handleSelectTab` MUST NOT be called

#### Scenario: Close tab with active stream on next tab

- **WHEN** user closes a tab and the next active tab has an active stream in `activeStreams`
- **THEN** `handleSelectTab` MUST call `send({ type: 'copilot:subscribe', data: { conversationId } })` to re-subscribe to the stream
