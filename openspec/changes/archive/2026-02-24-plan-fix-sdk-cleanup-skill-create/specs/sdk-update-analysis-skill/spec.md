## ADDED Requirements

### Requirement: SDK update analyzer skill definition

A Claude skill SHALL be created at `.claude/skills/sdk-update-analyzer/SKILL.md` that provides a structured workflow for analyzing `@github/copilot-sdk` updates and assessing their impact on the project.

#### Scenario: Skill file exists with correct frontmatter

- **WHEN** the skill file store scans `.claude/skills/`
- **THEN** it MUST discover `sdk-update-analyzer` as a valid skill
- **AND** the SKILL.md MUST have YAML frontmatter with `name: sdk-update-analyzer` and a `description` field

#### Scenario: Skill triggers on SDK update analysis requests

- **WHEN** a user asks about SDK update impact, breaking changes, or migration planning for `@github/copilot-sdk`
- **THEN** the skill description MUST match these use cases for proper triggering

#### Scenario: Skill defines a 6-step analysis workflow

- **WHEN** the skill is activated
- **THEN** SKILL.md MUST define the following sequential steps:
  1. Identify versions (current vs target)
  2. Fetch changelog from GitHub releases (https://github.com/github/copilot-sdk/releases)
  3. Map SDK changes to project integration points
  4. Produce a risk assessment table
  5. Generate migration recommendations with specific code changes
  6. Summarize with overall risk level and recommendation

#### Scenario: Skill output includes risk assessment table

- **WHEN** the skill completes its analysis
- **THEN** the output MUST include a table with columns: SDK Change, Affected Files, Severity, Action Required

### Requirement: Project integration points reference document

A reference document SHALL be created at `.claude/skills/sdk-update-analyzer/references/project-integration-points.md` that documents all locations in the project where the copilot SDK is used.

#### Scenario: Reference document covers all SDK integration files

- **WHEN** the reference document is read by Claude during skill execution
- **THEN** it MUST list the following integration points with file paths and usage descriptions:
  - `backend/src/copilot/client-manager.ts` (CopilotClient lifecycle)
  - `backend/src/copilot/stream-manager.ts` (event stream processing)
  - `backend/src/copilot/event-relay.ts` (SDK event to WebSocket relay)
  - `backend/src/copilot/session-manager.ts` (session create/resume)
  - `backend/src/copilot/permission.ts` (permission/confirmation handling)
  - `backend/src/copilot/sdk-update.ts` (version detection)

#### Scenario: Reference document identifies sensitivity areas

- **WHEN** the reference document is consulted for impact analysis
- **THEN** it MUST identify the following as high-sensitivity areas:
  - Event format changes (stream-manager.ts event handler switch statement)
  - Session creation API (session-manager.ts)
  - Authentication flow (client-manager.ts)
  - Tool execution protocol (permission.ts, stream-manager.ts tool handlers)
