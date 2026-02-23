### Requirement: 設定面板 Tab 結構

設定面板 MUST 將 tab 分為 4 個邏輯群組：

| 群組 | 群組標籤 | 子項目 |
|------|----------|--------|
| 一般 | 一般 | general |
| 提示詞 | 提示詞 | system-prompt, profile, openspec |
| 記憶 | 記憶 | memory |
| 工具 | 工具 | skills, WebSearch (原 api-keys), mcp |

原「API 金鑰」tab MUST 重命名為「WebSearch」。

#### Scenario: 設定面板 Tab 分組顯示（桌面版）

- **WHEN** 使用者在桌面版開啟設定面板
- **THEN** 左側 sidebar MUST 顯示 4 個群組
- **AND** 每個群組 MUST 有灰色小標題（`text-xs uppercase text-text-muted tracking-wider`）
- **AND** 群組內子項目 MUST 縮排顯示（`px-6`）
- **AND** 活躍的子項目 MUST 以 accent 色高亮（`text-accent bg-accent-soft`）

#### Scenario: 設定面板 Tab 分組顯示（手機版）

- **WHEN** 使用者在手機版開啟設定面板
- **THEN** 頂部水平 tab 列 MUST 以 `|` 分隔符區分群組
- **AND** 所有子項目 MUST 可水平捲動選取

#### Scenario: WebSearch Tab 取代 API 金鑰

- **WHEN** 使用者在設定面板的工具群組中
- **THEN** MUST 看到「WebSearch」而非「API 金鑰」
- **AND** 功能內容不變（仍為 Brave Search API key 管理）

#### Scenario: OpenSpec Tab 內容

- **WHEN** 使用者點擊「OpenSpec」tab
- **THEN** 顯示 OpenSpec SDD 開關（toggle）；當開啟時，顯示 OPENSPEC_SDD.md 的 textarea 編輯器
- **THEN** 開關切換時自動啟用/停用所有 openspec-* 開頭的 skills

#### Scenario: 個人檔案 Tab 內容

- **WHEN** 使用者點擊「個人檔案」tab
- **THEN** 顯示完整的 PROFILE.md 編輯區域，包含身份、Agent 規則、偏好設定的合併內容

### Requirement: 記憶 Tab 簡化

記憶 Tab MUST 只包含：
- **自動記憶**：textarea 編輯器 + 自動提取開關
- **LLM Intelligence**：品質閘門、智慧提取、記憶壓縮三個功能的開關和模型選擇

記憶 Tab MUST NOT 包含「偏好設定」、「專案」、「解決方案」區段。

#### Scenario: 記憶 Tab 只顯示自動記憶和 LLM

- **WHEN** 使用者點擊「記憶」tab
- **THEN** 只看到自動記憶 textarea 和 LLM Intelligence 設定，不看到偏好/專案/解決方案

#### Scenario: 舊的專案和解決方案不再可見

- **WHEN** 使用者瀏覽記憶 Tab
- **THEN** 無法看到或操作專案 (projects) 和解決方案 (solutions) 的 CRUD 介面

### Requirement: Settings panel open animation
SettingsPanel 開啟時 SHALL 播放 fade + scale 進入動畫：opacity 從 0 到 1 + scale 從 0.95 到 1，持續 200ms，使用 ease-out timing function。

#### Scenario: 設定頁面開啟有動畫
- **WHEN** 使用者點擊設定按鈕開啟 SettingsPanel
- **THEN** 面板 MUST 播放 fadeScaleIn 動畫
- **THEN** 動畫 MUST 從 opacity: 0 + scale(0.95) 開始
- **THEN** 動畫 MUST 在 200ms 後到達 opacity: 1 + scale(1)
- **THEN** 動畫 MUST 使用 ease-out timing

#### Scenario: 動畫使用全域 CSS class
- **WHEN** SettingsPanel render
- **THEN** 容器 MUST 包含 `animate-fade-scale-in` CSS class
- **THEN** 動畫 keyframe MUST 定義在全域 CSS（globals.css）中

## REMOVED Requirements

### Requirement: Agent 規則 Tab
**Reason**: Agent 規則已合併至個人檔案中
**Migration**: 使用者的 Agent 規則內容自動遷移到 PROFILE.md 的 "## Agent 規則" 區段

