## MODIFIED Requirements

### Requirement: Prompt file naming

The system SHALL use `AUTOPILOT_PROMPT.md` as the prompt file for autopilot mode, replacing the previous `ACT_PROMPT.md`.

#### Scenario: File store initializes AUTOPILOT_PROMPT.md

- **WHEN** `ensureDirectories()` is called and `AUTOPILOT_PROMPT.md` does not exist
- **THEN** the system SHALL create `AUTOPILOT_PROMPT.md` with the default autopilot prompt content

#### Scenario: Migration from ACT_PROMPT.md

- **WHEN** `ensureDirectories()` is called and `ACT_PROMPT.md` exists but `AUTOPILOT_PROMPT.md` does not
- **THEN** the system SHALL rename `ACT_PROMPT.md` to `AUTOPILOT_PROMPT.md` to preserve user customizations

#### Scenario: Both files exist (no-op)

- **WHEN** `ensureDirectories()` is called and both `ACT_PROMPT.md` and `AUTOPILOT_PROMPT.md` exist
- **THEN** the system SHALL use `AUTOPILOT_PROMPT.md` and leave `ACT_PROMPT.md` untouched

### Requirement: PromptComposer injects mode-specific prompts

The PromptComposer SHALL inject the appropriate mode-specific prompt file based on the current mode.

#### Scenario: Plan mode injects PLAN_PROMPT.md

- **WHEN** `compose()` is called with `mode = 'plan'`
- **THEN** the composed prompt SHALL include the content of `PLAN_PROMPT.md` after `SYSTEM_PROMPT.md`

#### Scenario: Autopilot mode injects AUTOPILOT_PROMPT.md

- **WHEN** `compose()` is called with `mode = 'autopilot'` or `mode = undefined`
- **THEN** the composed prompt SHALL include the content of `AUTOPILOT_PROMPT.md` after `SYSTEM_PROMPT.md`

#### Scenario: Empty prompt file is skipped

- **WHEN** the mode-specific prompt file (PLAN_PROMPT.md or AUTOPILOT_PROMPT.md) is empty or contains only whitespace
- **THEN** the composer SHALL skip it and not include a blank section in the output

### Requirement: Default prompt constants

The default prompt constants SHALL use `DEFAULT_AUTOPILOT_PROMPT` (renamed from `DEFAULT_ACT_PROMPT`) and `DEFAULT_PLAN_PROMPT`.

#### Scenario: DEFAULT_AUTOPILOT_PROMPT content

- **WHEN** the default autopilot prompt is generated
- **THEN** the content SHALL have a heading of "Autopilot Mode" (replacing "Act Mode")

#### Scenario: DEFAULT_SYSTEM_PROMPT references autopilot

- **WHEN** the default system prompt is generated
- **THEN** the "Modes of Operation" section SHALL reference "Autopilot Mode (Default)" instead of "Act Mode (Default)"

### Requirement: REST API for autopilot prompt

The system SHALL provide REST API endpoints for managing the autopilot prompt file.

#### Scenario: GET /api/prompts/autopilot-prompt

- **WHEN** a GET request is made to `/api/prompts/autopilot-prompt`
- **THEN** the system SHALL return `200` with `{ content: string }` containing the current AUTOPILOT_PROMPT.md content

#### Scenario: PUT /api/prompts/autopilot-prompt

- **WHEN** a PUT request is made to `/api/prompts/autopilot-prompt` with body `{ content: string }`
- **THEN** the system SHALL write the content to AUTOPILOT_PROMPT.md and return `200` with `{ ok: true }`

#### Scenario: POST /api/prompts/autopilot-prompt/reset

- **WHEN** a POST request is made to `/api/prompts/autopilot-prompt/reset`
- **THEN** the system SHALL reset AUTOPILOT_PROMPT.md to `DEFAULT_AUTOPILOT_PROMPT` and return `200` with `{ content: string }`

#### Scenario: Legacy /act-prompt endpoints are aliased

- **WHEN** a request is made to `/api/prompts/act-prompt` (GET, PUT, or POST reset)
- **THEN** the system SHALL handle it identically to the corresponding `/api/prompts/autopilot-prompt` endpoint (reading/writing AUTOPILOT_PROMPT.md)
