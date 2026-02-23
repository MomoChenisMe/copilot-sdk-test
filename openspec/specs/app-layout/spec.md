## ADDED Requirements

### Requirement: TopBar 按鈕 SHALL 顯示 Tooltip

TopBar 中所有圖示按鈕（Keyboard shortcuts、OpenSpec、Artifacts、Settings、Theme toggle）MUST 使用現有的 `Tooltip` 元件包裹，在使用者 hover 時顯示對應的 i18n 文字標籤。Tooltip 位置 MUST 為 `bottom`（因按鈕在畫面頂部）。ConnectionBadge 元件本身已有 tooltip 機制，不需額外包裹。

#### Scenario: 使用者 hover TopBar 按鈕時看到 tooltip
- **WHEN** 使用者將游標懸停在 TopBar 的任一圖示按鈕上超過 300ms
- **THEN** 按鈕下方顯示對應的文字標籤 tooltip（如「Settings」、「OpenSpec」）

#### Scenario: ConnectionBadge 不重複包裹 tooltip
- **WHEN** 使用者將游標懸停在 ConnectionBadge 上
- **THEN** 顯示 ConnectionBadge 自身的 tooltip，不出現重複的 tooltip

### Requirement: TopBar SHALL 包含 Artifacts 側邊欄按鈕

TopBar 右側按鈕群組 MUST 包含一個 Artifacts 按鈕，使用 `PanelRight` icon（lucide-react）。按鈕 MUST 放在 OpenSpec 按鈕和 Settings 按鈕之間。點擊按鈕 MUST toggle ArtifactsPanel 的開關狀態。

#### Scenario: 點擊按鈕開啟 ArtifactsPanel
- **WHEN** 使用者點擊 TopBar 的 Artifacts 按鈕且 ArtifactsPanel 目前關閉
- **THEN** ArtifactsPanel 開啟，OpenSpec panel 自動關閉（互斥邏輯）

#### Scenario: 點擊按鈕關閉 ArtifactsPanel
- **WHEN** 使用者點擊 TopBar 的 Artifacts 按鈕且 ArtifactsPanel 目前開啟
- **THEN** ArtifactsPanel 關閉

#### Scenario: 無 active tab 時不顯示按鈕
- **WHEN** 目前沒有 active tab（例如 welcome 畫面）
- **THEN** Artifacts 按鈕不渲染

### Requirement: Artifacts 按鈕 SHALL 顯示數量徽章

當 active tab 有 artifact 時，Artifacts 按鈕 MUST 在右上角顯示數量徽章。數量超過 9 時 MUST 顯示 `9+`。數量為 0 時 MUST 不顯示徽章。

#### Scenario: 有 3 個 artifacts 時顯示數字 3
- **WHEN** active tab 有 3 個 artifacts
- **THEN** Artifacts 按鈕右上角顯示圓形徽章，內容為 `3`

#### Scenario: 有 15 個 artifacts 時顯示 9+
- **WHEN** active tab 有 15 個 artifacts
- **THEN** 徽章顯示 `9+`

#### Scenario: 無 artifact 時不顯示徽章
- **WHEN** active tab 有 0 個 artifacts
- **THEN** 不顯示任何徽章

## Requirements

### Requirement: TopBar OpenSpec button SHALL reactively bind to global store

The TopBar OpenSpec button visibility MUST be determined by a Zustand selector subscribing to `settings.openspecEnabled`, NOT by a non-reactive `getState()` call at render time. When `settings.openspecEnabled` changes in the global store, the TopBar MUST re-render and show or hide the OpenSpec button immediately without requiring a page reload or tab switch.

#### Scenario: OpenSpec disabled in settings hides TopBar button immediately

- **WHEN** user toggles OpenSpec SDD to disabled in Settings panel
- **THEN** the TopBar OpenSpec button (BookOpen icon) MUST disappear immediately
- **AND** the button MUST NOT require a tab switch or page reload to update

#### Scenario: OpenSpec enabled in settings shows TopBar button immediately

- **WHEN** user toggles OpenSpec SDD to enabled in Settings panel
- **THEN** the TopBar OpenSpec button (BookOpen icon) MUST appear immediately
- **AND** the button MUST NOT require a tab switch or page reload to update

#### Scenario: AppShell uses Zustand selector for openspecEnabled

- **WHEN** AppShell renders the TopBar component
- **THEN** the `onOpenSpecClick` prop MUST be derived from a Zustand selector (`useAppStore((s) => s.settings?.openspecEnabled)`)
- **AND** it MUST NOT use `useAppStore.getState().settings` directly in JSX


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

---
### Requirement: TopBar SHALL reflect OpenSpec folder status in real-time via event listener

AppShell MUST listen to the `openspec:changed` CustomEvent on the `window` object to detect OpenSpec folder creation or deletion. When the event fires, AppShell MUST re-check the OpenSpec folder existence by calling `openspecApi.getOverview()` and update the `openSpecActive` state accordingly. The listener MUST use a 300ms debounce to avoid excessive API calls.

#### Scenario: Deleting OpenSpec folder removes blue indicator dot immediately

- **WHEN** user deletes the OpenSpec folder (via OpenSpec panel or externally)
- **AND** the WebSocket broadcasts `openspec:changed` event
- **THEN** the TopBar OpenSpec button's blue indicator dot MUST disappear within 500ms
- **AND** the update MUST NOT require switching tabs or reloading

#### Scenario: Initializing OpenSpec folder shows blue indicator dot immediately

- **WHEN** user initializes OpenSpec (via `openspec init` or OpenSpec panel)
- **AND** the WebSocket broadcasts `openspec:changed` event
- **THEN** the TopBar OpenSpec button's blue indicator dot MUST appear within 500ms

#### Scenario: Rapid successive changes are debounced

- **WHEN** multiple `openspec:changed` events fire within 300ms
- **THEN** AppShell MUST only make one `getOverview()` API call after the debounce period


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

---
### Requirement: TabBar conversation deletion SHALL use ConfirmDialog

The TabBar context menu's "Delete conversation" action MUST use the shared `ConfirmDialog` component instead of native `window.confirm()`. The dialog MUST use destructive mode styling. The dialog MUST NOT require typed input confirmation (no `requiredInput` prop).

#### Scenario: Delete conversation shows ConfirmDialog

- **WHEN** user right-clicks a tab and selects "Delete conversation"
- **THEN** a `ConfirmDialog` MUST appear with destructive styling
- **AND** the dialog title MUST be the i18n translation of delete confirmation
- **AND** the dialog MUST have Confirm and Cancel buttons

#### Scenario: Confirming deletion executes the delete

- **WHEN** user clicks Confirm in the delete conversation ConfirmDialog
- **THEN** the conversation MUST be deleted
- **AND** the dialog MUST close

#### Scenario: Cancelling deletion preserves the conversation

- **WHEN** user clicks Cancel or presses Escape in the delete conversation ConfirmDialog
- **THEN** the conversation MUST NOT be deleted
- **AND** the dialog MUST close

#### Scenario: Native window.confirm is not used

- **WHEN** user triggers conversation deletion from TabBar
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