### Requirement: 記憶偏好設定子區段
**Reason**: 偏好設定已合併至個人檔案中
**Migration**: 使用者的偏好設定內容自動遷移到 PROFILE.md 的 "## 偏好設定" 區段

### Requirement: 專案記憶管理
**Reason**: 簡化記憶系統，專注於自動記憶
**Migration**: 檔案實體保留在磁碟上（memory/projects/），僅移除 UI 和 API endpoints

### Requirement: 解決方案記憶管理
**Reason**: 簡化記憶系統，專注於自動記憶
**Migration**: 檔案實體保留在磁碟上（memory/solutions/），僅移除 UI 和 API endpoints

## Requirements

### Requirement: System prompt reset SHALL use ConfirmDialog

The SystemPromptTab's "Reset" action MUST use the shared `ConfirmDialog` component instead of native `window.confirm()`. The dialog MUST use destructive mode styling. The dialog MUST NOT require typed input confirmation (no `requiredInput` prop).

#### Scenario: Reset system prompt shows ConfirmDialog

- **WHEN** user clicks the "Reset" button in the System Prompt tab
- **THEN** a `ConfirmDialog` MUST appear with destructive styling
- **AND** the dialog title MUST convey that this action resets the system prompt to default
- **AND** the dialog description MUST warn that current content will be lost
- **AND** the dialog MUST have Confirm and Cancel buttons

#### Scenario: Confirming reset executes the reset

- **WHEN** user clicks Confirm in the reset system prompt ConfirmDialog
- **THEN** `promptsApi.resetSystemPrompt()` MUST be called
- **AND** the textarea content MUST be updated to the default system prompt
- **AND** the dialog MUST close

#### Scenario: Cancelling reset preserves current content

- **WHEN** user clicks Cancel or presses Escape in the reset system prompt ConfirmDialog
- **THEN** the system prompt content MUST NOT change
- **AND** the dialog MUST close

#### Scenario: Native window.confirm is not used

- **WHEN** user triggers system prompt reset from Settings
- **THEN** `window.confirm()` MUST NOT be called

<!-- @trace
source: eight-ui-consistency-openspec-sync
updated: 2026-02-23
code:
  - frontend/src/hooks/useTabCopilot.ts
  - backend/package.json
  - backend/src/openspec/openspec-routes.ts
  - frontend/src/lib/settings-api.ts
  - frontend/src/locales/en.json
  - frontend/src/components/copilot/ChatView.tsx
  - frontend/src/components/settings/SettingsPanel.tsx
  - frontend/src/components/layout/AppShell.tsx
  - frontend/src/components/openspec/OpenSpecHeader.tsx
  - frontend/src/components/layout/TopBar.tsx
  - backend/src/openspec/openspec-service.ts
  - backend/src/copilot/sdk-update.ts
  - backend/src/settings/settings-store.ts
  - frontend/src/lib/ws-client.ts
  - backend/src/index.ts
  - backend/src/openspec/openspec-watcher.ts
  - frontend/src/components/shared/ConfirmDialog.tsx
  - frontend/src/components/openspec/OpenSpecPanel.tsx
  - .docker-compose.yml.swp
  - backend/src/prompts/defaults.ts
  - frontend/src/components/copilot/DirectoryPicker.tsx
  - frontend/src/components/openspec/OpenSpecChangeDetail.tsx
  - frontend/src/store/index.ts
  - frontend/src/locales/zh-TW.json
  - frontend/src/components/openspec/OpenSpecOverview.tsx
  - frontend/src/lib/openspec-api.ts
  - backend/src/prompts/composer.ts
  - frontend/src/components/layout/TabBar.tsx
  - claude/.DS_Store
  - backend/src/ws/server.ts
tests:
  - frontend/tests/components/copilot/DirectoryPicker.test.tsx
  - frontend/tests/store/tabs.test.ts
  - backend/tests/prompts/composer.test.ts
  - frontend/tests/components/layout/TabBar.test.tsx
  - frontend/tests/components/openspec/OpenSpecChangeDetail.test.tsx
  - backend/tests/copilot/sdk-update.test.ts
  - frontend/tests/components/settings/SettingsPanel.test.tsx
-->