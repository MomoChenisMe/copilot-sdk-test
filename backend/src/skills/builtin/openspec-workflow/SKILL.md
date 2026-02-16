---
name: openspec-workflow
description: Guide structured development workflows using the OpenSpec specification framework. Use when users mention openspec, opsx, spec-driven development, feature planning, change proposals, delta specs, requirement specifications, structured change management, or need help deciding between exploratory vs quick-feature workflows, choosing one-shot vs step-by-step artifact generation, managing parallel changes, writing proposals/design docs/task breakdowns, or understanding when to update vs restart a change.
---

# OpenSpec

A spec-driven collaborative development workflow framework. Align on requirements before writing code — plan the change, specify the delta, design the approach, break down tasks, implement, verify, and archive.

Requires Node.js 20.19.0+. Install: `npm install -g openspec`.

## Core Philosophy

- **Fluid over rigid** — Actions are available based on readiness, not locked behind phases. Skip what is unnecessary, revisit what needs refinement.
- **Iterative over waterfall** — Requirements evolve as understanding deepens. Embrace refinement loops rather than demanding upfront perfection.
- **Simple over complex** — Start lean. Add structure only when the situation demands it.
- **Brownfield-friendly** — Designed for existing codebases. Document what exists, then propose what changes.
- **Scalable** — Works the same way for a solo developer as for a team.

## Project Structure

```
openspec/
├── specs/                    # Source of truth: current system behavior, organized by domain
│   ├── authentication.md
│   └── payments.md
├── changes/                  # Active proposed modifications
│   ├── <change-name>/
│   │   ├── .openspec.yaml   # Change metadata and state
│   │   ├── proposal.md      # Intent, scope, approach
│   │   ├── specs/            # Delta specs (ADDED/MODIFIED/REMOVED)
│   │   ├── design.md        # Technical implementation strategy
│   │   └── tasks.md         # Implementation checklist
│   └── archive/              # Completed changes (timestamped)
└── config.yaml               # Optional project settings
```

