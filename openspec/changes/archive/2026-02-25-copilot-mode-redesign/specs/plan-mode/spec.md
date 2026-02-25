## MODIFIED Requirements

### Requirement: Plan mode injects custom prompt via SDK append

When plan mode is active, the PromptComposer SHALL inject the PLAN_PROMPT.md content into the SDK system message using `{ mode: 'append' }`, allowing the SDK's native plan mode behavior to remain intact while adding project-specific instructions.

#### Scenario: Plan mode system message includes PLAN_PROMPT.md

- **WHEN** a stream is started with `mode = 'plan'`
- **THEN** the system SHALL compose the system message by appending PLAN_PROMPT.md content and pass it to the SDK via `systemMessage: { mode: 'append', content: composedPrompt }`

#### Scenario: SDK native plan mode behavior is preserved

- **WHEN** plan mode is active with the appended system message
- **THEN** the SDK SHALL still enforce its native plan mode behavior (read-only tool execution, plan.md generation) in addition to the appended project-specific instructions

#### Scenario: Plan mode compose signature

- **WHEN** `compose()` is called
- **THEN** the `mode` parameter SHALL accept `'plan' | 'autopilot'` (replacing the previous `'plan' | 'act'`)
