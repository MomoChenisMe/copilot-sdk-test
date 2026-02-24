## ADDED Requirements

### Requirement: Plan Prompt file management

The system SHALL manage a separate `PLAN_PROMPT.md` file in the prompts data directory (`backend/data/prompts/`). The file SHALL be initialized with `DEFAULT_PLAN_PROMPT` content on first run if it does not exist.

#### Scenario: First startup creates PLAN_PROMPT.md

- **WHEN** the server starts and `PLAN_PROMPT.md` does not exist in the prompts directory
- **THEN** the file SHALL be created with the default plan prompt content

### Requirement: Plan Prompt REST API

The system SHALL provide three API endpoints for managing the plan prompt:

- `GET /api/prompts/plan-prompt` — returns `{ content: string }`
- `PUT /api/prompts/plan-prompt` — accepts `{ content: string }`, returns `{ ok: true }`
- `POST /api/prompts/plan-prompt/reset` — resets to default, returns `{ content: string }`

#### Scenario: Read plan prompt

- **WHEN** `GET /api/prompts/plan-prompt` is called
- **THEN** response SHALL be `200 { content: "<plan prompt content>" }`

#### Scenario: Update plan prompt

- **WHEN** `PUT /api/prompts/plan-prompt` is called with `{ content: "custom plan instructions" }`
- **THEN** `PLAN_PROMPT.md` SHALL be updated
- **AND** response SHALL be `200 { ok: true }`

#### Scenario: Reset plan prompt

- **WHEN** `POST /api/prompts/plan-prompt/reset` is called
- **THEN** `PLAN_PROMPT.md` SHALL be overwritten with `DEFAULT_PLAN_PROMPT`
- **AND** response SHALL return the default content

### Requirement: Prompt composer mode-aware injection

The `PromptComposer.compose()` method SHALL accept an optional `mode` parameter (`'plan' | 'act'`). When mode is `'plan'`, the composer SHALL inject the content of `PLAN_PROMPT.md` as an additional section after `SYSTEM_PROMPT.md`.

#### Scenario: Compose with plan mode

- **WHEN** `compose(cwd, locale, 'plan')` is called
- **THEN** the resulting prompt SHALL include both SYSTEM_PROMPT.md and PLAN_PROMPT.md content

#### Scenario: Compose with act mode or no mode

- **WHEN** `compose(cwd, locale, 'act')` or `compose(cwd, locale)` is called
- **THEN** the resulting prompt SHALL NOT include PLAN_PROMPT.md content

### Requirement: Settings UI Plan Mode Prompt section

The Settings panel's System Prompt tab SHALL display two sections:
1. "System Prompt" — the existing system prompt textarea (for Act Mode)
2. "Plan Mode Prompt" — a new textarea for editing plan mode instructions

Each section SHALL have its own Save and Reset to Default buttons.

#### Scenario: User edits Plan Mode Prompt

- **WHEN** user modifies the Plan Mode Prompt textarea and clicks Save
- **THEN** `PUT /api/prompts/plan-prompt` SHALL be called with the new content
- **AND** a success toast SHALL be shown

#### Scenario: User resets Plan Mode Prompt

- **WHEN** user clicks Reset to Default on the Plan Mode Prompt section
- **THEN** a confirmation dialog SHALL appear
- **AND** on confirm, `POST /api/prompts/plan-prompt/reset` SHALL be called
- **AND** the textarea SHALL update with the default content

## MODIFIED Requirements

### Requirement: Enhanced Act Mode default system prompt

The `DEFAULT_SYSTEM_PROMPT` SHALL be updated with comprehensive Act Mode guidance including:

1. **Tool Usage Rules**: Dedicated tools MUST be preferred over Bash (File Read over cat, File Edit over sed, File Search over find, Grep over grep). Independent tool calls SHOULD be parallelized.
2. **Git Safety Protocol**: NEVER force push, reset --hard, skip hooks, or amend without explicit user request. Prefer specific file staging over `git add -A`. Never commit sensitive files.
3. **Cautious Execution**: Evaluate reversibility and blast radius. Confirm destructive/irreversible actions. When blocked, think of alternatives instead of brute-forcing. Protect user's in-progress work.
4. **Code Quality**: Avoid over-engineering (YAGNI). Don't add features beyond what was asked. Don't add error handling for impossible scenarios. Three similar lines are better than premature abstraction.
5. **Response Style**: Concise, no emoji unless requested, reference code as `file_path:line_number`, don't add docstrings/comments to unchanged code.

#### Scenario: Default system prompt includes Git safety

- **WHEN** a new system prompt is initialized or reset to default
- **THEN** it SHALL contain a Git Safety Protocol section with rules about force push, hooks, amend, and sensitive files

#### Scenario: Default system prompt includes tool usage rules

- **WHEN** a new system prompt is initialized or reset to default
- **THEN** it SHALL contain tool usage rules specifying dedicated tools over Bash

### Requirement: Enhanced Plan Mode default prompt (5-phase workflow)

The `DEFAULT_PLAN_PROMPT` SHALL define a 5-phase structured planning workflow:

1. **Phase 1: Understanding** — Parse requirements, identify scope and constraints, use ask_user to clarify ambiguities
2. **Phase 2: Exploration** — Explore relevant code areas, identify existing patterns and conventions
3. **Phase 3: Design** — Propose 2-3 approaches with trade-offs, recommend one with justification, use ask_user for non-trivial decisions
4. **Phase 4: Structured Plan** — Output markdown with Context, Approach, Files table, Verification sections
5. **Phase 5: User Confirmation** — Present plan for review, ask user to approve via ask_user

#### Scenario: Plan mode uses 5-phase workflow

- **WHEN** the AI operates in plan mode with the default plan prompt
- **THEN** it SHALL follow the 5-phase workflow structure
- **AND** it SHALL use ask_user tool to clarify requirements and get design decisions

### Requirement: StreamManager passes mode to compose

The `StreamManager` SHALL pass the current stream mode to `PromptComposer.compose()` when constructing the system prompt for a new session.

#### Scenario: Plan mode stream gets plan prompt

- **WHEN** a stream is started with `mode: 'plan'`
- **THEN** the system prompt SHALL include plan mode instructions from PLAN_PROMPT.md