- **specs/** is the authoritative record. It describes how the system currently works, not how it will work.
- **changes/** holds in-progress modifications. Each change is self-contained with its own artifacts.
- **archive/** preserves completed changes for historical context.

## Workflow Selection

This is the most critical decision. Assess the situation before recommending a path.

### Decision Tree

```
Is the requirement clear and scope well-defined?
├─ YES → Is the change small-to-medium and straightforward?
│        ├─ YES → Quick Feature workflow
│        └─ NO  → Quick Feature with step-by-step artifact generation
└─ NO  → Do you need to investigate the problem space first?
         ├─ YES → Exploratory workflow
         └─ NO  → Start with a proposal draft, iterate from there
```

```
Are there multiple independent work streams?
└─ YES → Parallel Changes pattern (each stream follows its own workflow)
```

### Quick Feature Workflow

**When to use**: Requirements are clear, scope is bounded, the team knows what to build.

**Flow**: Propose → Specify deltas → Design → Task breakdown → Implement → Verify → Archive

**Characteristics**:
- All planning artifacts can be generated in one pass
- Best for: bug fixes, small-to-medium features, well-defined enhancements
- Typical planning phase: minutes, not hours

**Example scenario**: "Add avatar upload to user profiles" — the feature is well-understood, boundaries are clear, no deep investigation needed.

### Exploratory Workflow

**When to use**: Requirements are unclear, multiple approaches exist, the problem space needs investigation before committing.

**Flow**: Explore → (clarity emerges) → Propose → Specify → Design → Tasks → Implement → Verify → Archive

**Characteristics**:
- Begin with open-ended investigation: analyze codebase patterns, compare approaches, surface trade-offs
- No artifacts are created during exploration — it is purely for thinking
- Transition to formal change creation once a direction crystallizes
- Artifacts are generated step-by-step with review between each

**Example scenario**: "Our authentication is getting complex, we should probably refactor it" — the scope is vague, multiple strategies exist (consolidate providers? extract a service? migrate to OAuth2?), exploration is needed.

**When to transition from exploration to formal change**:
- A clear direction has emerged
- The team agrees on the general approach
- Scope can be articulated in one sentence

### Parallel Changes

**When to use**: Multiple independent modifications are in progress simultaneously.

**How it works**:
- Each change lives in its own directory under `changes/`
- Each follows its own workflow independently (some may be quick, others exploratory)
- Changes can be archived independently when complete
- Multiple completed changes can be bulk-archived together

**Watch for**: If two changes touch the same specs, archive and sync one before starting artifact generation for the other to avoid merge conflicts.

## Artifact Generation Strategy

Once inside a workflow, decide how artifacts are produced.

### One-shot Generation

Generate all planning artifacts (proposal → specs → design → tasks) in a single pass.

**Choose when**:
- Scope is clear and agreed upon
- Time pressure — need to start implementation quickly
- The change is well-understood by the team
- No need for intermediate review or feedback

### Step-by-step Generation

Generate one artifact at a time, review, then proceed to the next.

**Choose when**:
- The change is complex and benefits from incremental validation
- Stakeholders need to review each artifact before proceeding
- Requirements may shift based on what the design reveals
- The team wants to iterate on the proposal before committing to specs

### Guideline

Default to one-shot for straightforward work. Switch to step-by-step the moment complexity, uncertainty, or stakeholder involvement increases. It is always valid to start one-shot and switch to step-by-step mid-flow if an artifact reveals unexpected complexity.

## Change Lifecycle

Each stage has a clear purpose, output, and exit criteria.

### 1. Proposal

**Purpose**: Capture the intent, scope, and high-level approach. Answer "why are we doing this?" and "what are we changing?"

**Output**: `proposal.md`

**Move to next stage when**: The problem statement is clear, scope (in-scope / out-of-scope) is defined, and the general approach is agreed upon.

### 2. Delta Specifications

**Purpose**: Document exactly what changes relative to the current system. Not a rewrite of all specs — only what is ADDED, MODIFIED, or REMOVED.

**Output**: Files in `changes/<name>/specs/` mirroring the domain structure of `openspec/specs/`

**Move to next stage when**: All requirement changes are captured, each with testable scenarios (Given/When/Then).

For detailed guidance on writing specs, see [references/spec-writing.md](references/spec-writing.md).

### 3. Design

**Purpose**: Detail the technical implementation strategy. Answer "how will we build this?" and "why this approach over alternatives?"

**Output**: `design.md`

**Move to next stage when**: Architecture decisions are made, data model changes are identified, and the approach is justified.

### 4. Task Breakdown

**Purpose**: Convert the design into independently verifiable implementation steps.

**Output**: `tasks.md` (checkbox format)

**Move to next stage when**: Tasks are granular enough that each can be completed and verified independently.

### 5. Implementation

**Purpose**: Execute the tasks.

**Move to next stage when**: All task checkboxes are checked.

### 6. Verification

**Purpose**: Validate implementation against specifications across three dimensions (see below).

**Move to next stage when**: All critical issues are resolved. Warnings may remain with justification.

### 7. Archive

**Purpose**: Finalize the change. Delta specs merge into main `specs/`, the change folder moves to `archive/`.

**Complete when**: Specs are synced and the change directory is archived.

For detailed artifact templates and writing guidance, see [references/artifacts.md](references/artifacts.md).

## Verification Dimensions

After implementation, verify against three dimensions:

### Completeness

- Are all tasks marked as done?
- Is every requirement from the delta specs implemented?
- Are all scenarios covered by the implementation?

### Correctness

- Does the implementation match the spec intent (not just the letter)?
- Are edge cases handled?
- Do scenario Given/When/Then conditions produce the expected outcomes?

### Coherence

- Are design decisions consistently reflected in the code?
- Do patterns remain consistent across the codebase?
- Is the implementation internally consistent (no contradictions between components)?

Verification surfaces issues classified as **CRITICAL** (must fix), **WARNING** (should address), or **SUGGESTION** (nice to have). Verification does not block archiving — it informs the decision.

## When to Update vs Restart

### Update the existing change when

- The intent has not changed, only the execution approach is refined
- Scope is being narrowed, not expanded
- Corrections stem from implementation learnings (design tweaks, task adjustments)
- The original proposal still accurately describes the goal

### Start a fresh change when

- The intent has fundamentally shifted ("we started with refactoring auth but now we're rebuilding it")
- Scope has exploded beyond the original boundary
- The original change can stand on its own and be archived independently
- Patching the existing artifacts would cause confusion rather than clarity

**Rule of thumb**: If you would need to rewrite more than half the proposal, start fresh.

## Guidance Rules

1. **Assess before recommending.** Evaluate the user's requirement clarity and scope definition before suggesting a workflow. Ask clarifying questions if the situation is ambiguous.
2. **Match workflow to situation.** Do not default to the same workflow every time. Let the decision tree guide the choice.
3. **When writing artifacts**, read [references/artifacts.md](references/artifacts.md) for templates and writing principles.
4. **When writing specifications**, read [references/spec-writing.md](references/spec-writing.md) for RFC 2119 keyword usage, Given/When/Then patterns, and delta prefix conventions.
5. **Keep changes focused.** One logical unit of work per change. If scope creep is detected, suggest splitting into separate changes.
6. **Verify before archiving.** Always run verification. Do not skip directly to archive.
7. **Name changes descriptively.** Use names like `add-dark-mode` or `refactor-auth`, not `feature-1` or `update-3`.
