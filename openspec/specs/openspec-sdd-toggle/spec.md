## ADDED Requirements

### Requirement: OpenSpec skill badge i18n support

The system SHALL provide i18n translation keys for the OpenSpec skill badge label.

#### Scenario: English locale badge text

- **WHEN** the UI language is English
- **THEN** the OpenSpec skill badge MUST display "OpenSpec"
- **AND** the translation key `settings.skills.openspecBadge` MUST resolve to "OpenSpec"

#### Scenario: Traditional Chinese locale badge text

- **WHEN** the UI language is Traditional Chinese
- **THEN** the OpenSpec skill badge MUST display "OpenSpec"
- **AND** the translation key `settings.skills.openspecBadge` MUST resolve to "OpenSpec"

### Requirement: OpenSpec badge visibility linked to toggle state

The "OpenSpec" badge SHALL appear on skills regardless of whether OpenSpec is currently enabled or disabled, since the badge indicates the skill's category, not its active state.

#### Scenario: Badge visible when OpenSpec enabled

- **WHEN** OpenSpec SDD is enabled in settings
- **THEN** skills with `openspec-` prefix MUST show the "OpenSpec" badge

#### Scenario: Badge visible when OpenSpec disabled

- **WHEN** OpenSpec SDD is disabled in settings
- **THEN** skills with `openspec-` prefix MUST still show the "OpenSpec" badge
- **AND** the skill toggle switch MAY be in disabled state (per existing behavior)

## Requirements

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

<!-- @trace
source: eight-ui-consistency-openspec-sync
updated: 2026-02-23
code:
  - frontend/src/hooks/useTabCopilot.ts
  - backend/package.json
  - backend/src/openspec/openspec-routes.ts
  - frontend/src/lib/settings-api.ts
  - frontend/src/locales/en.json
  - frontend/src/components/copilot/ChatView.tsx
  - frontend/src/components/settings/SettingsPanel.tsx
  - frontend/src/components/layout/AppShell.tsx
  - frontend/src/components/openspec/OpenSpecHeader.tsx
  - frontend/src/components/layout/TopBar.tsx
  - backend/src/openspec/openspec-service.ts
  - backend/src/copilot/sdk-update.ts
  - backend/src/settings/settings-store.ts
  - frontend/src/lib/ws-client.ts
  - backend/src/index.ts
  - backend/src/openspec/openspec-watcher.ts
  - frontend/src/components/shared/ConfirmDialog.tsx
  - frontend/src/components/openspec/OpenSpecPanel.tsx
  - .docker-compose.yml.swp
  - backend/src/prompts/defaults.ts
  - frontend/src/components/copilot/DirectoryPicker.tsx
  - frontend/src/components/openspec/OpenSpecChangeDetail.tsx
  - frontend/src/store/index.ts
  - frontend/src/locales/zh-TW.json
  - frontend/src/components/openspec/OpenSpecOverview.tsx
  - frontend/src/lib/openspec-api.ts
  - backend/src/prompts/composer.ts
  - frontend/src/components/layout/TabBar.tsx
  - claude/.DS_Store
  - backend/src/ws/server.ts
tests:
  - frontend/tests/components/copilot/DirectoryPicker.test.tsx
  - frontend/tests/store/tabs.test.ts
  - backend/tests/prompts/composer.test.ts
  - frontend/tests/components/layout/TabBar.test.tsx
  - frontend/tests/components/openspec/OpenSpecChangeDetail.test.tsx
  - backend/tests/copilot/sdk-update.test.ts
  - frontend/tests/components/settings/SettingsPanel.test.tsx
-->