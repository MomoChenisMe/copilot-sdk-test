## CHANGED Requirements

### Requirement: OpenSpec path resolves from active tab CWD with fallback

The OpenSpec API SHALL resolve the `openspec/` directory based on the CWD provided by the frontend (active tab's working directory). If no `openspec/` directory exists at the provided CWD, the system SHALL fall back to the backend's default path (`process.cwd()/openspec`).

#### Scenario: Frontend passes CWD to all OpenSpec API calls

- **WHEN** the frontend calls any OpenSpec API endpoint (`/api/openspec/*`)
- **THEN** the request MUST include a `cwd` query parameter containing the active tab's working directory
- **AND** if no active tab CWD is available, the frontend MUST omit the `cwd` parameter (triggering default fallback)

#### Scenario: Backend resolves openspec path from CWD

- **WHEN** the backend receives an OpenSpec API request with `?cwd=/some/project`
- **AND** the directory `/some/project/openspec` exists on the filesystem
- **THEN** the backend MUST use `/some/project/openspec` as the OpenSpec base path for that request

#### Scenario: Backend falls back to default when CWD has no openspec

- **WHEN** the backend receives an OpenSpec API request with `?cwd=/some/dir`
- **AND** the directory `/some/dir/openspec` does NOT exist
- **THEN** the backend MUST fall back to the default path (`process.cwd()/openspec`)

#### Scenario: Backend falls back when no CWD parameter provided

- **WHEN** the backend receives an OpenSpec API request without a `cwd` query parameter
- **THEN** the backend MUST use the default path (`process.cwd()/openspec`)

#### Scenario: OpenSpec panel reflects active tab CWD

- **WHEN** the user switches to a tab with a different CWD
- **AND** that CWD contains an `openspec/` directory
- **THEN** the OpenSpec panel MUST refresh to show data from the new CWD's openspec directory

#### Scenario: OpenSpec panel shows resolved path indicator

- **WHEN** the OpenSpec panel is open
- **THEN** the panel header SHOULD display the currently resolved openspec directory path
- **AND** indicate whether it is using the tab CWD or the fallback default
