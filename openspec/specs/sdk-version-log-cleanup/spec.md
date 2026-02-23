## ADDED Requirements

### Requirement: SDK version resolution fallback uses appropriate log level

The `SdkUpdateChecker.getInstalledVersion()` method SHALL use `DEBUG` level logging for expected fallback behavior and reserve `WARN` level for genuine failures.

#### Scenario: Strategy 1 fails but Strategy 2 succeeds

- **WHEN** the `createRequire` strategy (Strategy 1) fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`
- **AND** the filesystem candidate strategy (Strategy 2) successfully finds the SDK version
- **THEN** the Strategy 1 failure SHALL be logged at `DEBUG` level (not `WARN`)
- **AND** the successfully resolved version SHALL be returned normally

#### Scenario: Both strategies fail

- **WHEN** Strategy 1 fails
- **AND** Strategy 2 also fails to find the SDK package.json in any candidate path
- **THEN** the failure SHALL be logged at `WARN` level
- **AND** the method SHALL return `null`

#### Scenario: Strategy 1 succeeds

- **WHEN** the `createRequire` strategy successfully resolves the SDK version
- **THEN** the version SHALL be returned immediately without attempting Strategy 2
- **AND** no warning or debug failure logs SHALL be emitted
