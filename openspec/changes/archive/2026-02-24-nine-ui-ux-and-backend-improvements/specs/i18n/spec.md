## MODIFIED Requirements

### Requirement: 通用翻譯 key

翻譯檔案 SHALL 包含 `common.*` 命名空間，為跨元件共用的通用文字提供翻譯。

#### Scenario: common 命名空間完整性

- **WHEN** 任何使用 `common.*` 翻譯 key 的元件被渲染
- **THEN** 翻譯檔案 MUST 包含以下 key：
  - `common.close` — 關閉（en: "Close" / zh-TW: "關閉"）
  - `common.delete` — 刪除（en: "Delete" / zh-TW: "刪除"）
  - `common.cancel` — 取消（en: "Cancel" / zh-TW: "取消"）
  - `common.confirm` — 確認（en: "Confirm" / zh-TW: "確認"）
  - `common.processing` — 處理中（en: "Processing..." / zh-TW: "處理中..."）

#### Scenario: ConfirmDialog uses common.confirm

- **WHEN** ConfirmDialog is rendered without a custom `confirmLabel` prop
- **THEN** the confirm button MUST display the translated value of `common.confirm`
- **AND** in zh-TW locale the button MUST display "確認"
- **AND** in en locale the button MUST display "Confirm"

#### Scenario: ConfirmDialog uses common.processing when loading

- **WHEN** ConfirmDialog is rendered with `loading=true`
- **THEN** the confirm button MUST display the translated value of `common.processing`
- **AND** in zh-TW locale the button MUST display "處理中..."

#### Scenario: Destructive ConfirmDialog should pass confirmLabel

- **WHEN** a ConfirmDialog is used for deletion (e.g., delete conversation in TabBar)
- **THEN** the caller MUST pass `confirmLabel={t('common.delete')}` to show "刪除" instead of generic "確認"

## ADDED Requirements

### Requirement: Archived items conditional date display

OpenSpecArchived component SHALL conditionally render the date badge based on whether `archivedAt` data is available.

#### Scenario: Archived item with valid date

- **WHEN** an archived item has a valid `archivedAt` value
- **THEN** the date badge MUST be rendered showing the formatted date

#### Scenario: Archived item without date

- **WHEN** an archived item has `archivedAt` as `undefined`, `null`, or empty string
- **THEN** the date badge MUST NOT be rendered
- **AND** the item name MUST still be displayed normally
