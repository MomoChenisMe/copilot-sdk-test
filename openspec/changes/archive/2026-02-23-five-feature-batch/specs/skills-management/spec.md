## ADDED Requirements

### Requirement: OpenSpec skill badge in Settings

The Skills Tab in Settings SHALL display a purple "OpenSpec" badge next to skills whose name starts with `openspec-`.

#### Scenario: System skill with OpenSpec badge

- **WHEN** a system skill (builtin=true) has a name starting with `openspec-`
- **THEN** the skill item MUST display both a "System" badge (blue) and an "OpenSpec" badge (purple)
- **AND** the "OpenSpec" badge MUST use `bg-purple-500/10 text-purple-500` styling

#### Scenario: User skill with OpenSpec badge

- **WHEN** a user skill (builtin=false) has a name starting with `openspec-`
- **THEN** the skill item MUST display an "OpenSpec" badge (purple)

#### Scenario: Non-OpenSpec skill without badge

- **WHEN** a skill name does NOT start with `openspec-`
- **THEN** the skill item MUST NOT display an "OpenSpec" badge

### Requirement: OpenSpec skill badge in Slash Command menu

The Slash Command menu SHALL display a purple "OpenSpec" badge next to commands whose name starts with `openspec-`.

#### Scenario: Slash command with OpenSpec badge

- **WHEN** a slash command has name starting with `openspec-`
- **THEN** the command item MUST display a small "OpenSpec" badge next to the command name
- **AND** the badge MUST use `bg-purple-500/10 text-purple-500` styling with `text-[9px]` size

#### Scenario: Non-OpenSpec slash command without badge

- **WHEN** a slash command name does NOT start with `openspec-`
- **THEN** the command item MUST NOT display an "OpenSpec" badge
