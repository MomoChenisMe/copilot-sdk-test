## ADDED Requirements

### Requirement: Active tab ID persistence on save

The system SHALL include the current `activeTabId` when persisting open tabs to localStorage and backend settings API.

#### Scenario: Active tab ID is saved alongside tab list

- **WHEN** the user switches to a tab or any tab mutation triggers `persistOpenTabs()`
- **THEN** the persisted data in localStorage key `codeforge:openTabs` SHALL include an `activeTabId` field alongside the tab array
- **AND** the backend settings PATCH payload SHALL include the `activeTabId` value

#### Scenario: Draft tab is active during persistence

- **WHEN** `persistOpenTabs()` is called and the active tab has a null `conversationId` (draft tab)
- **THEN** the system SHALL still persist the `activeTabId` value as-is (draft tab ID)

### Requirement: Active tab ID restoration on page load

The system SHALL restore the previously active tab when restoring open tabs from localStorage, rather than always defaulting to the first tab.

#### Scenario: Restore previously active tab

- **WHEN** the page loads and `restoreOpenTabs()` reads persisted data containing an `activeTabId`
- **AND** the `activeTabId` corresponds to a tab that exists in the restored tab list
- **THEN** the system SHALL set `activeTabId` to the persisted value

#### Scenario: Persisted active tab no longer exists

- **WHEN** the page loads and `restoreOpenTabs()` reads persisted data containing an `activeTabId`
- **AND** the `activeTabId` does NOT correspond to any tab in the restored tab list
- **THEN** the system SHALL fall back to `tabOrder[0]` as the active tab

#### Scenario: No activeTabId in persisted data (backward compatibility)

- **WHEN** the page loads and `restoreOpenTabs()` reads persisted data that does NOT contain an `activeTabId` field (old format)
- **THEN** the system SHALL fall back to `tabOrder[0]` as the active tab (existing behavior)

### Requirement: Backend settings activeTabId field

The backend settings API SHALL accept and persist an `activeTabId` field within the settings PATCH endpoint.

#### Scenario: PATCH settings with activeTabId

- **WHEN** the frontend sends a PATCH request to the settings API with `activeTabId` in the payload
- **THEN** the backend SHALL store the value and return it in subsequent GET requests
