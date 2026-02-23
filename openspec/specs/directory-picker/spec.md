## MODIFIED Requirements

### Requirement: DirectoryPicker 響應式寬度

DirectoryPicker 的彈出面板 MUST 使用響應式最大寬度，確保在小螢幕上不溢出。
面板寬度 MUST 為 `min(320px, 100vw - 2rem)`。

#### Scenario: 桌面螢幕顯示

- **WHEN** 螢幕寬度 >= 375px
- **THEN** DirectoryPicker 面板寬度為 320px (w-80)

#### Scenario: 小螢幕顯示

- **WHEN** 螢幕寬度為 320px
- **THEN** DirectoryPicker 面板寬度為 320 - 32 = 288px，不溢出螢幕右邊

### Requirement: ConversationPopover 視窗邊界檢測

ConversationPopover（新增頁籤下拉選單）MUST 在定位時進行 viewport boundary 檢測。
若 popover 的 `left + width` 超過 `viewportWidth - 16px`，MUST 自動調整 left 值。
Popover MUST 加入 `max-width: calc(100vw - 2rem)` 限制。

#### Scenario: Popover 超出右邊界

- **WHEN** anchor 元素位於螢幕右側，使 popover 的計算位置超出 viewport 右邊
- **THEN** popover 的 left 被調整為 `viewportWidth - popoverWidth - 16px`

#### Scenario: Popover 正常顯示

- **WHEN** anchor 元素位於螢幕左側，popover 完全在 viewport 內
- **THEN** popover 正常定位於 anchor 下方

### Requirement: ModelSelector 下拉選單響應式

ModelSelector 的下拉選單 MUST 使用響應式最大寬度 `min(20rem, calc(100vw - 2rem))`。
最小寬度 MUST 為 `min-w-48`（從 min-w-64 縮減）。

#### Scenario: 手機螢幕

- **WHEN** 螢幕寬度為 375px
- **THEN** ModelSelector 下拉選單寬度不超過 375 - 32 = 343px

#### Scenario: 桌面螢幕

- **WHEN** 螢幕寬度 >= 768px
- **THEN** ModelSelector 下拉選單寬度最多 320px (20rem)

### Requirement: 目錄 API 支援回傳檔案清單

`GET /api/directories` 端點 SHALL 支援 `includeFiles` query parameter，啟用時在回應中額外回傳目錄下的檔案清單。

#### Scenario: includeFiles=true 回傳檔案

- **WHEN** 呼叫 `GET /api/directories?path=/some/dir&includeFiles=true`
- **THEN** 回應 MUST 包含 `files` 陣列
- **AND** 每個 file entry MUST 包含 `name`（檔名）、`path`（絕對路徑）、`size`（bytes）
- **AND** 原有的 `directories` 陣列行為 MUST 不變

#### Scenario: 預設不回傳檔案（向下相容）

- **WHEN** 呼叫 `GET /api/directories?path=/some/dir`（不帶 `includeFiles`）
- **THEN** 回應 MUST NOT 包含 `files` 欄位
- **AND** 行為 MUST 與修改前完全一致

#### Scenario: 過濾二進位檔案

- **WHEN** `includeFiles=true` 且目錄下存在二進位副檔名的檔案（如 `.png`, `.jpg`, `.gif`, `.mp4`, `.zip`, `.tar`, `.gz`, `.exe`, `.bin`, `.woff`, `.ttf`, `.ico`, `.so`, `.dylib`）
- **THEN** 回應的 `files` 陣列 MUST NOT 包含這些二進位檔案

#### Scenario: 過濾超大檔案

- **WHEN** `includeFiles=true` 且目錄下存在大小超過 1MB 的檔案
- **THEN** 回應的 `files` 陣列 MUST NOT 包含這些超大檔案

#### Scenario: showHidden 影響檔案

- **WHEN** `includeFiles=true` 且 `showHidden=false`
- **THEN** 以 `.` 開頭的隱藏檔案 MUST NOT 出現在 `files` 陣列中

#### Scenario: 檔案按名稱排序

- **WHEN** `includeFiles=true` 回傳檔案清單
- **THEN** `files` 陣列 MUST 按 `name` 字母升序排列

## Requirements

### Requirement: DirectoryPicker header path SHALL use shortenPath for display

The DirectoryPicker overlay's header path display MUST apply the `shortenPath()` utility function (exported from `CwdSelector.tsx`) to the `browsePath` before rendering, instead of displaying the raw full path with only CSS truncation. The `truncate` CSS class MUST be retained as a fallback safety net, but `shortenPath()` MUST be the primary mechanism for keeping the path readable.

#### Scenario: Long path is intelligently shortened in DirectoryPicker header

- **WHEN** the DirectoryPicker overlay is open
- **AND** the current browse path is `/Users/momochenisme/Documents/GitHub/copilot-sdk-test`
- **THEN** the header MUST display `~/…/GitHub/copilot-sdk-test` (using `shortenPath()` output)
- **AND** the header MUST NOT display the raw truncated path like `/Users/momochenisme/Documents/GitHub/c...`

#### Scenario: Short path is displayed as-is

- **WHEN** the DirectoryPicker overlay is open
- **AND** the current browse path is `/Users/momochenisme`
- **THEN** the header MUST display `~` (shortenPath replaces home dir with ~)
- **AND** no ellipsis shortening is applied since the path has ≤2 segments

#### Scenario: Root path is displayed correctly

- **WHEN** the DirectoryPicker overlay is open
- **AND** the current browse path is `/`
- **THEN** the header MUST display `/`

#### Scenario: CSS truncate class is retained as fallback

- **WHEN** the DirectoryPicker header path span is rendered
- **THEN** the span MUST still have the `truncate` CSS class
- **AND** `shortenPath()` MUST be applied to the text content before rendering

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