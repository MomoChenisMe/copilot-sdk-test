## ADDED Requirements

### Requirement: SDK version comparison display in Settings

The Settings General Tab SHALL display both current and latest SDK versions with visual comparison.

#### Scenario: Update available display

- **WHEN** `sdkUpdateAvailable` is `true` and `sdkLatestVersion` is not null
- **THEN** the UI MUST display current version, an arrow indicator, latest version, and an "Update Available" badge
- **AND** the badge MUST use accent color styling (`bg-accent/10 text-accent`)

#### Scenario: Up to date display

- **WHEN** `sdkUpdateAvailable` is `false` and `sdkLatestVersion` is not null
- **THEN** the UI MUST display current version with a green "Up to date" indicator

#### Scenario: Version unknown display

- **WHEN** `sdkVersion` is null
- **THEN** the UI MUST display a fallback text from `t('sdk.versionUnknown')`

### Requirement: Manual check for updates button

The Settings General Tab SHALL provide a button to manually trigger SDK version check.

#### Scenario: Check for updates success

- **WHEN** user clicks "Check for Updates" button
- **THEN** the system MUST call `GET /api/copilot/sdk-version`
- **AND** MUST update `sdkVersion`, `sdkLatestVersion`, and `sdkUpdateAvailable` state
- **AND** the button MUST show loading state while request is in progress

#### Scenario: Check for updates failure

- **WHEN** the API call to `/api/copilot/sdk-version` fails
- **THEN** the UI MUST silently handle the error (no crash)
- **AND** the button MUST return to normal state

### Requirement: Manual SDK update button

The Settings General Tab SHALL provide a button to manually trigger SDK update when an update is available.

#### Scenario: Update SDK button visibility

- **WHEN** `sdkUpdateAvailable` is `true`
- **THEN** an "Update SDK" button MUST be displayed
- **WHEN** `sdkUpdateAvailable` is `false`
- **THEN** the "Update SDK" button MUST NOT be displayed

#### Scenario: Successful SDK update

- **WHEN** user clicks "Update SDK" button
- **THEN** the system MUST call `POST /api/copilot/sdk-update`
- **AND** the button MUST show loading state and be disabled during the request
- **AND** on success, the system MUST re-check the version (call `GET /api/copilot/sdk-version`)
- **AND** MUST display a success toast notification

#### Scenario: Failed SDK update

- **WHEN** the `POST /api/copilot/sdk-update` call fails or returns `{ success: false }`
- **THEN** the system MUST display an error toast notification
- **AND** the button MUST return to normal state

#### Scenario: Analyze Changes button preserved

- **WHEN** `sdkUpdateAvailable` is `true`
- **THEN** the existing "Analyze Changes" button MUST remain alongside the "Update SDK" button
