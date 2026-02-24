## ADDED Requirements

### Requirement: SDK built-in permission handler

The system SHALL use the SDK's built-in `approveAll` permission handler as the default auto-approve behavior, re-exported from `permission.ts`. The custom `autoApprovePermission` function MUST be removed.

#### Scenario: Default permission handler approves all requests

- **WHEN** a session is created or resumed without a custom `onPermissionRequest` handler
- **THEN** the system MUST use the SDK's `approveAll` as the default handler, which returns `{ kind: 'approved' }` for all permission requests

#### Scenario: Re-export from permission module

- **WHEN** any module imports `approveAll` from `permission.ts`
- **THEN** it MUST receive the SDK's built-in `approveAll` function via re-export (`export { approveAll } from '@github/copilot-sdk'`)

#### Scenario: Custom permission handler still takes precedence

- **WHEN** a session is created with a custom `onPermissionRequest` handler (e.g., `createPermissionHandler` for plan mode)
- **THEN** the custom handler MUST be used instead of `approveAll`

### Requirement: Session client identification

The system SHALL include `clientName: 'codeforge'` in all SDK session configurations to identify the application in API request User-Agent headers.

#### Scenario: New session includes clientName

- **WHEN** `SessionManager.createSession()` is called
- **THEN** the `SessionConfig` passed to the SDK MUST include `clientName: 'codeforge'`

#### Scenario: Resumed session includes clientName

- **WHEN** `SessionManager.resumeSession()` is called
- **THEN** the `ResumeSessionConfig` passed to the SDK MUST include `clientName: 'codeforge'`

#### Scenario: Disposable LLM caller session includes clientName

- **WHEN** `MemoryLlmCaller.call()` creates a disposable session
- **THEN** the session config MUST include `clientName: 'codeforge'`
