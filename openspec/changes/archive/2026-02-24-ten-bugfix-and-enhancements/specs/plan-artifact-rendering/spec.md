## ADDED Requirements

### Requirement: Plan content emitted as artifact on idle

When a plan mode stream reaches `copilot:idle` and plan content has been written to a file, the `StreamManager` SHALL include a `planArtifact` object in the idle event's extra data containing `title`, `content`, and `filePath`.

#### Scenario: Plan mode generates a plan

- **WHEN** a stream in plan mode emits `copilot:idle`
- **AND** `stream.accumulation.contentSegments` contains plan content
- **THEN** the idle event data SHALL include `planArtifact: { title, content, filePath }`
- **AND** `title` SHALL be derived from `extractTopicFromContent(planContent)`

#### Scenario: Plan mode with empty content

- **WHEN** a plan mode stream emits `copilot:idle`
- **AND** no content was accumulated
- **THEN** no `planArtifact` SHALL be included in the idle event

### Requirement: Frontend creates plan artifact on idle

The frontend `copilot:idle` handler SHALL check for `data.planArtifact`. If present, it SHALL:
1. Create a new artifact with type `plan`, a unique ID, the plan title, and plan content
2. Add it to the tab's artifacts
3. Set it as the active artifact
4. Open the artifacts panel

#### Scenario: Plan artifact auto-opens in Artifacts Panel

- **WHEN** frontend receives `copilot:idle` with `planArtifact` data
- **THEN** a new artifact with type `plan` SHALL be added to the tab
- **AND** the Artifacts Panel SHALL open automatically
- **AND** the plan artifact SHALL be the active (displayed) artifact

#### Scenario: Multiple plans in same tab

- **WHEN** a second plan is generated in the same tab
- **THEN** a new artifact SHALL be created (not overwriting the first)
- **AND** the new artifact SHALL become the active artifact

### Requirement: Plan artifact display in chat

When `showPlanCompletePrompt` is true and a plan artifact has been created, the chat view SHALL NOT duplicate the plan content inline. The plan SHALL be viewable only through the Artifacts Panel.

#### Scenario: Plan complete prompt without inline content

- **WHEN** plan mode completes and `showPlanCompletePrompt` is shown
- **THEN** the prompt SHALL show the plan saved message and action buttons
- **AND** the full plan content SHALL be viewable in the Artifacts Panel, not repeated in chat
