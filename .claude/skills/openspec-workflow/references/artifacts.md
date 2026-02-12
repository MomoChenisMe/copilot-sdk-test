# Artifact Writing Guide

Templates and writing principles for each OpenSpec artifact.

## Table of Contents

- [Proposal](#proposal)
- [Delta Specs](#delta-specs)
- [Design](#design)
- [Tasks](#tasks)

---

## Proposal

**What it captures**: Intent, scope, and strategic approach — the "why" and "what" of the change.

**Writing principles**:
- Focus on the problem and desired outcome, not implementation details
- Define explicit boundaries (in-scope / out-of-scope)
- Keep it readable by non-technical stakeholders
- Use imperative mood ("Add avatar upload support", not "Avatar upload support will be added")

### Template

```markdown
# <Change Name>

## Problem Statement

<What problem exists? Why does it matter? Who is affected?>

## Proposed Solution

<High-level description of the approach. One paragraph.>

## Scope

### In Scope
- <Specific deliverable 1>
- <Specific deliverable 2>

### Out of Scope
- <Explicitly excluded item 1>
- <Explicitly excluded item 2>

## Approach

<Brief strategic approach. How will this be tackled at a high level?>

## Dependencies

- <External dependency or prerequisite, if any>

## Risks

- <Known risk and mitigation strategy>
```

### Example

```markdown
# Add Dark Mode

## Problem Statement

Users working in low-light environments report eye strain. 40% of support tickets
in the past month mention brightness or theme preferences.

## Proposed Solution

Add a system-wide dark mode toggle that applies a dark color scheme across all
application screens while respecting OS-level preferences.

## Scope

### In Scope
- Dark color palette for all existing components
- Theme toggle in user settings
- OS preference detection and auto-switching

### Out of Scope
- Per-page theme customization
- Custom user-defined color schemes
- Dark mode for admin dashboard (separate change)

## Approach

Implement a theme context provider at the application root. Define a dark color
token set that mirrors the existing light tokens. Components consume tokens via
CSS custom properties — no component-level changes needed.

## Risks

- Third-party components may not respect theme tokens — mitigate by auditing
  all vendor components before implementation.
```

---

## Delta Specs

**What it captures**: Exactly what changes relative to the current system specifications. Not a full rewrite — only the delta.

**Writing principles**:
- Mirror the domain directory structure of `openspec/specs/`
- Use three prefixes: **ADDED**, **MODIFIED**, **REMOVED**
- Every requirement uses RFC 2119 keywords (MUST, SHOULD, MAY)
- Every requirement includes at least one testable scenario (Given/When/Then)
- Reference the original spec when modifying or removing

For RFC 2119 keyword usage and scenario writing details, see [spec-writing.md](spec-writing.md).

### Prefix Semantics

| Prefix | Meaning | When to use |
|--------|---------|-------------|
| **ADDED** | New behavior that did not exist before | Introducing net-new functionality |
| **MODIFIED** | Changed behavior of an existing requirement | Altering how something currently works |
| **REMOVED** | Existing behavior that is being eliminated | Deprecating or removing functionality |

### Archive behavior

When a change is archived and synced:
- **ADDED** items append to the corresponding main spec file
- **MODIFIED** items replace the matching requirement in main specs
- **REMOVED** items delete the matching requirement from main specs

### Template

```markdown
# <Domain Name> — Delta Spec

## ADDED

### <Requirement ID>: <Short title>

The system MUST <behavior description>.

**Scenario: <scenario name>**
Given <precondition>
When <action>
Then <expected outcome>

## MODIFIED

### <Original Requirement ID>: <Short title>

**Previously**: <summary of old behavior>

The system MUST <new behavior description>.

**Scenario: <scenario name>**
Given <precondition>
When <action>
Then <expected outcome>

## REMOVED

### <Original Requirement ID>: <Short title>

**Reason**: <why this is being removed>
```

### Example

```markdown
# User Profile — Delta Spec

## ADDED

### UP-7: Avatar upload

The system MUST allow users to upload a profile avatar in JPEG or PNG format.
The system MUST reject files larger than 5MB.
The system SHOULD generate a 128x128 thumbnail upon upload.

**Scenario: successful avatar upload**
Given a logged-in user on the profile settings page
When the user uploads a 2MB JPEG image
Then the system stores the original and displays a 128x128 thumbnail

**Scenario: oversized file rejection**
Given a logged-in user on the profile settings page
When the user uploads a 6MB PNG image
Then the system rejects the upload with an error message

## MODIFIED

### UP-3: Profile completeness indicator

**Previously**: Completeness calculated from name, email, and bio fields only.

The system MUST include avatar presence in the profile completeness calculation.

**Scenario: completeness with avatar**
Given a user with name, email, bio, and avatar all set
When the profile completeness is calculated
Then the result is 100%
```

---

## Design

**What it captures**: Technical implementation strategy — the "how" and "why this way" of the change.

**Writing principles**:
- Focus on architecture decisions and their rationale
- Address data model changes explicitly
- Document trade-offs and alternatives considered (briefly)
- Keep it technical but scannable — use headings and lists

### Template

```markdown
# <Change Name> — Design

## Overview

<One paragraph summarizing the technical approach.>

## Architecture

<How does this fit into the existing system? What components are affected?>

## Data Model

<New or modified tables, schemas, or data structures. Use code blocks for schemas.>

## Key Decisions

### <Decision 1 title>

**Chosen**: <approach>
**Rationale**: <why>
**Alternatives considered**: <brief list>

## Migration Strategy

<How to transition from current state to new state. Include rollback plan if applicable.>
```

---

## Tasks

**What it captures**: An ordered checklist of independently verifiable implementation steps.

**Writing principles**:
- Each task is a single, concrete action
- Each task can be verified in isolation ("How do I know this is done?")
- Group by component, layer, or phase — whichever makes the work clearest
- Order reflects dependency: prerequisite tasks come first
- Use checkbox format for progress tracking

### Template

```markdown
# <Change Name> — Tasks

## <Group 1: e.g., Backend>

- [ ] <Task description — verb phrase, concrete action>
- [ ] <Task description>

## <Group 2: e.g., Frontend>

- [ ] <Task description>
- [ ] <Task description>

## <Group 3: e.g., Testing & Documentation>

- [ ] <Task description>
- [ ] <Task description>
```

### Example

```markdown
# Add Dark Mode — Tasks

## Theme Infrastructure

- [ ] Define dark color token set mirroring existing light tokens
- [ ] Create ThemeContext provider with light/dark state management
- [ ] Add CSS custom property injection at application root

## Components

- [ ] Update Button component to consume theme tokens
- [ ] Update Navigation component to consume theme tokens
- [ ] Update Card component to consume theme tokens
- [ ] Audit third-party components for theme compatibility

## User Settings

- [ ] Add theme toggle switch to settings page
- [ ] Implement OS preference detection via prefers-color-scheme
- [ ] Persist user theme preference to local storage

## Testing

- [ ] Add visual regression tests for dark mode variants
- [ ] Test OS preference auto-switching behavior
- [ ] Verify accessibility contrast ratios in dark mode
```
