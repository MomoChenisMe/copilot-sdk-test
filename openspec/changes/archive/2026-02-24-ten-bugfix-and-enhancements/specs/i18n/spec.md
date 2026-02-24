## MODIFIED Requirements

### Requirement: SDK Update Banner uses i18n — SUPERSEDED

> **Note:** This requirement has been superseded. The `SdkUpdateBanner` component was removed entirely in the `plan-fix-sdk-cleanup-skill-create` change. The SDK auto-update functionality (version checking, changelog, update execution) was removed due to Node.js module caching making runtime updates ineffective. Only the current version display remains in the Settings panel.

~~The `SdkUpdateBanner` component SHALL use i18n translation keys for all user-visible text instead of hardcoded English strings.~~

### Requirement: Plan Mode Prompt settings i18n

The Settings panel SHALL use i18n keys for the Plan Mode Prompt section labels.

Required i18n keys:
- `settings.systemPrompt.planMode` — "Plan Mode Prompt" / "計劃模式提示詞"
- `settings.systemPrompt.planModeDesc` — "Additional instructions appended when in Plan mode." / "計劃模式啟用時附加的額外指令。"
- `settings.systemPrompt.planResetConfirm` — confirmation message for reset

#### Scenario: Settings displays Plan Mode section in zh-TW

- **WHEN** the app language is zh-TW
- **THEN** the Plan Mode Prompt section header SHALL display "計劃模式提示詞"
- **AND** the description SHALL display "計劃模式啟用時附加的額外指令。"

### Requirement: Plan artifact type i18n

The Artifacts Panel SHALL use an i18n key for the plan artifact type label.

Required i18n key:
- `artifacts.plan` — "Plan" / "計劃"

#### Scenario: Plan artifact label in zh-TW

- **WHEN** a plan artifact is active and app language is zh-TW
- **THEN** the type label SHALL display "計劃"
