## ADDED Requirements

### Requirement: OpenSpec SDD toggle SHALL sync global Zustand store

When the user toggles the OpenSpec SDD switch in Settings, the handler MUST call `useAppStore.getState().setSettings({ openspecEnabled: newValue })` after the backend API call succeeds. This ensures the global store always reflects the current toggle state and any component subscribing to `settings.openspecEnabled` via a Zustand selector receives the update immediately.

#### Scenario: Enabling OpenSpec updates global store

- **WHEN** user enables the OpenSpec SDD toggle in Settings
- **AND** `configApi.putOpenspecSdd(true)` succeeds
- **THEN** `useAppStore.getState().settings.openspecEnabled` MUST be `true`
- **AND** components subscribing to `settings.openspecEnabled` via Zustand selector MUST re-render

#### Scenario: Disabling OpenSpec updates global store

- **WHEN** user disables the OpenSpec SDD toggle in Settings
- **AND** `configApi.putOpenspecSdd(false)` succeeds
- **THEN** `useAppStore.getState().settings.openspecEnabled` MUST be `false`
- **AND** components subscribing to `settings.openspecEnabled` via Zustand selector MUST re-render

#### Scenario: Failed API call does not update global store

- **WHEN** user toggles the OpenSpec SDD switch
- **AND** `configApi.putOpenspecSdd()` throws an error
- **THEN** `useAppStore.getState().settings.openspecEnabled` MUST remain at its previous value
- **AND** a toast error message MUST be shown
