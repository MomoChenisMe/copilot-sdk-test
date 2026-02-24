## REMOVED Requirements

### Requirement: SDK version comparison display in Settings

**Reason**: The entire version comparison and update workflow is being removed. Comparing current vs latest version creates an implicit "you should update" UX that encourages risky auto-updates. The SDK update mechanism (`npm update`) does not restart the Node.js process, making updates ineffective without a manual service restart. Additionally, SDK updates may contain breaking changes.

**Migration**: Settings General Tab now shows only the current installed version as a read-only display. Users who want to check for newer versions should use `npm view @github/copilot-sdk version` directly or the `sdk-update-analyzer` Claude skill.

### Requirement: Manual check for updates button

**Reason**: Removed along with all version comparison functionality. Checking for updates implies the system can act on that information, which it cannot safely do.

**Migration**: No replacement needed. Version checking is a manual operation outside the application.

### Requirement: Manual SDK update button

**Reason**: `performUpdate()` executes `npm update` which only updates files on disk. The running Node.js process continues using the cached old SDK module. The `CopilotClient` singleton in `ClientManager` is also not rebuilt. Users receive no indication that a restart is required, creating a false sense of successful update.

**Migration**: Users should update the SDK manually via `npm update @github/copilot-sdk` in the terminal and restart the backend service.

### Requirement: Analyze Changes button preserved

**Reason**: Removed along with the update workflow. The `settings:analyzeChanges` custom DOM event and its handler in `AppShell` are also removed.

**Migration**: Users should use the `sdk-update-analyzer` Claude skill for post-update impact analysis.

## ADDED Requirements

### Requirement: Read-only SDK version display in Settings

The Settings General Tab SHALL display the currently installed `@github/copilot-sdk` version as a read-only text element with no action buttons.

#### Scenario: Current version available

- **WHEN** the Settings General Tab loads
- **AND** the backend returns a non-null `currentVersion` from `GET /api/copilot/sdk-version`
- **THEN** the UI MUST display the version prefixed with `v` (e.g., `v0.1.25`) in monospace font
- **AND** there MUST NOT be any "Check for Updates", "Update SDK", or "Analyze Changes" buttons

#### Scenario: Current version unknown

- **WHEN** the Settings General Tab loads
- **AND** the backend returns `{ currentVersion: null }`
- **THEN** the UI MUST display the localized fallback text from `t('sdk.versionUnknown')`

#### Scenario: API call failure

- **WHEN** the `GET /api/copilot/sdk-version` call fails
- **THEN** the UI MUST silently handle the error (console warning only, no crash)
- **AND** the version display MUST show the fallback text

### Requirement: Simplified SDK version API endpoint

The `GET /api/copilot/sdk-version` endpoint SHALL return only the currently installed SDK version without querying external registries.

#### Scenario: Successful version retrieval

- **WHEN** a GET request is made to `/api/copilot/sdk-version`
- **AND** the SDK package is installed
- **THEN** the response MUST be `200 { currentVersion: "<version>" }`
- **AND** the endpoint MUST NOT make any network calls to npm registry or GitHub API

#### Scenario: SDK package not found

- **WHEN** a GET request is made to `/api/copilot/sdk-version`
- **AND** the SDK package cannot be found in node_modules
- **THEN** the response MUST be `200 { currentVersion: null }`

#### Scenario: Internal error

- **WHEN** a GET request is made to `/api/copilot/sdk-version`
- **AND** an unexpected error occurs during version reading
- **THEN** the response MUST be `500 { error: "Failed to check SDK version" }`

### Requirement: SDK changelog and update endpoints removed

The backend SHALL NOT expose `GET /api/copilot/sdk-changelog` or `POST /api/copilot/sdk-update` endpoints.

#### Scenario: Changelog endpoint returns 404

- **WHEN** a GET request is made to `/api/copilot/sdk-changelog`
- **THEN** the response MUST be `404` (route not found)

#### Scenario: Update endpoint returns 404

- **WHEN** a POST request is made to `/api/copilot/sdk-update`
- **THEN** the response MUST be `404` (route not found)

### Requirement: SdkUpdateBanner component removed

The global SDK update banner component SHALL NOT be rendered in the application layout.

#### Scenario: No update banner in AppShell

- **WHEN** the application loads
- **THEN** there MUST NOT be any element with `data-testid="sdk-update-banner"` in the DOM
- **AND** there MUST NOT be any element with `data-testid="sdk-update-btn"` in the DOM

### Requirement: SdkUpdateChecker class simplified

The `SdkUpdateChecker` class SHALL only expose the `getInstalledVersion(): string | null` method. All network-dependent methods and update execution methods SHALL be removed.

#### Scenario: getInstalledVersion returns installed version

- **WHEN** `getInstalledVersion()` is called
- **AND** `@github/copilot-sdk` is installed in node_modules
- **THEN** it MUST return the version string from the package's `package.json`

#### Scenario: getInstalledVersion returns null when not found

- **WHEN** `getInstalledVersion()` is called
- **AND** `@github/copilot-sdk` is not found in any candidate path
- **THEN** it MUST return `null`

#### Scenario: No network methods available

- **WHEN** a `SdkUpdateChecker` instance is created
- **THEN** it MUST NOT have `getLatestVersion`, `checkForUpdate`, `getChangelog`, or `performUpdate` methods
- **AND** the class MUST NOT import `child_process` or make any `fetch` calls

### Requirement: Locale keys cleanup

The i18n locale files SHALL only retain the `sdk.versionUnknown` key. All other `sdk.*` keys SHALL be removed.

#### Scenario: English locale minimal SDK keys

- **WHEN** the `en.json` locale file is loaded
- **THEN** the `sdk` object MUST contain only the `versionUnknown` key
- **AND** keys `analyzeChanges`, `changelogUnavailable`, `updateAvailable`, `upToDate`, `checkForUpdates`, `updateSdk`, `updateSuccess`, `updateFailed`, `updateBannerMessage`, `updateButton` MUST NOT exist

#### Scenario: Chinese locale minimal SDK keys

- **WHEN** the `zh-TW.json` locale file is loaded
- **THEN** the `sdk` object MUST contain only the `versionUnknown` key with Traditional Chinese translation
