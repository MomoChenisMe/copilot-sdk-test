## MODIFIED Requirements

### Requirement: Plan Mode uses 5-phase structured workflow

The default Plan Mode prompt SHALL define a 5-phase workflow:

1. **Phase 1: Understanding** — Parse requirements, identify scope/constraints, use ask_user to clarify ambiguities. Do NOT proceed until requirements are clear.
2. **Phase 2: Exploration** — Explore relevant codebase areas, identify patterns and conventions, list specific files and functions.
3. **Phase 3: Design** — Propose 1-3 approaches with pros/cons, recommend one. Use ask_user for non-trivial design decisions.
4. **Phase 4: Structured Plan** — Output plan as markdown with: Context (why), Approach (step-by-step), Files table (path/action/description), Verification (how to test).
5. **Phase 5: Confirmation** — Present plan for user review via ask_user. Instruct user to switch to Act mode upon approval.

#### Scenario: Plan mode follows 5-phase workflow

- **WHEN** user activates plan mode and sends a request
- **THEN** the AI SHALL follow the 5-phase workflow as defined in PLAN_PROMPT.md
- **AND** ambiguous requirements SHALL trigger ask_user in Phase 1
- **AND** the final plan SHALL be formatted as structured markdown

#### Scenario: Plan mode uses ask_user for clarification

- **WHEN** the AI encounters ambiguous or unclear requirements during planning
- **THEN** the AI SHALL use the ask_user tool to clarify before proceeding
- **AND** the ask_user question SHALL be specific and include suggested options when possible

### Requirement: Plan Mode prompt is separate from System Prompt

The Plan Mode prompt SHALL be stored in a separate file (`PLAN_PROMPT.md`) and injected only when the current mode is `plan`. The `DEFAULT_SYSTEM_PROMPT` Plan Mode section SHALL be simplified to reference the separate prompt.

#### Scenario: DEFAULT_SYSTEM_PROMPT Plan Mode section is simplified

- **WHEN** the default system prompt is read
- **THEN** the Plan Mode section SHALL contain only key principles (no tools, be specific, concise plans)
- **AND** the detailed 5-phase workflow SHALL NOT be inline but loaded from PLAN_PROMPT.md

### Requirement: Plan content output as artifact

When plan mode completes and produces a plan, the plan markdown SHALL be delivered to the frontend as an artifact (type `plan`) rather than only described in chat text.

#### Scenario: Plan generates artifact

- **WHEN** plan mode stream reaches idle with accumulated content
- **THEN** the plan SHALL be saved to file (existing behavior)
- **AND** the plan SHALL be sent as a `plan` type artifact to the frontend
- **AND** the Artifacts Panel SHALL open automatically with the plan displayed
