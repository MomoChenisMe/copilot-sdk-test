## MODIFIED Requirements

### Requirement: Artifact type union includes plan

The `ParsedArtifact` type SHALL include `'plan'` in its type union: `'markdown' | 'code' | 'html' | 'svg' | 'mermaid' | 'plan'`.

#### Scenario: Plan artifact type is recognized

- **WHEN** an artifact with `type: 'plan'` is added to the store
- **THEN** the Artifacts Panel SHALL recognize and render it without error

### Requirement: Plan artifact icon

The `getArtifactIcon()` function SHALL return a `ClipboardList` icon (from lucide-react) for artifacts with type `'plan'`.

#### Scenario: Plan artifact displays ClipboardList icon

- **WHEN** an artifact with type `'plan'` is displayed in the tab bar
- **THEN** the icon SHALL be `ClipboardList` at size 14

### Requirement: Plan artifact rendering

The `ArtifactRenderer` component SHALL render `'plan'` type artifacts using the `Markdown` component, identical to `'markdown'` type rendering (prose styling with dark mode support).

#### Scenario: Plan artifact renders as markdown

- **WHEN** a plan artifact is active in the Artifacts Panel
- **THEN** its content SHALL be rendered as formatted markdown with prose styling

### Requirement: Plan artifact download

The download function SHALL use `.md` extension for `'plan'` type artifacts.

#### Scenario: Download plan artifact

- **WHEN** user clicks Download on a plan artifact
- **THEN** the file SHALL be downloaded with `.md` extension

### Requirement: Plan artifact type label

The Artifacts Panel footer SHALL display "Plan" as the type label for plan artifacts.

#### Scenario: Plan artifact footer label

- **WHEN** a plan artifact is active
- **THEN** the footer SHALL display the type label from i18n key `artifacts.plan`
