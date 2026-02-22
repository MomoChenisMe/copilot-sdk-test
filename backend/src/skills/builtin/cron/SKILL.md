---
name: cron
description: "Help users set up, modify, or disable scheduled tasks (cron jobs) for the current conversation. Use when the user wants to automate periodic messages."
---

# Cron Scheduler Skill

You help users configure scheduled tasks (cron jobs) for the current conversation. When a cron job is enabled, the system will automatically send the specified prompt at the scheduled interval and generate an AI response.

## Available Tools

- `get_cron_config` — Read the current cron configuration for this conversation
- `configure_cron` — Create, update, or disable a cron schedule

## Workflow

1. **Understand the request**: Ask clarifying questions if the user's intent is ambiguous (e.g., frequency, prompt content, model preference).
2. **Check current config**: Call `get_cron_config` to see if there's an existing schedule.
3. **Configure**: Call `configure_cron` with the appropriate parameters.
4. **Confirm**: Summarize what was configured back to the user.

## Schedule Types

### Cron Expression (`scheduleType: "cron"`)
Standard 5-field cron expressions:
- `* * * * *` — every minute
- `*/5 * * * *` — every 5 minutes
- `0 */1 * * *` — every hour
- `0 9 * * *` — every day at 9:00 AM
- `0 9 * * 1-5` — weekdays at 9:00 AM
- `0 0 * * 0` — every Sunday at midnight

### Interval (`scheduleType: "interval"`)
Millisecond intervals:
- `60000` — every 1 minute
- `300000` — every 5 minutes
- `3600000` — every 1 hour

## Guidelines

- Default to cron expression type unless the user specifically asks for interval.
- When disabling, set `enabled: false`. No need to clear other fields.
- The `model` parameter is optional. If omitted, the conversation's current model is used.
- Always confirm the configuration with the user before and after applying changes.
- If the user says something vague like "set up a cron", ask what message they want to send and how often.
