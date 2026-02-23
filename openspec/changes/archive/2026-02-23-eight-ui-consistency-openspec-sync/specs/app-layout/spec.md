## ADDED Requirements

### Requirement: TopBar OpenSpec button SHALL reactively bind to global store

The TopBar OpenSpec button visibility MUST be determined by a Zustand selector subscribing to `settings.openspecEnabled`, NOT by a non-reactive `getState()` call at render time. When `settings.openspecEnabled` changes in the global store, the TopBar MUST re-render and show or hide the OpenSpec button immediately without requiring a page reload or tab switch.

#### Scenario: OpenSpec disabled in settings hides TopBar button immediately

- **WHEN** user toggles OpenSpec SDD to disabled in Settings panel
- **THEN** the TopBar OpenSpec button (BookOpen icon) MUST disappear immediately
- **AND** the button MUST NOT require a tab switch or page reload to update

#### Scenario: OpenSpec enabled in settings shows TopBar button immediately

- **WHEN** user toggles OpenSpec SDD to enabled in Settings panel
- **THEN** the TopBar OpenSpec button (BookOpen icon) MUST appear immediately
- **AND** the button MUST NOT require a tab switch or page reload to update

#### Scenario: AppShell uses Zustand selector for openspecEnabled

- **WHEN** AppShell renders the TopBar component
- **THEN** the `onOpenSpecClick` prop MUST be derived from a Zustand selector (`useAppStore((s) => s.settings?.openspecEnabled)`)
- **AND** it MUST NOT use `useAppStore.getState().settings` directly in JSX

### Requirement: TopBar SHALL reflect OpenSpec folder status in real-time via event listener

AppShell MUST listen to the `openspec:changed` CustomEvent on the `window` object to detect OpenSpec folder creation or deletion. When the event fires, AppShell MUST re-check the OpenSpec folder existence by calling `openspecApi.getOverview()` and update the `openSpecActive` state accordingly. The listener MUST use a 300ms debounce to avoid excessive API calls.

#### Scenario: Deleting OpenSpec folder removes blue indicator dot immediately

- **WHEN** user deletes the OpenSpec folder (via OpenSpec panel or externally)
- **AND** the WebSocket broadcasts `openspec:changed` event
- **THEN** the TopBar OpenSpec button's blue indicator dot MUST disappear within 500ms
- **AND** the update MUST NOT require switching tabs or reloading

#### Scenario: Initializing OpenSpec folder shows blue indicator dot immediately

- **WHEN** user initializes OpenSpec (via `openspec init` or OpenSpec panel)
- **AND** the WebSocket broadcasts `openspec:changed` event
- **THEN** the TopBar OpenSpec button's blue indicator dot MUST appear within 500ms

#### Scenario: Rapid successive changes are debounced

- **WHEN** multiple `openspec:changed` events fire within 300ms
- **THEN** AppShell MUST only make one `getOverview()` API call after the debounce period

### Requirement: TabBar conversation deletion SHALL use ConfirmDialog

The TabBar context menu's "Delete conversation" action MUST use the shared `ConfirmDialog` component instead of native `window.confirm()`. The dialog MUST use destructive mode styling. The dialog MUST NOT require typed input confirmation (no `requiredInput` prop).

#### Scenario: Delete conversation shows ConfirmDialog

- **WHEN** user right-clicks a tab and selects "Delete conversation"
- **THEN** a `ConfirmDialog` MUST appear with destructive styling
- **AND** the dialog title MUST be the i18n translation of delete confirmation
- **AND** the dialog MUST have Confirm and Cancel buttons

#### Scenario: Confirming deletion executes the delete

- **WHEN** user clicks Confirm in the delete conversation ConfirmDialog
- **THEN** the conversation MUST be deleted
- **AND** the dialog MUST close

#### Scenario: Cancelling deletion preserves the conversation

- **WHEN** user clicks Cancel or presses Escape in the delete conversation ConfirmDialog
- **THEN** the conversation MUST NOT be deleted
- **AND** the dialog MUST close

#### Scenario: Native window.confirm is not used

- **WHEN** user triggers conversation deletion from TabBar
- **THEN** `window.confirm()` MUST NOT be called
