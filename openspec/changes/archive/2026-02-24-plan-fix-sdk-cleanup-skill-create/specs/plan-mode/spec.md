## MODIFIED Requirements

### Requirement: Plan mode banner 顯示條件

Plan mode 提示橫幅 MUST 僅在 tab mode 為 `copilot` 時顯示。當 tab mode 為 `terminal`（Bash 模式）或 `cron` 時，即使 `planMode` 狀態為 `true`，banner MUST NOT 顯示。切回 `copilot` mode 時，若 `planMode` 仍為 `true`，banner MUST 重新顯示。

#### Scenario: Copilot 模式下顯示 plan banner
- **WHEN** tab 的 `planMode` 為 `true` 且 `mode` 為 `copilot`
- **THEN** 頁面頂部顯示 amber 色 Plan mode 提示橫幅

#### Scenario: Bash 模式下隱藏 plan banner
- **WHEN** tab 的 `planMode` 為 `true` 且 `mode` 為 `terminal`
- **THEN** Plan mode 提示橫幅不顯示

#### Scenario: 從 Bash 切回 Copilot 模式時恢復顯示
- **WHEN** 使用者從 terminal mode 切回 copilot mode，且 `planMode` 仍為 `true`
- **THEN** Plan mode 提示橫幅重新顯示

## ADDED Requirements

### Requirement: Plan prompt output format constraints

The `DEFAULT_PLAN_PROMPT` SHALL include explicit output format rules that instruct the LLM to begin its response directly with a markdown heading, prohibiting conversational preamble.

#### Scenario: Plan prompt includes output format section

- **WHEN** the system composes the plan mode system prompt via `PromptComposer.compose(cwd, locale, 'plan')`
- **THEN** the resulting prompt MUST contain an "Output Format Rules" section
- **AND** the section MUST instruct the model to begin responses with a markdown heading (`#` or `##`)
- **AND** the section MUST prohibit conversational text, greetings, or acknowledgments before the plan content

#### Scenario: LLM produces heading-first plan output

- **WHEN** the LLM follows the plan prompt output format rules
- **THEN** the response MUST begin with a markdown heading (e.g., `# Context`, `## Plan Title`)
- **AND** the response MUST NOT contain any non-plan conversational text

### Requirement: Plan prompt language enforcement

The `DEFAULT_PLAN_PROMPT` Output Format Rules SHALL include a rule that enforces the LLM to write the plan document in the language specified by the system prompt's Language instruction.

#### Scenario: Plan output respects LLM language setting

- **WHEN** the system prompt contains a Language instruction (e.g., "Always respond in 繁體中文（台灣）")
- **AND** the LLM is in plan mode
- **THEN** the plan document — headings, descriptions, and explanations — MUST be written in the specified language
- **AND** technical terms and code identifiers MUST remain in their original form

#### Scenario: No language instruction present

- **WHEN** the system prompt does not contain a Language instruction (English is default)
- **THEN** the plan document MUST be written in English
