---
name: sdk-update-analyzer
description: "Analyze @github/copilot-sdk updates to assess impact on this project. Use when reviewing SDK changelog, assessing breaking changes, planning SDK upgrades, diagnosing issues after an SDK version change, or when the user mentions SDK update impact analysis."
---

# SDK Update Analyzer

Analyze `@github/copilot-sdk` updates and assess their impact on this project. Provides structured impact analysis, migration guidance, and compatibility assessment.

## When to Activate

- After updating `@github/copilot-sdk` to a new version
- When evaluating whether to upgrade the SDK
- When diagnosing issues that may be caused by an SDK version change
- When the user asks about SDK breaking changes or migration

## Workflow

### Step 1: Identify Versions

Determine the current and target SDK versions:

- Check `backend/package.json` for the installed version of `@github/copilot-sdk`
- If the user provides a target version, use that
- Otherwise check npm for the latest: `npm view @github/copilot-sdk version`

### Step 2: Fetch Changelog

Retrieve the changelog between the two versions:

- Check GitHub releases: https://github.com/github/copilot-sdk/releases
- Look for entries between the current and target version tags
- If GitHub releases are unavailable, check the repository's CHANGELOG.md
- Parse and summarize key changes relevant to this project

### Step 3: Map Changes to Project Integration Points

Read `references/project-integration-points.md` for the full list of SDK integration points.

For each SDK change, determine:
- Which project files use the affected API
- Whether the change is breaking, deprecating, or additive
- The severity: **critical** (will break), **warning** (deprecated, works now), **info** (new feature available)

Explore the actual source files to verify current usage patterns.

### Step 4: Risk Assessment

Produce a risk assessment table:

| SDK Change | Affected Files | Severity | Action Required |
|------------|---------------|----------|-----------------|
| ... | ... | critical/warning/info | ... |

### Step 5: Migration Recommendations

For each breaking or deprecating change:
- Show the before/after API usage with code examples
- Provide specific code changes needed in this project
- Note any new features that could improve the codebase

### Step 6: Summary

Provide a final summary:
- **Overall risk level**: low / medium / high
- **Estimated effort**: number of files and complexity
- **Recommended action**: upgrade now, wait, or skip this version
- **New opportunities**: SDK features worth adopting

## Output Format

Structure the analysis as a markdown document with these sections:

1. **Version Summary** - from version X to version Y
2. **Changelog Highlights** - key changes relevant to this project
3. **Impact Assessment** - the risk table from Step 4
4. **Migration Guide** - specific code changes needed (with before/after)
5. **New Opportunities** - new SDK features to consider adopting
6. **Recommendation** - final verdict with rationale
