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
