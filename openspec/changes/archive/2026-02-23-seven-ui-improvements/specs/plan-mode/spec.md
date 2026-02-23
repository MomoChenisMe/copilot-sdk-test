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
