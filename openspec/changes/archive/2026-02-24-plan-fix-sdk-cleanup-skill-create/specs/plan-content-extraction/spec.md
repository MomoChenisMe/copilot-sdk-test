## ADDED Requirements

### Requirement: Extract structured plan content from raw LLM response

The `plan-writer` module SHALL export an `extractPlanContent(raw: string): string` function that strips conversational preamble from the raw LLM response, returning only the structured plan content starting from the first markdown heading.

#### Scenario: Raw content with conversational preamble before heading

- **WHEN** `extractPlanContent` is called with a string that contains non-heading text followed by a markdown heading (e.g., `"Perfect! Let me analyze...\n\n# Plan Title\n..."`)
- **THEN** the function MUST return the substring starting from the first markdown heading to the end, trimmed of trailing whitespace

#### Scenario: Raw content starting directly with heading

- **WHEN** `extractPlanContent` is called with a string that starts with a markdown heading (e.g., `"# Plan Title\n..."`)
- **THEN** the function MUST return the trimmed original content unchanged

#### Scenario: Raw content with no markdown headings

- **WHEN** `extractPlanContent` is called with a string that contains no markdown headings at all
- **THEN** the function MUST return the trimmed original content (no content loss)

#### Scenario: Empty or whitespace-only content

- **WHEN** `extractPlanContent` is called with an empty string or whitespace-only string
- **THEN** the function MUST return an empty string

#### Scenario: Heading levels 1-3 are recognized

- **WHEN** `extractPlanContent` is called with content that has `#`, `##`, or `###` headings preceded by conversational text
- **THEN** the function MUST correctly identify the first heading at any of these levels and strip the preamble

### Requirement: StreamManager uses extractPlanContent for plan artifacts

The `StreamManager` SHALL call `extractPlanContent()` on the accumulated content segments before writing the plan file and creating the plan artifact, ensuring only structured content is persisted and broadcast.

#### Scenario: Plan mode idle event produces clean plan content

- **WHEN** a `copilot:idle` event occurs during a plan mode stream
- **AND** the accumulated content segments contain conversational preamble followed by a structured plan with headings
- **THEN** the system MUST write only the extracted plan content (without preamble) to the plan file
- **AND** the `planArtifact.content` in the idle broadcast MUST contain only the extracted plan content

#### Scenario: Plan content with no preamble passes through unchanged

- **WHEN** a `copilot:idle` event occurs during a plan mode stream
- **AND** the accumulated content starts directly with a markdown heading
- **THEN** the written plan file and plan artifact content MUST match the original accumulated content (trimmed)

### Requirement: Strip trailing conversational text from plan content

The `extractPlanContent` function SHALL also strip trailing conversational text that appears after the structured plan content. This handles cases where the LLM appends questions or confirmations (e.g., "需要我開始實現嗎？") that should use the `ask_user` tool instead of inline text.

#### Scenario: Trailing question directed at user

- **WHEN** `extractPlanContent` is called with content that has structured plan sections followed by a trailing paragraph containing a question mark (`?` or `？`)
- **AND** the trailing paragraph has no markdown structural markers
- **THEN** the function MUST strip the trailing paragraph and return only the structured plan content

#### Scenario: Trailing confirmation phrase

- **WHEN** `extractPlanContent` is called with content that has structured plan sections followed by a trailing paragraph starting with a confirmation word (e.g., "搞定！", "Perfect!", "Done!")
- **AND** the trailing paragraph has no markdown structural markers
- **THEN** the function MUST strip the trailing paragraph

#### Scenario: Legitimate content paragraph is preserved

- **WHEN** `extractPlanContent` is called with content where the last paragraph is a regular content paragraph (no conversational markers)
- **THEN** the function MUST NOT strip the paragraph — it is retained as plan content

#### Scenario: Structured trailing block is preserved

- **WHEN** the last block after `\n\n` starts with markdown structural markers (headings, list items, bold text, etc.)
- **THEN** the function MUST NOT strip it regardless of content
