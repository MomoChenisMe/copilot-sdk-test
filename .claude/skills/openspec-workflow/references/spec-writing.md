# Spec Writing Guide

How to write clear, testable specifications using RFC 2119 keywords and structured scenarios.

## Table of Contents

- [RFC 2119 Keywords](#rfc-2119-keywords)
- [Writing Requirements](#writing-requirements)
- [Given/When/Then Scenarios](#givenwhenthen-scenarios)
- [Delta Prefixes](#delta-prefixes)
- [Common Pitfalls](#common-pitfalls)

---

## RFC 2119 Keywords

Use these keywords with precise meaning. Always write them in **UPPERCASE** within spec statements.

| Keyword | Meaning |
|---------|---------|
| **MUST** | Absolute requirement. No exceptions. |
| **MUST NOT** | Absolute prohibition. No exceptions. |
| **SHOULD** | Strong recommendation. Valid exceptions may exist, but must be understood and weighed. |
| **SHOULD NOT** | Strong discouragement. Valid exceptions may exist, but must be justified. |
| **MAY** | Truly optional. Implementations can include or omit without consequence. |

### Usage examples

- "The system **MUST** validate email format before saving." — Non-negotiable.
- "The system **SHOULD** send a confirmation email within 5 seconds." — Expected, but a slight delay is acceptable.
- "The system **MAY** cache the result for subsequent requests." — Implementation choice, not a requirement.

---

## Writing Requirements

### Structure

```
The system <RFC 2119 keyword> <observable behavior>.
```

Each requirement is a single, atomic statement about one behavior.

### Good vs Bad

| Quality | Example |
|---------|---------|
| Good | "The system MUST return a 404 status when the requested user does not exist." |
| Bad | "The system should handle missing users gracefully." |
| Good | "The system MUST rate-limit login attempts to 5 per minute per IP address." |
| Bad | "The system should be secure against brute force attacks." |
| Good | "The system MUST complete search queries within 200ms for datasets under 10,000 records." |
| Bad | "The system should be fast." |

### Principles

1. **One behavior per statement.** Do not combine multiple requirements. Split "The system MUST validate and store the input" into two statements.
2. **Observable and testable.** If you cannot write a scenario to verify it, the requirement is too vague.
3. **Implementation-agnostic.** Describe what the system does, not how it does it internally. "MUST persist user preferences" not "MUST write to the preferences table in PostgreSQL."
4. **Quantify when possible.** "Within 200ms" is testable. "Quickly" is not.

---

## Given/When/Then Scenarios

Scenarios make requirements concrete and verifiable.

### Format

```
Given <precondition — the state of the world before the action>
When <action — what the user or system does>
Then <expected outcome — what must be true after the action>
```

### Connectors

Use **AND** to add conditions within the same clause. Use **BUT** to express exceptions.

```
Given a logged-in user
  AND the user has admin privileges
When the user accesses the admin dashboard
Then the dashboard loads with full management controls
  AND the audit log records the access event
```

```
Given a logged-in user
  BUT the user does NOT have admin privileges
When the user accesses the admin dashboard URL
Then the system returns a 403 Forbidden response
```

### Multiple scenarios per requirement

A single requirement often needs multiple scenarios to cover the happy path, edge cases, and error conditions.

```
### REQ-12: Password strength validation

The system MUST reject passwords that do not meet the minimum strength criteria.

**Scenario: strong password accepted**
Given a user on the registration page
When the user enters a password with 12+ characters, mixed case, numbers, and symbols
Then the system accepts the password

**Scenario: weak password rejected**
Given a user on the registration page
When the user enters "password123"
Then the system rejects the password with a message explaining the strength requirements

**Scenario: minimum length boundary**
Given a user on the registration page
When the user enters a 7-character password meeting all other criteria
Then the system rejects the password
```

---

## Delta Prefixes

When writing delta specifications (changes relative to current specs), use these prefixes to categorize each requirement.

### ADDED

Net-new behavior. Nothing like this existed before.

```markdown
## ADDED

### REQ-15: Two-factor authentication

The system MUST support TOTP-based two-factor authentication.
```

### MODIFIED

Changed behavior of an existing requirement. Always reference what it was before.

```markdown
## MODIFIED

### REQ-3: Session timeout

**Previously**: Sessions expire after 30 minutes of inactivity.

The system MUST expire sessions after 15 minutes of inactivity.
The system SHOULD display a warning 2 minutes before expiration.
```

### REMOVED

Existing behavior being eliminated. Always state why.

```markdown
## REMOVED

### REQ-8: Legacy XML export

**Reason**: All consumers have migrated to the JSON API. XML export has had
zero usage in the past 6 months.
```

---

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Vague requirements | "The system should be user-friendly" | Specify measurable behavior: "The system MUST complete checkout in 3 steps or fewer" |
| Untestable statements | "The system should perform well under load" | Quantify: "The system MUST handle 1000 concurrent requests with p95 latency under 500ms" |
| Compound requirements | "The system MUST validate input AND send a notification" | Split into two separate requirements |
| Implementation leaking into specs | "The system MUST use Redis to cache sessions" | Describe the behavior: "The system MUST cache active sessions for sub-10ms lookup" |
| Missing edge cases | Only covering the happy path | Add scenarios for: empty input, boundary values, concurrent access, permission denied |
| Ambiguous keywords | Using "should" (lowercase) inconsistently | Always use UPPERCASE RFC 2119 keywords with their precise meaning |
